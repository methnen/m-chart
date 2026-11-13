/**
 * Every chart type draws in a real browser
 *
 * The unit tests check the arguments each type is given, nothing but a browser checks that Chart.js and the
 * type's plugin (treemap, venn, boxplot and so on) accept them and paint without throwing
 * Uses the same example charts that ship as the importable examples, one per type
 */

const fs   = require( 'fs' );
const path = require( 'path' );
const { test, expect, createCharts, watchPage } = require( './fixtures' );

const FIXTURES = path.join( __dirname, '..', 'fixtures', 'charts' );

const EXAMPLES = fs.readdirSync( FIXTURES )
	.filter( ( file ) => /^pickle-.*\.json$/.test( file ) )
	.map( ( file ) => JSON.parse( fs.readFileSync( path.join( FIXTURES, file ), 'utf8' ) ) );

test.describe( 'Chart types', () => {
	test( 'there is an example for every type the plugin offers', async ( { page, admin } ) => {
		await admin.visitAdminPage( 'post-new.php', 'post_type=m-chart' );

		const options = page.locator( '[name="m-chart[type]"] option' );

		// The editor draws the list once it has mounted, reading it any sooner finds nothing
		await expect( options.first() ).toBeAttached();

		const offered = await options.evaluateAll( ( all ) => all.map( ( option ) => option.value ) );

		// A type added to the plugin without an example would otherwise never be drawn by this spec
		expect( EXAMPLES.map( ( example ) => example.type ).sort() ).toEqual( offered.sort() );
	} );

	test( 'every type draws without an error', async ( { page, requestUtils } ) => {
		// One navigation per type, the default 60s is cut fine on a slow runner
		test.slow();

		const ids = createCharts( EXAMPLES.map( ( meta ) => ( { title: `Type ${ meta.type }`, meta } ) ) );

		try {
			for ( const [ index, example ] of EXAMPLES.entries() ) {
				await test.step( example.type, async () => {
					const seen = watchPage( page );

					await page.addInitScript( () => {
						window.__mchartRenderDone = false;
						document.addEventListener( 'm_chart.render_done', () => { window.__mchartRenderDone = true; }, true );
					} );

					// A chart's own page shows the chart
					await page.goto( `/?post_type=m-chart&p=${ ids[ index ] }` );

					const container = page.locator( '.m-chart-container' ).first();

					await expect.soft( container, `${ example.type }: the chart container` ).toBeVisible();
					await container.scrollIntoViewIfNeeded();
					await page.waitForFunction( () => true === window.__mchartRenderDone, null, { timeout: 15000 } ).catch( () => {} );

					const drawn = await page.evaluate( () => {
						const canvas = document.querySelector( 'canvas.m-chart' );
						const chart  = canvas && window.Chart.getChart( canvas );

						if ( ! chart ) {
							return null;
						}

						// Has anything actually been painted
						const pixels = canvas.getContext( '2d' ).getImageData( 0, 0, canvas.width, canvas.height ).data;
						let painted  = false;

						for ( let i = 3; i < pixels.length; i += 4 ) {
							if ( 0 !== pixels[ i ] ) {
								painted = true;
								break;
							}
						}

						return { datasets: chart.data.datasets.length, painted, done: true === window.__mchartRenderDone };
					} );

					expect.soft( drawn, `${ example.type }: a Chart.js chart on the canvas` ).not.toBeNull();
					expect.soft( drawn?.done, `${ example.type }: finished rendering` ).toBe( true );
					expect.soft( drawn?.datasets, `${ example.type }: datasets` ).toBeGreaterThan( 0 );
					expect.soft( drawn?.painted, `${ example.type }: something painted` ).toBe( true );
					expect.soft( seen.errors, `${ example.type }: page errors` ).toEqual( [] );

					page.removeAllListeners( 'dialog' );
					page.removeAllListeners( 'pageerror' );
					page.removeAllListeners( 'console' );
				} );
			}
		} finally {
			for ( const id of ids ) {
				await requestUtils.rest( { method: 'DELETE', path: `/wp/v2/m-chart/${ id }`, params: { force: true } } ).catch( () => {} );
			}
		}
	} );
} );
