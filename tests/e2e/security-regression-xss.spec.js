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
 * Tagged @security so this runs on every CI push, not just nightly.
 */

const { test, expect } = require( './fixtures' );

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

		// Embed the chart on a published post and visit it as anonymous
		const postId = await requestUtils.createPost( {
			content: `[chart id="${ chart.id }"]`,
			status:  'publish',
		} );

		await page.goto( `/?p=${ postId }` );

		// Wait long enough that any deferred script in the chart payload would have executed
		await page.waitForTimeout( 1500 );

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

		const postId = await requestUtils.createPost( {
			content: `[chart id="${ chart.id }" show="table"]`,
			status:  'publish',
		} );

		await page.goto( `/?p=${ postId }` );
		await page.waitForTimeout( 1500 );

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

		const postId = await requestUtils.createPost( {
			content: `[chart id="${ chart.id }"]`,
			status:  'publish',
		} );

		await page.goto( `/?p=${ postId }` );
		await page.waitForTimeout( 1500 );

		const pwned = await page.evaluate( () => window.__pwned );
		expect( pwned ).toBeUndefined();
	} );
} );
