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
const { BASE_URL, roleStatePath } = require( './global-setup' );
const fs = require( 'fs' );
const os = require( 'os' );
const path = require( 'path' );

// Cross-process mutex for wp-env CLI calls — see wpCli() below
const WP_ENV_LOCK_DIR = path.join( os.tmpdir(), 'm-chart-wp-env-cli.lock' );
// A single wp-cli call takes a second or two
// A lock older than LOCK_STALE_MS can only be a leftover from a worker that died holding it
// Giving up at LOCK_TIMEOUT_MS, inside the 60s test timeout, means a stuck queue fails with this file's own message
const LOCK_TIMEOUT_MS = 45000;
const LOCK_STALE_MS   = 30000;

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

/**
 * Registers a document-level listener (before any page script runs) that
 * flips a flag when the helper dispatches m_chart.render_done on the canvas.
 * Waiting on this instead of a fixed sleep is deterministic: once the chart
 * has rendered, any inline script smuggled through the pipeline would have
 * executed too.
 *
 * Call it before the navigation that loads the chart
 *
 * @param {Object} page Playwright page
 */
async function trackChartRender( page ) {
	await page.addInitScript( () => {
		window.__mchartRenderDone = false;
		document.addEventListener(
			'm_chart.render_done',
			() => { window.__mchartRenderDone = true; },
			true
		);
	} );
}

/**
 * Waits for the chart to be present and fully rendered.
 *
 * @param {Object} page Playwright page
 */
async function expectChartRendered( page ) {
	const container = page.locator( '.m-chart-container' ).first();

	await expect( container ).toBeVisible();

	// Deferred rendering waits for the container to enter the viewport
	await container.scrollIntoViewIfNeeded();
	await page.waitForFunction( () => true === window.__mchartRenderDone );
}

/**
 * Collects everything that would mean a script ran or broke on the page: dialogs, uncaught errors and console errors
 *
 * @param {Object} page Playwright page
 * @return {{ dialogs: string[], errors: string[], leaveWarnings: number }} live values, read them after the page has done its work
 */
function watchPage( page ) {
	const seen = { dialogs: [], errors: [], leaveWarnings: 0 };

	page.on( 'dialog', ( dialog ) => {
		// The browser's "Leave site?" prompt is not a script running, but it is counted:
		// a save that raises it has left WordPress thinking the post is still unsaved
		if ( 'beforeunload' === dialog.type() ) {
			seen.leaveWarnings++;
			dialog.accept();
			return;
		}

		seen.dialogs.push( dialog.message() );
		dialog.dismiss();
	} );

	page.on( 'pageerror', ( error ) => seen.errors.push( String( error ) ) );

	page.on( 'console', ( message ) => {
		if ( 'error' === message.type() ) {
			seen.errors.push( message.text() );
		}
	} );

	return seen;
}

