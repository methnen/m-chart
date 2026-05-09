/**
 * Playwright fixtures for m-chart E2E tests.
 *
 * Re-exports `test` and `expect` from `@wordpress/e2e-test-utils-playwright`
 * with an additional `chartFactory` fixture that creates m-chart posts via
 * wp-env's tests-cli container (bypasses REST). REST creation triggers the
 * the_content filter chain which currently mis-renders for m-chart posts —
 * a separate plugin bug being tracked outside this test infrastructure.
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
const { execSync } = require( 'child_process' );

function wpCli( args ) {
	const raw = execSync(
		`npx wp-env run tests-cli wp ${ args }`,
		{ encoding: 'utf-8', stdio: [ 'ignore', 'pipe', 'pipe' ] }
	);

	// wp-env prepends/appends banner lines like "ℹ Starting ..." and
	// "✔ Ran ..." on its own. Strip them so callers get just the wp-cli output.
	return raw
		.split( '\n' )
		.filter( line =>
			! line.includes( 'Starting' ) &&
			! line.includes( '✔ Ran' ) &&
			! line.includes( 'ℹ' )
		)
		.join( '\n' )
		.trim();
}

const test = baseTest.extend( {
	chartFactory: async ( {}, use ) => {
		const created = [];

		const factory = async ( overrides = {} ) => {
			const { title = 'Test chart', meta = {}, status = 'publish' } = overrides;

			// Create the post via WP-CLI
			const idStr = wpCli(
				`post create --post_type=m-chart --post_status=${ status } ` +
				`--post_title='${ title.replace( /'/g, "'\\''" ) }' --porcelain`
			);
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
			const metaJson = JSON.stringify( fullMeta ).replace( /'/g, "'\\''" );
			wpCli(
				`post meta update ${ id } m-chart '${ metaJson }' --format=json`
			);

			created.push( id );

			return { id, title };
		};

		await use( factory );

		// Cleanup created charts
		for ( const id of created ) {
			try {
				wpCli( `post delete ${ id } --force` );
			} catch ( e ) {
				// best effort cleanup
			}
		}
	},
} );

module.exports = { test, expect };
