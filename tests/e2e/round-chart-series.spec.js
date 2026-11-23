/**
 * The round chart types given a sheet laid out like a line or column chart's:
 * an empty corner, names along the top and down the side, a series on every line
 *
 * That is the sheet a chart has when a column chart with several series is switched to a round type
 * Radar and radar area draw every series, pie, doughnut and polar draw the first
 * Before 2.4.2 core handed Chart.js every series as one data set: radar and polar threw and pie and doughnut drew nothing
 */

const { test, expect, step, readSheet, trackChartRender, watchPage, expectNoPageErrors, expectNoDialogs } = require( './fixtures' );

const SHEET = [
	[ '',         'Speed', 'Strength', 'Accuracy' ],
	[ 'Player A', 85,      70,         90 ],
	[ 'Player B', 72,      88,         65 ],
];

const BOTH_SERIES  = [ { label: 'Player A', data: [ 85, 70, 90 ] }, { label: 'Player B', data: [ 72, 88, 65 ] } ];
const FIRST_SERIES = [ { label: null, data: [ 85, 70, 90 ] } ];

// The type as the editor names it, as Chart.js names it, and the data sets it should be drawn with
const ROUND_TYPES = [
	{ type: 'radar',      native: 'radar',     datasets: BOTH_SERIES },
	{ type: 'radar-area', native: 'radar',     datasets: BOTH_SERIES },
	{ type: 'pie',        native: 'pie',       datasets: FIRST_SERIES },
	{ type: 'doughnut',   native: 'doughnut',  datasets: FIRST_SERIES },
	{ type: 'polar',      native: 'polarArea', datasets: FIRST_SERIES },
];

/**
 * What the chart on the page was drawn with, null when Chart.js has no chart on the canvas
 *
 * @param {Object} page     Playwright page
 * @param {string} selector the chart's canvas
 * @return {Promise<Object|null>} the Chart.js type, the labels, and each data set's name and values
 */
function drawnChart( page, selector ) {
	return page.evaluate( ( canvasSelector ) => {
		const canvas = document.querySelector( canvasSelector );
		const chart  = canvas && window.Chart.getChart( canvas );

		if ( ! chart ) {
			return null;
		}

		return {
			type:     chart.config.type,
			labels:   chart.data.labels,
			datasets: chart.data.datasets.map( ( dataset ) => ( { label: dataset.label ?? null, data: dataset.data } ) ),
		};
	}, selector );
}

test.describe( 'Round chart types and a sheet with several series', () => {
	test( 'a column chart with two series can be switched to each round type in the editor', async ( { page, chartEditPage } ) => {
		const seen = watchPage( page );

		await chartEditPage.open( {
			title: 'Round type switch',
			meta:  { type: 'column', data: { sets: [ SHEET ] }, set_names: [ 'Sheet 1' ] },
		} );

		for ( const { type, native, datasets } of ROUND_TYPES ) {
			await step( `Change the chart type to ${ type }`, async () => {
				await page.locator( '[name="m-chart[type]"]' ).selectOption( type );

				await expect.poll( () => drawnChart( page, '.m-chart-container canvas' ), {
					message: `the preview never became a ${ type } chart drawn with the expected series, this is what it is showing`,
				} ).toEqual( { type: native, labels: [ 'Speed', 'Strength', 'Accuracy' ], datasets } );

				// The preview and its image are up to date, so the chart could be saved as it is
				await page.waitForSelector( '.m-chart-container[data-image-capture-state="ready"]', { state: 'attached', timeout: 15000 } );

				// An error while drawing would have taken the whole editor with it, the sheet included
				expect( await readSheet( page ), `the sheet in the editor after changing to ${ type }` ).toEqual( SHEET.map( ( row ) => row.map( String ) ) );
				await expect( page.locator( '[name="m-chart[type]"]' ), 'the chart type field' ).toHaveValue( type );
			} );
		}

		await expectNoDialogs( seen );
		await expectNoPageErrors( seen );
	} );

	test( 'each round type draws the sheet on the public page', async ( { page, chartFactory } ) => {
		const seen = watchPage( page );

		await trackChartRender( page );

		for ( const { type, native, datasets } of ROUND_TYPES ) {
			await step( `Draw the ${ type } chart`, async () => {
				const chart = await chartFactory( {
					title: `Round ${ type }`,
					meta:  { type, data: { sets: [ SHEET ] }, set_names: [ 'Sheet 1' ] },
				} );

				// A chart's own page shows the chart
				await page.goto( `/?post_type=m-chart&p=${ chart.id }` );

				const container = page.locator( '.m-chart-container' ).first();

				await expect( container, `${ type }: the chart container` ).toBeVisible();
				await container.scrollIntoViewIfNeeded();

				// When Chart.js throws the chart never finishes, the checks below then say what is on the canvas
				await page.waitForFunction( () => true === window.__mchartRenderDone, null, { timeout: 15000 } ).catch( () => {} );

				expect.soft( await page.evaluate( () => true === window.__mchartRenderDone ), `${ type }: the chart finished drawing` ).toBe( true );
				expect.soft( await drawnChart( page, 'canvas.m-chart' ), `${ type }: what the chart was drawn with` ).toEqual( { type: native, labels: [ 'Speed', 'Strength', 'Accuracy' ], datasets } );
			} );
		}

		await expectNoPageErrors( seen );
	} );
} );
