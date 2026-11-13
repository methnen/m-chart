/**
 * Axe-core accessibility gate for the chart edit screen.
 *
 * Scans the plugin's own React mounts (subtitle field, spreadsheet meta box,
 * chart preview meta box) against the WCAG 2.1 A/AA rule tags.
 *
 * The Jspreadsheet grid internals (.jss_container) are excluded: the vendored
 * grid has documented limited screen reader support, which is why the UI
 * points AT users at the fully accessible CSV Import flow instead — see the
 * screen-reader hint in JspreadsheetWrapper.js and the Accessibility section
 * of readme.txt.
 *
 * Tagged @a11y — runs with the regular chromium E2E pass in CI and via
 * `npm run test:a11y` locally.
 */

const { test, expect } = require( '../fixtures' );
const { AxeBuilder } = require( '@axe-core/playwright' );

const WCAG_TAGS = [ 'wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa' ];

test.describe( '@a11y chart edit screen', () => {
	test( 'plugin UI mounts have no WCAG 2.1 A/AA violations', async ( {
		page,
		chartEditPage,
	} ) => {
		await chartEditPage.open( { title: 'A11y editor chart' } );

		const results = await new AxeBuilder( { page } )
			.withTags( WCAG_TAGS )
			.include( '#m-chart-subtitle-root' )
			.include( '#m-chart-spreadsheet-root' )
			.include( '#m-chart-chart-root' )
			.exclude( '.jss_container' )
			.analyze();

		expect( results.violations ).toEqual( [] );
	} );

	// A line chart has one sheet and the sheet tab bar is hidden for it, so the scan above never looks at the tabs
	// The bar once had the Add Sheet button inside the tab list and a delete button inside every tab,
	// and nothing in a browser noticed
	test( 'the sheet tab bar has no WCAG 2.1 A/AA violations', async ( { page, chartEditPage } ) => {
		const sheet = ( label ) => [ [ '', 'X', 'Y' ], [ label, 1, 2 ], [ label + '2', 3, 4 ] ];

		await chartEditPage.open( {
			title: 'A11y tabs chart',
			meta:  { type: 'scatter', data: { sets: [ sheet( 'a' ), sheet( 'b' ), sheet( 'c' ) ] }, set_names: [ 'Alpha', 'Beta', 'Gamma' ] },
		} );

		const scan = () => new AxeBuilder( { page } )
			.withTags( WCAG_TAGS )
			.include( '#m-chart-spreadsheet-root' )
			.exclude( '.jss_container' )
			.analyze();

		await expect( page.locator( '#spreadsheet-tabs' ) ).toBeVisible();
		expect( ( await scan() ).violations ).toEqual( [] );

		// And again while a sheet's name is open for editing
		await page.locator( '#spreadsheet-tabs [role="tab"]' ).nth( 1 ).dblclick();
		await expect( page.locator( '#spreadsheet-tabs' ).getByRole( 'textbox', { name: 'Rename sheet' } ) ).toBeVisible();

		expect( ( await scan() ).violations ).toEqual( [] );
	} );

	// A test of its own, on a page axe has not scanned
	// Playwright 1.65's Firefox (159) crashes the page when a script on the page has read an element's
	// ariaLabelledByElements and Playwright then reads it too: axe reads it, the snapshot below reads it,
	// and every delete button has an aria-labelledby
	// A page with one such button and nothing else does the same, it is not this markup
	test( 'the sheet tab bar is a tab list of the sheets, with the buttons beside it', async ( { page, chartEditPage } ) => {
		const sheet = ( label ) => [ [ '', 'X', 'Y' ], [ label, 1, 2 ], [ label + '2', 3, 4 ] ];

		await chartEditPage.open( {
			title: 'A11y tab list chart',
			meta:  { type: 'scatter', data: { sets: [ sheet( 'a' ), sheet( 'b' ), sheet( 'c' ) ] }, set_names: [ 'Alpha', 'Beta', 'Gamma' ] },
		} );

		// What assistive technology is given: a tab list of the three sheets and nothing else,
		// with the buttons beside it and each delete button naming its sheet
		await expect( page.locator( '#spreadsheet-tabs' ) ).toMatchAriaSnapshot( `
			- tablist "Spreadsheet sheets":
				- tab "Alpha" [selected]
				- tab "Beta"
				- tab "Gamma"
			- button "Add Sheet"
			- button "Delete Alpha"
			- button "Delete Beta"
			- button "Delete Gamma"
		`.replace( /\t/g, '  ' ) );
	} );
} );
