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
} );
