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
	step,
	awaitChartEditor,
	typeIntoCell,
	readSheet,
	trimSheet,
	trackChartRender,
	expectChartRendered,
	watchPage,
	expectNoPageErrors,
	expectNoDialogs,
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

		await step( 'Open the new chart screen', async () => {
			await admin.visitAdminPage( 'post-new.php', 'post_type=m-chart' );
			await awaitChartEditor( page );
		} );

		await step( 'Type the title, the subtitle and the data', async () => {
			await page.locator( '#title' ).fill( TITLE );
			await page.locator( '[name="m-chart[subtitle]"]' ).fill( SUBTITLE );

			for ( const [ row, cells ] of SHEET.entries() ) {
				for ( const [ col, value ] of cells.entries() ) {
					if ( '' !== value ) {
						await typeIntoCell( page, row, col, value );
					}
				}
			}
		} );

		await step( 'Change the chart type to column', async () => {
			// Changing the type redraws the preview as that type
			await page.locator( '[name="m-chart[type]"]' ).selectOption( 'column' );

			await expect.poll( () => page.evaluate( () =>
				Array.from( document.querySelectorAll( '.m-chart-container canvas' ) )
					.map( ( canvas ) => window.Chart.getChart( canvas )?.config.type )
					.filter( Boolean )
			), { message: 'the preview never redrew as a bar chart, these are the chart types it is showing' } ).toContain( 'bar' );
		} );

		const id = await step( 'Publish the chart', async () => {
			// The editor holds the submit until the preview and its image are up to date, then saves
			await page.locator( '#publish' ).click();
			await page.waitForURL( /post\.php\?post=\d+&action=edit/, { timeout: 30000 } );

			const chartId = parseInt( new URL( page.url() ).searchParams.get( 'post' ), 10 );

			cleanup.chart( chartId );

			// Publish published it: the editor holds the click back until the preview and image are current,
			// and it has to come through as the same button, or WordPress saves a draft and warns about leaving
			await expect( page.locator( '#original_post_status' ), 'the status WordPress saved the chart with' ).toHaveValue( 'publish' );
			expect( seen.leaveWarnings, 'the "Leave site?" warning was raised by the save' ).toBe( 0 );

			return chartId;
		} );

		await step( 'Check what was saved', async () => {
			const meta = await getSavedPostMeta( id );

			expect( meta.type, 'the saved chart type' ).toBe( 'column' );
			expect( trimSheet( meta.data.sets[ 0 ] ), 'the saved sheet, against what was typed' ).toEqual( SHEET );
		} );

		await step( 'See the editor show it again as typed', async () => {
			await awaitChartEditor( page );

			await expect( page.locator( '#title' ), 'the title field' ).toHaveValue( TITLE );
			await expect( page.locator( '[name="m-chart[subtitle]"]' ), 'the subtitle field' ).toHaveValue( SUBTITLE );
			await expect( page.locator( '[name="m-chart[type]"]' ), 'the chart type field' ).toHaveValue( 'column' );
			expect( await readSheet( page ), 'the sheet in the editor, against what was typed' ).toEqual( SHEET );
		} );

		await step( 'Open a public page that embeds the chart', async () => {
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

			expect( drawn.type, 'the type of chart drawn on the public page' ).toBe( 'bar' );
			expect( drawn.text, 'the labels and series names drawn on the public page' ).toEqual( [ 'Costs', 'North', 'Sales', 'South' ] );
			expect( drawn.subtitle, 'the subtitle drawn on the public page' ).toBe( SUBTITLE );
		} );

		await step( 'Open a public page that shows the chart as its saved image', async () => {
			// Saving through the editor stored the chart as an image, which is what show="image" prints
			const imagePost = await postFactory( { content: `[chart id="${ id }" show="image"]`, title: 'Built chart image' } );

			await page.goto( `/?p=${ imagePost.id }` );

			const image = page.locator( '.entry-content img, main img' ).first();

			await expect( image, 'the chart image on the page' ).toBeVisible();
			expect( await image.evaluate( ( img ) => img.complete && img.naturalWidth > 0 ), 'the chart image loaded and has a size' ).toBe( true );
			await expect( page.locator( 'canvas.m-chart' ), 'a drawn chart, where only the image should be' ).toHaveCount( 0 );
		} );

		await expectNoDialogs( seen );
		await expectNoPageErrors( seen );
	} );
} );