const test = baseTest.extend( {
	chartFactory: async ( { requestUtils }, use ) => {
		const created = [];

		const factory = async ( overrides = {} ) => {
			const { title = 'Test chart', meta = {}, status = 'publish' } = overrides;

			// A sane default merged with overrides
			// This writes the meta row directly, it does not go through the plugin's save, so text fields
			// (subtitle, axis titles, source) have to be given the way a save stores them: HTML-encoded
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

			// One wp-cli call makes the post and its meta, the calls are the slow part of a test
			// The argv-array wpCli means the JSON needs no shell escaping
			const idStr = wpCli( [
				'post', 'create',
				'--post_type=m-chart',
				`--post_status=${ status }`,
				`--post_title=${ title }`,
				`--meta_input=${ JSON.stringify( { 'm-chart': fullMeta } ) }`,
				'--porcelain',
			] );

			const id = parseInt( idStr, 10 );

			if ( ! id ) {
				throw new Error( `chartFactory: wp post create did not return an id (got "${ idStr }")` );
			}

			created.push( id );

			return { id, title };
		};

		await use( factory );

		// Cleanup over REST, which needs no wp-cli call and so no turn in the queue
		for ( const id of created ) {
			try {
				await requestUtils.rest( { method: 'DELETE', path: `/wp/v2/m-chart/${ id }`, params: { force: true } } );
			} catch {
				// best effort cleanup
			}
		}
	},

	/**
	 * Creates ordinary posts (to carry a shortcode or a block) and deletes them afterwards
	 * requestUtils.createPost on its own leaves every post behind in the tests database
	 *
	 * @param {Object}   fixtures              Playwright fixture bag
	 * @param {Object}   fixtures.requestUtils REST helper from @wordpress/e2e-test-utils-playwright
	 * @param {Function} use                   Playwright fixture-use callback
	 */
	postFactory: async ( { requestUtils }, use ) => {
		const created = [];

		const factory = async ( post = {} ) => {
			const result = await requestUtils.createPost( { status: 'publish', title: 'Test post', ...post } );

			created.push( result.id );

			return result;
		};

		await use( factory );

		for ( const id of created ) {
			try {
				await requestUtils.rest( { method: 'DELETE', path: `/wp/v2/posts/${ id }`, params: { force: true } } );
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
				await awaitChartEditor( page );
			},
		};

		await use( helper );
	},

	/**
	 * A page signed in as a Contributor, in its own browser context so the admin session of `page` is untouched
	 * The user and its signed-in state are made once in global-setup.js
	 *
	 * @param {Object}   fixtures         Playwright fixture bag
	 * @param {Object}   fixtures.browser Playwright browser
	 * @param {Function} use              Playwright fixture-use callback
	 */
	contributorPage: async ( { browser }, use ) => {
		const context = await browser.newContext( { baseURL: BASE_URL, storageState: roleStatePath( 'contributor' ) } );

		await use( await context.newPage() );
		await context.close();
	},

	/**
	 * A page signed in as an Editor, see contributorPage
	 *
	 * @param {Object}   fixtures         Playwright fixture bag
	 * @param {Object}   fixtures.browser Playwright browser
	 * @param {Function} use              Playwright fixture-use callback
	 */
	editorPage: async ( { browser }, use ) => {
		const context = await browser.newContext( { baseURL: BASE_URL, storageState: roleStatePath( 'editor' ) } );

		await use( await context.newPage() );
		await context.close();
	},

	/**
	 * Deletes things a test made through the UI, which the factories know nothing about
	 * Call cleanup.chart( id ) or cleanup.post( id ) as soon as the id is known
	 *
	 * @param {Object}   fixtures              Playwright fixture bag
	 * @param {Object}   fixtures.requestUtils REST helper from @wordpress/e2e-test-utils-playwright
	 * @param {Function} use                   Playwright fixture-use callback
	 */
	cleanup: async ( { requestUtils }, use ) => {
		const paths = [];

		await use( {
			chart: ( id ) => paths.push( `/wp/v2/m-chart/${ id }` ),
			post:  ( id ) => paths.push( `/wp/v2/posts/${ id }` ),
		} );

		for ( const restPath of paths ) {
			try {
				await requestUtils.rest( { method: 'DELETE', path: restPath, params: { force: true } } );
			} catch {
				// best effort cleanup
			}
		}
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
 * Creates several charts with one wp-cli call, for a test that needs many
 * chartFactory costs a call per chart and the calls queue across workers
 *
 * The caller deletes them, the ids are plain posts of type m-chart
 *
 * @param {Array<{ title: string, meta: Object, status?: string }>} charts
 * @return {number[]} post ids, in the order given
 */
function createCharts( charts ) {
	// Base64 so the JSON survives being passed as PHP source
	const payload = Buffer.from( JSON.stringify( charts ) ).toString( 'base64' );

	const code = `
		$ids = [];

		foreach ( json_decode( base64_decode( '${ payload }' ), true ) as $chart ) {
			$ids[] = wp_insert_post( [
				'post_type'   => 'm-chart',
				'post_status' => $chart['status'] ?? 'publish',
				'post_title'  => $chart['title'],
				'meta_input'  => [ 'm-chart' => $chart['meta'] ],
			] );
		}

		echo wp_json_encode( $ids );
	`;

	return JSON.parse( wpCli( [ 'eval', code ] ) );
}

/**
 * Waits until the chart editor on a page is ready to be used: the React apps have mounted
 * and the first preview has rendered and been captured
 *
 * @param {Object} page Playwright page on post.php or post-new.php for a chart
 */
async function awaitChartEditor( page ) {
	await page.waitForSelector( '#m-chart-spreadsheet-root > *', { state: 'attached' } );
	await page.waitForSelector( '#m-chart-chart-root > *', { state: 'attached' } );
	await page.waitForSelector( '#spreadsheets[data-submit-state]', { state: 'attached' } );
	await page.waitForSelector( '.m-chart-container[data-image-capture-state="ready"]', { state: 'attached', timeout: 15000 } );
}

/**
 * Types a value into a spreadsheet cell the way a person does: open the cell, type, press Enter
 *
 * Row and column are 0-indexed data coordinates, the same as cellEditor.editCell
 *
 * @param {Object} page  Playwright page showing the chart editor
 * @param {number} row
 * @param {number} col
 * @param {string} value
 */
async function typeIntoCell( page, row, col, value ) {
	const cell = page.locator( `#spreadsheets .jss_container:visible td[data-x="${ col }"][data-y="${ row }"]` ).first();

	// Double click opens the cell for editing, the same as it does for a person
	await cell.dblclick();

	const editor = page.locator( '#spreadsheets .jss_container td.editor input, #spreadsheets .jss_container td.editor textarea' ).first();

	await editor.waitFor( { state: 'visible', timeout: 5000 } );
	await editor.fill( String( value ) );
	await editor.press( 'Enter' );

	// The cell has to hold what was typed before the test moves on, a lost edit should fail here and not three steps later
	await expect.poll( () => page.evaluate( ( { x, y } ) => {
		const containers = Array.from( document.querySelectorAll( '#spreadsheets .jss_container' ) );
		const visible    = containers.find( ( container ) => null !== container.offsetParent ) || containers[ 0 ];

		return String( visible.jspreadsheet.getValueFromCoords( x, y ) ?? '' );
	}, { x: col, y: row } ), { message: `cell (row ${ row }, column ${ col }) did not keep what was typed` } ).toBe( String( value ) );
}

/**
 * Drops the empty rows and columns after the last cell that holds something
 *
 * The editor saves and exports its whole grid, padding included, so a sheet read back from a chart
 * that was saved through the editor has to be trimmed before it can be compared with what was typed
 *
 * @param {Array<Array>} rows a sheet
 * @return {string[][]} the same cells as strings, without the padding
 */
function trimSheet( rows ) {
	const cells   = rows.map( ( row ) => row.map( ( cell ) => String( cell ?? '' ) ) );
	const lastRow = cells.reduce( ( last, row, index ) => ( row.some( ( cell ) => '' !== cell ) ? index : last ), -1 );
	const lastCol = cells.reduce( ( last, row ) => Math.max( last, row.reduce( ( inner, cell, index ) => ( '' !== cell ? index : inner ), -1 ) ), -1 );

	return cells.slice( 0, lastRow + 1 ).map( ( row ) => row.slice( 0, lastCol + 1 ) );
}

/**
 * Reads the active sheet's cells as the spreadsheet holds them, trimmed to the rows and columns that have something in them
 *
 * @param {Object} page Playwright page showing the chart editor
 * @return {Promise<string[][]>} rows of cell text
 */
async function readSheet( page ) {
	return page.evaluate( () => {
		const containers = Array.from( document.querySelectorAll( '#spreadsheets .jss_container' ) );
		const visible    = containers.find( ( container ) => null !== container.offsetParent ) || containers[ 0 ];
		const rows       = visible.jspreadsheet.getData().map( ( row ) => row.map( ( cell ) => String( cell ?? '' ) ) );
		const lastRow    = rows.reduce( ( last, row, index ) => ( row.some( ( cell ) => '' !== cell ) ? index : last ), -1 );
		const lastCol    = rows.reduce( ( last, row ) => Math.max( last, row.reduce( ( inner, cell, index ) => ( '' !== cell ? index : inner ), -1 ) ), -1 );

		return rows.slice( 0, lastRow + 1 ).map( ( row ) => row.slice( 0, lastCol + 1 ) );
	} );
}

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

module.exports = { test, expect, wpCli, createCharts, trackChartRender, expectChartRendered, watchPage, awaitChartEditor, typeIntoCell, readSheet, trimSheet, getChartImageTextarea, getSavedPostMeta };
