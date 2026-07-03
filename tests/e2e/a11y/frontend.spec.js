/**
 * Axe-core accessibility gate for front-end chart output.
 *
 * Scans the rendered chart region (canvas + figcaption + screen-reader
 * summary/table/source markup) and the show="table" output against the
 * WCAG 2.1 A/AA rule tags. Scoped to the plugin's own containers so theme
 * markup outside our control can't fail the gate.
 *
 * Tagged @a11y — runs with the regular chromium E2E pass in CI and via
 * `npm run test:a11y` locally.
 */

const { test, expect } = require( '../fixtures' );
const { AxeBuilder } = require( '@axe-core/playwright' );

const WCAG_TAGS = [ 'wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa' ];

// Chart meta that exercises the full accessibility surface: subtitle,
// source attribution (rendered as the focusable source link), and a
// multi-row data set so the description table has real structure
const CHART_META = {
	subtitle:       'Exports by year',
	source:         'Test Data Institute',
	source_url:     'https://example.com/data',
	include_source: true,
	data: {
		sets: [ [
			[ '', 'Japan', 'United States' ],
			[ '2022', 50, 15 ],
			[ '2023', 60, 40 ],
		] ],
	},
};

test.describe( '@a11y frontend chart output', () => {
	test( 'rendered chart region has no WCAG 2.1 A/AA violations', async ( {
		page,
		requestUtils,
		chartFactory,
	} ) => {
		const chart = await chartFactory( { title: 'A11y chart', meta: CHART_META } );
		const post  = await requestUtils.createPost( {
			content: `[m-chart id="${ chart.id }"]`,
			status:  'publish',
			title:   'A11y chart embed',
		} );

		// Flag flips when the helper dispatches m_chart.render_done on the canvas
		await page.addInitScript( () => {
			window.__mchartRenderDone = false;
			document.addEventListener(
				'm_chart.render_done',
				() => { window.__mchartRenderDone = true; },
				true
			);
		} );

		await page.goto( `/?p=${ post.id }` );

		// Positive assertion first so a missing chart can't produce a vacuous pass
		const container = page.locator( '.m-chart-container' );
		await expect( container ).toBeVisible();

		// Deferred rendering waits for the container to scroll into view
		await container.scrollIntoViewIfNeeded();
		await page.waitForFunction( () => true === window.__mchartRenderDone );

		const results = await new AxeBuilder( { page } )
			.withTags( WCAG_TAGS )
			.include( '.m-chart-container' )
			.analyze();

		expect( results.violations ).toEqual( [] );
	} );

	test( 'show="table" output has no WCAG 2.1 A/AA violations', async ( {
		page,
		requestUtils,
		chartFactory,
	} ) => {
		const chart = await chartFactory( { title: 'A11y table chart', meta: CHART_META } );
		const post  = await requestUtils.createPost( {
			content: `[m-chart id="${ chart.id }" show="table"]`,
			status:  'publish',
			title:   'A11y table embed',
		} );

		await page.goto( `/?p=${ post.id }` );

		const table = page.locator( 'table.m-chart-table' );
		await expect( table ).toBeVisible();

		const results = await new AxeBuilder( { page } )
			.withTags( WCAG_TAGS )
			.include( 'table.m-chart-table' )
			.analyze();

		expect( results.violations ).toEqual( [] );
	} );
} );
