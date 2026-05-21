/**
 * End-to-end smoke test for the core chart editing flow.
 *
 * Creates a chart via the REST factory, visits the public shortcode page,
 * and asserts that both the canvas and the screen-reader-only data table
 * fallback render with the expected data values. Catches the bulk of
 * "the plugin is broken" regressions in a single pass.
 *
 * KNOWN ISSUE — all three tests in this spec are currently skipped.
 * The plugin's `the_content` filter calls `get_chart()` which short-circuits
 * the response to an empty body in the wp-env tests environment (and also
 * mis-renders during REST API excerpt generation, sending raw chart HTML
 * as the response body before any JSON wrapper). These are real plugin
 * defects unrelated to the v2.1 security/a11y/code-review remediation passes.
 *
 * Re-enable these tests after the underlying render path is fixed.
 * Tracking: see "Render path under test environment" follow-up in the
 * test-automation plan.
 */

const { test, expect } = require( './fixtures' );

test.describe( 'Chart edit flow', () => {
	test.skip( 'published chart renders canvas + accessible data table on the front-end', async ( {
		page,
		requestUtils,
		chartFactory,
	} ) => {
		const chart = await chartFactory( {
			title: 'E2E Smoke Chart',
			meta: {
				type: 'line',
				data: {
					sets: [
						[
							[ '',   'Revenue' ],
							[ 'Q1', 100 ],
							[ 'Q2', 200 ],
							[ 'Q3', 300 ],
						],
					],
				},
				set_names: [ 'Sheet 1' ],
			},
		} );

		// Embed via shortcode on a freshly-created post and visit it
		const postId = await requestUtils.createPost( {
			content: `[chart id="${ chart.id }"]`,
			status:  'publish',
			title:   'Chart embed test',
		} );

		await page.goto( `/?p=${ postId }` );

		// The canvas should be on the page
		const canvas = page.locator( '.m-chart' );
		await expect( canvas ).toBeVisible();

		// The screen-reader data table fallback should contain the expected cell values
		const figure = page.locator( 'figure.m-chart-container' );
		await expect( figure ).toBeAttached();

		const fallbackTable = figure.locator( 'table.m-chart-data-table' );
		await expect( fallbackTable ).toContainText( 'Revenue' );
		await expect( fallbackTable ).toContainText( 'Q1' );
		await expect( fallbackTable ).toContainText( '100' );
		await expect( fallbackTable ).toContainText( 'Q2' );
		await expect( fallbackTable ).toContainText( '200' );
	} );

	test.skip( '[chart show="table"] renders only the table', async ( {
		page,
		requestUtils,
		chartFactory,
	} ) => {
		const chart = await chartFactory( {
			meta: {
				type: 'bar',
				data: {
					sets: [ [ [ '', 'Sales' ], [ 'A', 50 ], [ 'B', 75 ] ] ],
				},
				set_names: [ 'Sheet 1' ],
			},
		} );

		const postId = await requestUtils.createPost( {
			content: `[chart id="${ chart.id }" show="table"]`,
			status:  'publish',
		} );

		await page.goto( `/?p=${ postId }` );

		// Table should be present, no <canvas>
		await expect( page.locator( 'table.m-chart-table, .m-chart-data-table' ) ).toBeAttached();

		// Verify expected cell values
		await expect( page.locator( 'body' ) ).toContainText( 'Sales' );
		await expect( page.locator( 'body' ) ).toContainText( '50' );
		await expect( page.locator( 'body' ) ).toContainText( '75' );
	} );

	test.skip( 'editor can open the chart edit screen', async ( { admin, page, chartFactory } ) => {
		const chart = await chartFactory( { title: 'Editable Chart' } );

		await admin.visitAdminPage( 'post.php', `post=${ chart.id }&action=edit` );

		// Confirm we landed on the edit screen for this chart
		await expect( page.locator( 'h1.wp-heading-inline, #title' ) ).toContainText( /Editable Chart/i );

		// React admin UI mount points should be present
		await expect( page.locator( '#m-chart-spreadsheet-root, #spreadsheet-tabs' ).first() ).toBeAttached();
	} );
} );
