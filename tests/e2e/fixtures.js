/**
 * Playwright fixtures for m-chart E2E tests.
 *
 * Re-exports `test` and `expect` from `@wordpress/e2e-test-utils-playwright`
 * with additional fixtures for chart creation, navigation to the edit screen,
 * and Jspreadsheet cell-editor manipulation. Creation uses wp-env's tests-cli
 * container rather than REST — the m-chart REST response shape has quirks
 * around excerpt generation, and wp-cli sidesteps needing REST meta support.
 *
 * Usage:
 *   import { test, expect } from './fixtures';
 *
 *   test( 'something', async ( { page, chartFactory } ) => {
 *       const chart = await chartFactory( {
 *           title: 'My Chart',
 *           meta:  { type: 'line', data: { sets: [...] } },
 *       } );
 *       await page.goto( `/?p=${ chart.id }` );
 *   } );
 */
const { test: baseTest, expect } = require( '@wordpress/e2e-test-utils-playwright' );
const { execFileSync } = require( 'child_process' );
const crypto = require( 'crypto' );
const fs = require( 'fs' );
const os = require( 'os' );
const path = require( 'path' );

// Cross-process mutex for wp-env CLI calls — see wpCli() below
const WP_ENV_LOCK_DIR = path.join( os.tmpdir(), 'm-chart-wp-env-cli.lock' );
const LOCK_TIMEOUT_MS = 120000;
const LOCK_STALE_MS   = 60000;

/**
 * Synchronous sleep that doesn't spin the CPU
 *
 * @param {number} ms milliseconds to sleep
 */
function sleepSync( ms ) {
	Atomics.wait( new Int32Array( new SharedArrayBuffer( 4 ) ), 0, 0, ms );
}

/**
 * Acquire the wp-env CLI lock (mkdir is atomic across processes).
 * Locks older than LOCK_STALE_MS are treated as leftovers from a crashed
 * worker and cleared.
 */
function acquireWpEnvLock() {
	const deadline = Date.now() + LOCK_TIMEOUT_MS;

	for ( ;; ) {
		try {
			fs.mkdirSync( WP_ENV_LOCK_DIR );
			return;
		} catch {
			if ( Date.now() > deadline ) {
				throw new Error( 'Timed out waiting for the wp-env CLI lock' );
			}

			try {
				if ( Date.now() - fs.statSync( WP_ENV_LOCK_DIR ).mtimeMs > LOCK_STALE_MS ) {
					fs.rmdirSync( WP_ENV_LOCK_DIR );
					continue;
				}
			} catch {
				// Lock vanished between checks — retry immediately
				continue;
			}

			sleepSync( 100 + Math.floor( 150 * Math.random() ) );
		}
	}
}

function releaseWpEnvLock() {
	try {
		fs.rmdirSync( WP_ENV_LOCK_DIR );
	} catch {
		// already gone
	}
}

/**
 * Run a wp-cli command in the wp-env tests container.
 *
 * Takes an argv ARRAY rather than a shell string — execFileSync passes each
 * element through as-is, so titles and JSON payloads never need shell quoting
 * (and can't break out of it). Works the same on macOS, Linux, and Windows.
 *
 * Calls are serialized across Playwright workers via a tmpdir lock: every
 * `wp-env run` rewrites wp-env's config cache, so concurrent invocations from
 * parallel workers corrupt each other and fail with a spurious
 * "Environment not initialized" error.
 *
 * @param {string[]} args wp-cli arguments, e.g. [ 'post', 'create', '--porcelain' ]
 * @return {string} Trimmed wp-cli stdout with wp-env's banner lines stripped
 */
function wpCli( args ) {
	acquireWpEnvLock();

	let raw;

	try {
		raw = execFileSync(
			'npx',
			[ 'wp-env', 'run', 'tests-cli', 'wp', ...args ],
			{ encoding: 'utf-8', stdio: [ 'ignore', 'pipe', 'pipe' ] }
		);
	} finally {
		releaseWpEnvLock();
	}

	// wp-env prepends/appends its own banner lines ("ℹ Starting ...",
	// "✔ Ran ..."). Strip by their marker glyphs so wp-cli output that merely
	// contains the word "Starting" survives.
	return raw
		.split( '\n' )
		.filter( line => ! /^[ℹ✔✖⚠]/.test( line.trim() ) )
		.join( '\n' )
		.trim();
}

