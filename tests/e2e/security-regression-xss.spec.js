/**
 * Browser-level regression test for the Wordfence M-Chart-194 vulnerability:
 * Authenticated Contributor Stored Cross-Site Scripting via chart labels.
 *
 * Patched in plugin v1.10 (commit adaaf52, 2023-03-18).
 * Reporter: Ngo Thien (@thienbg93)
 * Reference: https://www.wordfence.com/threat-intel/vulnerabilities/wordpress-plugins/m-chart/m-chart-194-authenticated-contributor-stored-cross-site-scripting
 *
 * Stores XSS payloads as a Contributor and visits the chart in a real browser.
 * If any payload were to execute it would set window.__pwned, which we then
 * assert is undefined. This is the layer that catches a regression even if
 * unit + integration mitigation gets bypassed somehow at render time.
 *
 * Each test first asserts the chart/table actually rendered — without that, a
 * broken embed would mean the payload never reaches the page and the __pwned
 * check would pass vacuously.
 *
 * Tagged @security so this runs on every CI push, not just nightly.
 */

const { test, expect } = require( './fixtures' );

/**
 * Registers a document-level listener (before any page script runs) that
 * flips a flag when the helper dispatches m_chart.render_done on the canvas.
 * Waiting on this instead of a fixed sleep is deterministic: once the chart
 * has rendered, any inline script smuggled through the pipeline would have
 * executed too.
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
	const container = page.locator( '.m-chart-container' );

	await expect( container ).toBeVisible();

	// Deferred rendering waits for the container to enter the viewport
	await container.scrollIntoViewIfNeeded();
	await page.waitForFunction( () => true === window.__mchartRenderDone );
}

test.describe( '@security XSS regression — Wordfence M-Chart-194', () => {
	test( 'Contributor XSS payload in axis label does not execute on chart page', async ( {
		page,
		requestUtils,
		chartFactory,
	} ) => {
		const payload = '<script>window.__pwned = true</script>';
		const chart   = await chartFactory( {
			meta: {
				x_title:   payload,
				set_names: [ payload ],
				data: {
					sets: [ [ [ '', payload ], [ payload, 1 ], [ payload, 2 ] ] ],
				},
			},
		} );

		// Embed the chart on a published post and visit it
		const post = await requestUtils.createPost( {
			content: `[chart id="${ chart.id }"]`,
			status:  'publish',
			title:   'XSS axis label test',
		} );

		await trackChartRender( page );
		await page.goto( `/?p=${ post.id }` );
		await expectChartRendered( page );

		const pwned = await page.evaluate( () => window.__pwned );
		expect( pwned ).toBeUndefined();
	} );

	test( 'Same payload in [chart show="table"] is escaped', async ( {
		page,
		requestUtils,
		chartFactory,
	} ) => {
		const payload = '<script>window.__pwned = true</script>';
		const chart   = await chartFactory( {
			meta: {
				set_names: [ payload ],
				data: {
					sets: [ [ [ '', payload ], [ payload, 1 ] ] ],
				},
			},
		} );

		const post = await requestUtils.createPost( {
			content: `[chart id="${ chart.id }" show="table"]`,
			status:  'publish',
			title:   'XSS table test',
		} );

		await page.goto( `/?p=${ post.id }` );

		// The table markup is server-rendered — presence means the payload
		// made the full round trip through the escaping pipeline
		await expect( page.locator( 'table.m-chart-table' ) ).toBeVisible();

		const pwned = await page.evaluate( () => window.__pwned );
		expect( pwned ).toBeUndefined();
	} );

	test( 'Image-src onerror handler in axis label is neutralized', async ( {
		page,
		requestUtils,
		chartFactory,
	} ) => {
		const payload = '<img src=x onerror="window.__pwned=true">';
		const chart   = await chartFactory( {
			meta: {
				x_title: payload,
				data: {
					sets: [ [ [ '', 'Series' ], [ 'A', 1 ], [ 'B', 2 ] ] ],
				},
			},
		} );

		const post = await requestUtils.createPost( {
			content: `[chart id="${ chart.id }"]`,
			status:  'publish',
			title:   'XSS onerror test',
		} );

		await trackChartRender( page );
		await page.goto( `/?p=${ post.id }` );
		await expectChartRendered( page );

		const pwned = await page.evaluate( () => window.__pwned );
		expect( pwned ).toBeUndefined();
	} );
} );
