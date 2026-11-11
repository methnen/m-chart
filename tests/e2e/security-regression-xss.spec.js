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
 * Since 2.4 chart text is stored exactly as typed and escaped where it is printed, so the later tests here
 * check the sinks themselves: that the payload is on the page as text, in the chart as a label, and that
 * nothing it contains became an element.
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

	// Three ways of writing the same attack: as markup, as a script element breakout, and typed as entities
	const PAYLOADS = [
		'<img src=x onerror="window.__pwned=true">',
		'</script><script>window.__pwned=true</script>',
		'&lt;img src=x onerror=window.__pwned=true&gt;',
	];

	const TYPED = PAYLOADS.join( ' ' );

	// The fixture writes the meta row directly, so the text fields go in the way a save stores them: HTML-encoded
	// Cells and set names are stored exactly as typed
	const stored = ( text ) => text
		.replace( /&/g, '&amp;' )
		.replace( /</g, '&lt;' )
		.replace( />/g, '&gt;' )
		.replace( /"/g, '&quot;' )
		.replace( /'/g, '&#039;' );

	// A chart with the payloads in every place that holds text, stamped the way a 2.4 save stamps it
	const payloadMeta = () => ( {
		text_format:    2,
		include_source: true,
		subtitle:       stored( TYPED ),
		x_title:        stored( TYPED ),
		y_title:        stored( TYPED ),
		source:         stored( TYPED ),
		source_url:     'javascript:window.__pwned=true',
		set_names:      [ TYPED ],
		data: {
			sets: [ [
				[ '', ...PAYLOADS ],
				[ PAYLOADS[ 0 ], 1, 2, 3 ],
				[ PAYLOADS[ 1 ], 4, 5, 6 ],
				[ PAYLOADS[ 2 ], 7, 8, 9 ],
			] ],
		},
	} );

	test( 'Payloads in every field are text on the chart page and nothing else', async ( {
		page,
		requestUtils,
		chartFactory,
	} ) => {
		const dialogs = [];

		page.on( 'dialog', ( dialog ) => {
			dialogs.push( dialog.message() );
			dialog.dismiss();
		} );

		const chart = await chartFactory( { meta: payloadMeta() } );
		const post  = await requestUtils.createPost( {
			content: `[chart id="${ chart.id }"]`,
			status:  'publish',
			title:   'XSS every field test',
		} );

		await trackChartRender( page );
		await page.goto( `/?p=${ post.id }` );
		await expectChartRendered( page );

		expect( await page.evaluate( () => window.__pwned ) ).toBeUndefined();
		expect( dialogs ).toEqual( [] );

		// Nothing in the chart text became an element
		await expect( page.locator( '.m-chart-container img, .m-chart-container svg, .m-chart-container iframe, .m-chart-container script' ) ).toHaveCount( 0 );
		await expect( page.locator( '.m-chart-container [onerror], .m-chart-container [onload]' ) ).toHaveCount( 0 );

		// The chart was given the text exactly as it is stored
		const chartText = await page.evaluate( () => {
			const instance = window.Chart.getChart( document.querySelector( 'canvas.m-chart' ) );

			return {
				labels:    instance.data.labels,
				series:    instance.data.datasets.map( ( dataset ) => dataset.label ),
				// Long text is handed to Chart.js as an array of lines
				subtitle:  [].concat( instance.options.plugins.subtitle.text ).join( ' ' ),
				sourceUrl: instance.options.plugins.mchart.source_url,
			};
		} );

		expect( chartText.labels ).toEqual( PAYLOADS );
		expect( chartText.series ).toEqual( PAYLOADS );
		expect( chartText.subtitle ).toBe( TYPED );

		// A javascript: source link never reaches the page
		expect( chartText.sourceUrl ).toBe( '' );

		// And the data table shows the same text
		const headers = await page.locator( 'table.m-chart-table thead th' ).allTextContents();

		expect( headers.map( ( header ) => header.trim() ) ).toEqual( PAYLOADS );
	} );

	test( 'Payloads in every field are text in the chart editor', async ( { page, chartEditPage } ) => {
		const dialogs = [];

		page.on( 'dialog', ( dialog ) => {
			dialogs.push( dialog.message() );
			dialog.dismiss();
		} );

		await chartEditPage.open( { meta: payloadMeta() } );

		expect( await page.evaluate( () => window.__pwned ) ).toBeUndefined();
		expect( dialogs ).toEqual( [] );

		// The spreadsheet shows each cell as the text it holds
		const firstColumn = await page.evaluate( () =>
			Array.from( document.querySelectorAll( '#m-chart-spreadsheet-root .jss_worksheet tbody tr' ) )
				.slice( 1, 4 )
				.map( ( row ) => row.querySelectorAll( 'td' )[ 1 ].textContent )
		);

		expect( firstColumn ).toEqual( PAYLOADS );

		// Nothing in a cell or a field became an element
		await expect( page.locator( '#m-chart-spreadsheet-root img, #m-chart-spreadsheet-root svg[onload], #m-chart-spreadsheet-root script' ) ).toHaveCount( 0 );
		await expect( page.locator( '#m-chart-subtitle-root img, #m-chart-subtitle-root script, #m-chart-chart-root script' ) ).toHaveCount( 0 );

		// And the subtitle field holds the text for editing
		await expect( page.locator( '#m-chart-subtitle-root input' ).first() ).toHaveValue( TYPED );
	} );
} );