const test = baseTest.extend( {
	chartFactory: async ( {}, use ) => {
		const created = [];

		const factory = async ( overrides = {} ) => {
			const { title = 'Test chart', meta = {}, status = 'publish' } = overrides;

			// Create the post via WP-CLI
			const idStr = wpCli( [
				'post', 'create',
				'--post_type=m-chart',
				`--post_status=${ status }`,
				`--post_title=${ title }`,
				'--porcelain',
			] );
			const id = parseInt( idStr, 10 );

			// Set m-chart meta with a sane default merged with overrides
			const fullMeta = {
				library:  'chartjs',
				type:     'line',
				parse_in: 'rows',
				theme:    '_default',
				data:     { sets: [ [ [ '', 'Series' ], [ 'A', 1 ], [ 'B', 2 ] ] ] },
				set_names: [ 'Sheet 1' ],
				height:   400,
				...meta,
			};

			// WP-CLI accepts --format=json for serialized meta values
			// The argv-array wpCli means the JSON needs no shell escaping
			wpCli( [
				'post', 'meta', 'update', String( id ), 'm-chart',
				JSON.stringify( fullMeta ),
				'--format=json',
			] );

			created.push( id );

			return { id, title };
		};

		await use( factory );

		// Cleanup created charts
		for ( const id of created ) {
			try {
				wpCli( [ 'post', 'delete', String( id ), '--force' ] );
			} catch {
				// best effort cleanup
			}
		}
	},

	/**
	 * Navigates to the edit screen for a chart and waits for the React mounts
	 * Yields { postId, awaitMounts() } — awaitMounts resolves once the
	 * subtitle, spreadsheet, and chart roots have all received React children
	 * and the first chart refresh has completed (data-image-capture-state="ready")
	 *
	 * @param {Object}   fixtures              Playwright fixture bag
	 * @param {Object}   fixtures.page         Playwright page object
	 * @param {Object}   fixtures.admin        WP admin helper from @wordpress/e2e-test-utils-playwright
	 * @param {Function} fixtures.chartFactory The chartFactory fixture defined above
	 * @param {Function} use                   Playwright fixture-use callback
	 */
	chartEditPage: async ( { page, admin, chartFactory }, use ) => {
		const helper = {
			postId: null,
			async open( overrides = {} ) {
				const chart = await chartFactory( overrides );
				this.postId = chart.id;
				await admin.visitAdminPage( 'post.php', `post=${ chart.id }&action=edit` );
				await this.awaitMounts();
				return this;
			},
			async awaitMounts() {
				await page.waitForSelector( '#m-chart-spreadsheet-root > *', { state: 'attached' } );
				await page.waitForSelector( '#m-chart-chart-root > *', { state: 'attached' } );
				// Wait for the spreadsheet div to render with its data-submit-state attribute
				await page.waitForSelector( '#spreadsheets[data-submit-state]', { state: 'attached' } );
				// Wait for the first chart render to finish (image capture or skip)
				await page.waitForSelector(
					'.m-chart-container[data-image-capture-state="ready"]',
					{ state: 'attached', timeout: 15000 }
				);
			},
		};

		await use( helper );
	},

	/**
	 * Opens a Jspreadsheet cell editor at (row, col) and types the value WITHOUT
	 * committing — no Enter / Tab / blur. Returns the active editor input Locator
	 * so the test can verify edit-mode is still open before clicking Save.
	 *
	 * Uses Jspreadsheet v5's worksheet.openEditor(x, y) via page.evaluate, which
	 * triggers the same edit-mode the user would see from a double-click. The
	 * input is then filled via Locator.fill() so .value mutates without firing
	 * the commit-on-Enter path.
	 *
	 * Row/col are 0-indexed and refer to Jspreadsheet's data coordinates (not
	 * DOM row indices, which include a header row).
	 *
	 * @param {Object}   fixtures      Playwright fixture bag
	 * @param {Object}   fixtures.page Playwright page object
	 * @param {Function} use           Playwright fixture-use callback
	 */
	cellEditor: async ( { page }, use ) => {
		const helper = {
			async editCell( row, col, value ) {
				// Jspreadsheet CE v5 exposes its API directly on the `.jss_container`
				// element via the `.jspreadsheet` property. Methods like openEditor,
				// getCellFromCoords are on the handle itself (not on a worksheets[N]
				// sub-object as some docs suggest). API coords are (x=col, y=row).
				const opened = await page.evaluate( ( { x, y } ) => {
					const container = document.querySelector( '#spreadsheets .jss_container' );
					if ( ! container || ! container.jspreadsheet ) {
						return { ok: false, why: 'no jspreadsheet handle' };
					}
					try {
						const cell = container.jspreadsheet.getCellFromCoords( x, y );
						if ( ! cell ) {
							return { ok: false, why: `getCellFromCoords(${ x },${ y }) returned null` };
						}
						container.jspreadsheet.openEditor( cell );
						return { ok: true };
					} catch ( e ) {
						return { ok: false, why: String( e ) };
					}
				}, { x: col, y: row } );

				if ( ! opened.ok ) {
					throw new Error( `cellEditor.editCell: failed to open editor at (row=${ row }, col=${ col }): ${ opened.why }` );
				}

				// Jspreadsheet v5 inserts the editor inline inside the target <td>
				// The cell gains the .editor class and contains an <input> or <textarea>
				// while edit mode is active. Locate that inner editable element.
				const editor = page.locator( '#spreadsheets .jss_container td.editor input, #spreadsheets .jss_container td.editor textarea' ).first();
				await editor.waitFor( { state: 'visible', timeout: 5000 } );

				// .fill() sets .value and dispatches input event without committing
				// Crucially does NOT press Enter, Tab, or trigger blur
				await editor.fill( String( value ) );

				return editor;
			},
		};

		await use( helper );
	},
} );

/**
 * Reads the hidden #m-chart-img textarea and returns the base64 value plus
 * a short SHA-256 hash for inequality assertions across save cycles.
 *
 * @param {Object} page Playwright page object
 * @return {Promise<{ value: string, hash: string }>} The textarea value and a short SHA-256 hash
 */
async function getChartImageTextarea( page ) {
	const value = await page.evaluate( () => {
		const el = document.getElementById( 'm-chart-img' );
		return el ? el.value : '';
	} );

	const hash = value
		? crypto.createHash( 'sha256' ).update( value ).digest( 'hex' ).slice( 0, 16 )
		: '';

	return { value, hash };
}

/**
 * Reads a chart post's m-chart meta back via WP-CLI after a save round-trip
 * Used as the persistence cross-check (post_meta contains the typed value)
 *
 * @param {number} postId
 * @return {Promise<Object>} parsed meta object
 */
async function getSavedPostMeta( postId ) {
	const raw = wpCli( [ 'post', 'meta', 'get', String( postId ), 'm-chart', '--format=json' ] );
	if ( ! raw ) {
		return {};
	}
	try {
		return JSON.parse( raw );
	} catch {
		return {};
	}
}

module.exports = { test, expect, getChartImageTextarea, getSavedPostMeta };
