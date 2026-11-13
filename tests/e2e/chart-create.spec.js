/**
 * Building a chart from nothing, the way a person does
 *
 * Every other spec seeds its chart straight into the database, which never touches the new chart screen,
 * the plugin's own save, or the image the editor captures on the way out
 * This one starts at Charts → Add New and ends on the public page
 */

const {
	test,
	expect,
	awaitChartEditor,
	typeIntoCell,
	readSheet,
	trimSheet,
	trackChartRender,
	expectChartRendered,
	watchPage,
	getSavedPostMeta,
} = require( './fixtures' );

const TITLE    = 'E2E built chart';
const SUBTITLE = 'Units & "quotes" <b> x < y';

// What gets typed into the sheet: the first row and the first column are labels
const SHEET = [
	[ '',      'Sales', 'Costs' ],
	[ 'North', '10',    '4' ],
	[ 'South', '20',    '8' ],
];

test.describe( 'Creating a chart through the editor', () => {
	test( 'a new chart can be built, published, reopened and shown', async ( { page, admin, postFactory, cleanup } ) => {
		const seen = watchPage( page );

		await admin.visitAdminPage( 'post-new.php', 'post_type=m-chart' );
		await awaitChartEditor( page );

		await page.locator( '#title' ).fill( TITLE );
		await page.locator( '[name="m-chart[subtitle]"]' ).fill( SUBTITLE );

		for ( const [ row, cells ] of SHEET.entries() ) {
			for ( const [ col, value ] of cells.entries() ) {
				if ( '' !== value ) {
					await typeIntoCell( page, row, col, value );
				}
			}
		}

		// Changing the type redraws the preview as that type
		await page.locator( '[name="m-chart[type]"]' ).selectOption( 'column' );

		await expect.poll( () => page.evaluate( () =>
			Array.from( document.querySelectorAll( '.m-chart-container canvas' ) )
				.map( ( canvas ) => window.Chart.getChart( canvas )?.config.type )
				.filter( Boolean )
		) ).toContain( 'bar' );

		// The editor holds the submit until the preview and its image are up to date, then saves
		await page.locator( '#publish' ).click();
		await page.waitForURL( /post\.php\?post=\d+&action=edit/, { timeout: 30000 } );

		const id = parseInt( new URL( page.url() ).searchParams.get( 'post' ), 10 );

		cleanup.chart( id );

		// Publish published it: the editor holds the click back until the preview and image are current,
		// and it has to come through as the same button, or WordPress saves a draft and warns about leaving
		await expect( page.locator( '#original_post_status' ) ).toHaveValue( 'publish' );
		expect( seen.leaveWarnings, 'the "Leave site?" warning was raised by the save' ).toBe( 0 );

		// What was saved
		const meta = await getSavedPostMeta( id );

		expect( meta.type ).toBe( 'column' );
		expect( trimSheet( meta.data.sets[ 0 ] ) ).toEqual( SHEET );

		// The editor shows it again exactly as typed
		await awaitChartEditor( page );

		await expect( page.locator( '#title' ) ).toHaveValue( TITLE );
		await expect( page.locator( '[name="m-chart[subtitle]"]' ) ).toHaveValue( SUBTITLE );
		await expect( page.locator( '[name="m-chart[type]"]' ) ).toHaveValue( 'column' );
		expect( await readSheet( page ) ).toEqual( SHEET );

		// The public page draws the chart with the same text
		const post = await postFactory( { content: `[chart id="${ id }"]`, title: 'Built chart embed' } );

		await trackChartRender( page );
		await page.goto( `/?p=${ post.id }` );
		await expectChartRendered( page );

		const drawn = await page.evaluate( () => {
			const chart = window.Chart.getChart( document.querySelector( 'canvas.m-chart' ) );

			return {
				type:     chart.config.type,
				text:     [ ...chart.data.labels, ...chart.data.datasets.map( ( dataset ) => dataset.label ) ].sort(),
				subtitle: [].concat( chart.options.plugins.subtitle.text ).join( ' ' ),
			};
		} );

		expect( drawn.type ).toBe( 'bar' );
		expect( drawn.text ).toEqual( [ 'Costs', 'North', 'Sales', 'South' ] );
		expect( drawn.subtitle ).toBe( SUBTITLE );

		// Saving through the editor stored the chart as an image, which is what show="image" prints
		const imagePost = await postFactory( { content: `[chart id="${ id }" show="image"]`, title: 'Built chart image' } );

		await page.goto( `/?p=${ imagePost.id }` );

		const image = page.locator( '.entry-content img, main img' ).first();

		await expect( image ).toBeVisible();
		expect( await image.evaluate( ( img ) => img.complete && img.naturalWidth > 0 ) ).toBe( true );
		await expect( page.locator( 'canvas.m-chart' ) ).toHaveCount( 0 );

		expect( seen.dialogs ).toEqual( [] );
		expect( seen.errors ).toEqual( [] );
	} );
} );
