/**
 * Browser-level regression test for the Wordfence M-Chart-194 vulnerability:
 * Authenticated Contributor Stored Cross-Site Scripting via chart labels.
 *
 * Patched in plugin v1.10 (commit adaaf52, 2023-03-18).
 * Reporter: Ngo Thien (@thienbg93)
 * Reference: https://www.wordfence.com/threat-intel/vulnerabilities/wordpress-plugins/m-chart/m-chart-194-authenticated-contributor-stored-cross-site-scripting
 *
 * Stores XSS payloads and visits the chart in a real browser.
 * If any payload were to execute it would set window.__pwned, which we then
 * assert is undefined. This is the layer that catches a regression even if
 * unit + integration mitigation gets bypassed somehow at render time.
 *
 * Most tests here put the payload straight into the database, which is the worst case: nothing the save does
 * can be relied on. The last test is the attack as it was reported, a real Contributor typing the payloads
 * into the chart editor and an administrator opening what they submitted.
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

const {
	test,
	expect,
	step,
	awaitChartEditor,
	typeIntoCell,
	trackChartRender,
	expectChartRendered,
	watchPage,
	expectNoDialogs,
} = require( './fixtures' );

// What every one of these tests is about, said the same way each time
const PAYLOAD_RAN     = 'window.__pwned is set, which means a payload stored in the chart ran as script';
const PAYLOAD_DIALOG  = 'a payload stored in the chart ran as script';
const BECAME_ELEMENTS = 'elements made out of the chart\'s text, which must stay text';
const BECAME_HANDLERS = 'elements carrying an event handler from the chart\'s text';

test.describe( '@security XSS regression — Wordfence M-Chart-194', () => {
	test( 'Stored XSS payload in axis label does not execute on chart page', async ( {
		page,
		postFactory,
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
		const post = await postFactory( {
			content: `[chart id="${ chart.id }"]`,
			status:  'publish',
			title:   'XSS axis label test',
		} );

		await trackChartRender( page );
		await page.goto( `/?p=${ post.id }` );
		await expectChartRendered( page );

		const pwned = await page.evaluate( () => window.__pwned );
		expect( pwned, PAYLOAD_RAN ).toBeUndefined();
	} );

	test( 'Same payload in [chart show="table"] is escaped', async ( {
		page,
		postFactory,
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

		const post = await postFactory( {
			content: `[chart id="${ chart.id }" show="table"]`,
			status:  'publish',
			title:   'XSS table test',
		} );

		await page.goto( `/?p=${ post.id }` );

		// The table markup is server-rendered — presence means the payload
		// made the full round trip through the escaping pipeline
		await expect( page.locator( 'table.m-chart-table' ), 'the chart as a table' ).toBeVisible();

		const pwned = await page.evaluate( () => window.__pwned );
		expect( pwned, PAYLOAD_RAN ).toBeUndefined();
	} );

	test( 'Image-src onerror handler in axis label is neutralized', async ( {
		page,
		postFactory,
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

		const post = await postFactory( {
			content: `[chart id="${ chart.id }"]`,
			status:  'publish',
			title:   'XSS onerror test',
		} );

		await trackChartRender( page );
		await page.goto( `/?p=${ post.id }` );
		await expectChartRendered( page );

		const pwned = await page.evaluate( () => window.__pwned );
		expect( pwned, PAYLOAD_RAN ).toBeUndefined();
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
		postFactory,
		chartFactory,
	} ) => {
		const dialogs = [];

		page.on( 'dialog', ( dialog ) => {
			dialogs.push( dialog.message() );
			dialog.dismiss();
		} );

		const chart = await chartFactory( { meta: payloadMeta() } );
		const post  = await postFactory( {
			content: `[chart id="${ chart.id }"]`,
			status:  'publish',
			title:   'XSS every field test',
		} );

		await step( 'Open the public page that embeds the chart', async () => {
			await trackChartRender( page );
			await page.goto( `/?p=${ post.id }` );
			await expectChartRendered( page );

			expect( await page.evaluate( () => window.__pwned ), PAYLOAD_RAN ).toBeUndefined();
			expect( dialogs, `dialogs the page opened (${ PAYLOAD_DIALOG })` ).toEqual( [] );
		} );

		await step( 'Check nothing in the chart text became an element', async () => {
			await expect( page.locator( '.m-chart-container img, .m-chart-container svg, .m-chart-container iframe, .m-chart-container script' ), BECAME_ELEMENTS ).toHaveCount( 0 );
			await expect( page.locator( '.m-chart-container [onerror], .m-chart-container [onload]' ), BECAME_HANDLERS ).toHaveCount( 0 );
		} );

		await step( 'Check the chart shows the payloads as text', async () => {
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

			expect( chartText.labels, 'the chart\'s labels, which should be the payloads as text' ).toEqual( PAYLOADS );
			expect( chartText.series, 'the chart\'s series names, which should be the payloads as text' ).toEqual( PAYLOADS );
			expect( chartText.subtitle, 'the chart\'s subtitle, which should be the payloads as text' ).toBe( TYPED );

			// A javascript: source link never reaches the page
			expect( chartText.sourceUrl, 'the source link given to the chart, a javascript: address must not get this far' ).toBe( '' );

			// And the data table shows the same text
			const headers = await page.locator( 'table.m-chart-table thead th' ).allTextContents();

			expect( headers.map( ( header ) => header.trim() ), 'the data table\'s headings, which should be the payloads as text' ).toEqual( PAYLOADS );
		} );
	} );

	test( 'Payloads in every field are text in the chart editor', async ( { page, chartEditPage } ) => {
		const dialogs = [];

		page.on( 'dialog', ( dialog ) => {
			dialogs.push( dialog.message() );
			dialog.dismiss();
		} );

		await chartEditPage.open( { meta: payloadMeta() } );

		expect( await page.evaluate( () => window.__pwned ), PAYLOAD_RAN ).toBeUndefined();
		expect( dialogs, `dialogs the editor opened (${ PAYLOAD_DIALOG })` ).toEqual( [] );

		// The spreadsheet shows each cell as the text it holds
		const firstColumn = await page.evaluate( () =>
			Array.from( document.querySelectorAll( '#m-chart-spreadsheet-root .jss_worksheet tbody tr' ) )
				.slice( 1, 4 )
				.map( ( row ) => row.querySelectorAll( 'td' )[ 1 ].textContent )
		);

		expect( firstColumn, 'the first column of the spreadsheet, which should be the payloads as text' ).toEqual( PAYLOADS );

		// Nothing in a cell or a field became an element
		await expect( page.locator( '#m-chart-spreadsheet-root img, #m-chart-spreadsheet-root svg[onload], #m-chart-spreadsheet-root script' ), BECAME_ELEMENTS ).toHaveCount( 0 );
		await expect( page.locator( '#m-chart-subtitle-root img, #m-chart-subtitle-root script, #m-chart-chart-root script' ), BECAME_ELEMENTS ).toHaveCount( 0 );

		// And the subtitle field holds the text for editing
		await expect( page.locator( '#m-chart-subtitle-root input' ).first(), 'the subtitle field' ).toHaveValue( TYPED );
	} );

	test( 'A Contributor typing payloads into the chart editor harms neither the admin who opens it nor a visitor', async ( {
		page,
		contributorPage,
		requestUtils,
		cleanup,
	} ) => {
		// The attack as reported: the lowest role that can make a chart, working through the real form
		const contributorSeen = watchPage( contributorPage );

		await step( 'As a Contributor, open the new chart screen', async () => {
			await contributorPage.goto( '/wp-admin/post-new.php?post_type=m-chart' );
			await awaitChartEditor( contributorPage );
		} );

		await step( 'As a Contributor, type the payloads into every field and the sheet', async () => {
			await contributorPage.locator( '#title' ).fill( 'Contributor chart' );

			for ( const name of [ 'subtitle', 'x_title', 'y_title', 'source' ] ) {
				await contributorPage.locator( `[name="m-chart[${ name }]"]` ).fill( TYPED );
			}

			await contributorPage.locator( '[name="m-chart[source_url]"]' ).fill( 'javascript:window.__pwned=true' );
			await contributorPage.locator( '[name="m-chart[include_source]"]' ).check();

			// Payloads as the labels along the top and down the side, numbers in between
			for ( const [ index, payload ] of PAYLOADS.entries() ) {
				await typeIntoCell( contributorPage, 0, index + 1, payload );
				await typeIntoCell( contributorPage, index + 1, 0, payload );

				for ( let col = 1; col <= PAYLOADS.length; col++ ) {
					await typeIntoCell( contributorPage, index + 1, col, String( index + col ) );
				}
			}
		} );

		const id = await step( 'As a Contributor, submit the chart for review', async () => {
			// A Contributor can only submit for review
			await contributorPage.locator( '#publish' ).click();
			await contributorPage.waitForURL( /post\.php\?post=\d+&action=edit/, { timeout: 30000 } );

			const chartId = parseInt( new URL( contributorPage.url() ).searchParams.get( 'post' ), 10 );

			cleanup.chart( chartId );

			expect( await contributorPage.evaluate( () => window.__pwned ), PAYLOAD_RAN ).toBeUndefined();
			await expectNoDialogs( contributorSeen, PAYLOAD_DIALOG );

			return chartId;
		} );

		// An administrator opens the submitted chart, the moment a stored payload would get its privileges
		const seen = watchPage( page );

		await step( 'As an administrator, open the submitted chart in the editor', async () => {
			await page.goto( `/wp-admin/post.php?post=${ id }&action=edit` );
			await awaitChartEditor( page );

			expect( await page.evaluate( () => window.__pwned ), PAYLOAD_RAN ).toBeUndefined();
			await expect( page.locator( '[name="m-chart[subtitle]"]' ), 'the subtitle field' ).toHaveValue( TYPED );
			await expect( page.locator( '[name="m-chart[source_url]"]' ), 'the source link field, which must not hold a javascript: address' ).not.toHaveValue( /javascript:/i );
			await expect( page.locator( '#m-chart-spreadsheet-root img, #m-chart-spreadsheet-root script, #m-chart-chart-root script' ), BECAME_ELEMENTS ).toHaveCount( 0 );
		} );

		await step( 'Approve the chart and open it as a visitor would', async () => {
			// And approves it, after which anyone can load it
			await requestUtils.rest( { method: 'POST', path: `/wp/v2/m-chart/${ id }`, data: { status: 'publish' } } );

			await trackChartRender( page );
			await page.goto( `/?post_type=m-chart&p=${ id }` );
			await expectChartRendered( page );

			expect( await page.evaluate( () => window.__pwned ), PAYLOAD_RAN ).toBeUndefined();
			await expect( page.locator( '.m-chart-container img, .m-chart-container svg, .m-chart-container iframe, .m-chart-container script' ), BECAME_ELEMENTS ).toHaveCount( 0 );
			await expect( page.locator( '.m-chart-container [onerror], .m-chart-container [onload]' ), BECAME_HANDLERS ).toHaveCount( 0 );

			// What the Contributor typed is what the chart shows, as text
			const drawn = await page.evaluate( () => {
				const chart = window.Chart.getChart( document.querySelector( 'canvas.m-chart' ) );

				return [ ...chart.data.labels, ...chart.data.datasets.map( ( dataset ) => dataset.label ) ];
			} );

			expect( [ ...new Set( drawn ) ].sort(), 'the labels and series names the chart drew, which should be the payloads as text' ).toEqual( [ ...PAYLOADS ].sort() );
		} );

		await expectNoDialogs( seen, PAYLOAD_DIALOG );
	} );
} );
