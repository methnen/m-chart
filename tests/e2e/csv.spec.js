/**
 * CSV import and export through the editor's own controls
 *
 * The PHP tests cover the two AJAX handlers, this covers what is wrapped around them:
 * the file picker, the grid being replaced with what came back, and the browser being handed a download
 */

const fs = require( 'fs' );
const { test, expect, readSheet, watchPage } = require( './fixtures' );

// Cells a CSV is easy to get wrong: a separator inside a cell, special characters, and a cell that looks like a formula
const ROWS = [
	[ '',            'R&D', 'x < y > z', 'café €5' ],
	[ 'North',       '1',   '2',         '3' ],
	[ 'South, East', '4',   '5',         '6' ],
	[ '=SUM(B2:B3)', '7',   '8',         '9' ],
];

const IMPORT_FILE = [
	',R&D,x < y > z,café €5',
	'North,1,2,3',
	'"South, East",4,5,6',
	'"=SUM(B2:B3)",7,8,9',
].join( '\n' ) + '\n';

// What the export has to produce for the same cells
// A byte order mark so Excel reads it as UTF-8, CRLF line ends, the comma cell quoted,
// and an apostrophe in front of the formula so no spreadsheet application runs it
// The export sends the editor's whole grid, so the real file also has empty cells after these on every line
// and empty lines below them, withoutPadding() takes those off before the comparison
const EXPORT_FILE = '﻿' + [
	',R&D,x < y > z,café €5',
	'North,1,2,3',
	'"South, East",4,5,6',
	'\'=SUM(B2:B3),7,8,9',
].join( '\r\n' ) + '\r\n';

/**
 * Removes the grid's empty padding from an exported file: the commas that end a line and the lines that are only commas
 *
 * @param {string} csv the downloaded text
 * @return {string} the same file without the padding
 */
function withoutPadding( csv ) {
	const lines = csv.split( '\r\n' ).map( ( line ) => line.replace( /,+$/, '' ) );

	while ( lines.length && '' === lines[ lines.length - 1 ] ) {
		lines.pop();
	}

	return lines.join( '\r\n' ) + '\r\n';
}

test.describe( 'CSV import and export', () => {
	test( 'an imported file replaces the sheet and exports back out as it should', async ( { page, chartEditPage } ) => {
		const seen = watchPage( page );

		await chartEditPage.open( { title: 'CSV round trip' } );

		await page.locator( '#m-chart-csv input[type="file"]' ).setInputFiles( {
			name:     'figures.csv',
			mimeType: 'text/csv',
			buffer:   Buffer.from( IMPORT_FILE, 'utf8' ),
		} );

		// The file is named and the user is warned before anything is replaced
		await expect( page.locator( '#m-chart-csv .file-info' ) ).toContainText( 'figures.csv' );

		await page.locator( '#m-chart-csv' ).getByRole( 'button', { name: 'Import', exact: true } ).click();

		// The cells are text as typed: the formula is shown, not run
		await expect.poll( () => readSheet( page ) ).toEqual( ROWS );
		await expect( page.locator( '#m-chart-csv .error' ) ).toHaveCount( 0 );

		// Wait for the preview to catch up with the new data before exporting
		await page.waitForSelector( '.m-chart-container[data-image-capture-state="ready"]', { state: 'attached', timeout: 15000 } );

		const downloading = page.waitForEvent( 'download' );

		await page.locator( '#m-chart-csv' ).getByRole( 'button', { name: 'Export', exact: true } ).click();

		const download = await downloading;

		expect( download.suggestedFilename() ).toMatch( /\.csv$/ );
		const exported = fs.readFileSync( await download.path(), 'utf8' );

		// Every line ends CRLF, a bare line feed would be a broken file in Excel
		expect( exported.replace( /\r\n/g, '' ) ).not.toMatch( /[\r\n]/ );
		expect( withoutPadding( exported ) ).toBe( EXPORT_FILE );

		expect( seen.dialogs ).toEqual( [] );
		expect( seen.errors ).toEqual( [] );
	} );

	test( 'a file that is not a CSV is refused before anything is sent', async ( { page, chartEditPage } ) => {
		await chartEditPage.open( { title: 'CSV refusal' } );

		const before = await readSheet( page );

		await page.locator( '#m-chart-csv input[type="file"]' ).setInputFiles( {
			name:     'picture.png',
			mimeType: 'image/png',
			buffer:   Buffer.from( 'not a csv' ),
		} );

		await expect( page.locator( '#m-chart-csv .file.error' ) ).toBeVisible();
		expect( await readSheet( page ) ).toEqual( before );
	} );
} );
