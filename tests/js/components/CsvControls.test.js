/**
 * Tests for the CSV import and export controls under the spreadsheet
 *
 * Import posts the chosen file to admin-ajax and loads what comes back into the active sheet
 * Export posts the active sheet through a throwaway form so the browser gets a download
 */
import { axe, toHaveNoViolations } from 'jest-axe';

expect.extend( toHaveNoViolations );

// Screen reader announcements are part of what a user gets, so they are asserted on rather than spoken
jest.mock( '@wordpress/a11y', () => ( { speak: jest.fn() } ) );

const AJAX_URL   = 'http://localhost/wp-admin/admin-ajax.php';
const DELIMITERS = { ',': 'Comma', '\t': 'Tab', ';': 'Semicolon' };

let createElement;
let render;
let screen;
let fireEvent;
let act;
let waitFor;
let speak;
let CsvControls;
let ChartAdminProvider;
let useChartAdmin;
let latestState;
let dispatchRef;

function Capture() {
	const { state, dispatch } = useChartAdmin();

	latestState = state;
	dispatchRef = dispatch;

	return null;
}

// The context reads window.m_chart_admin at module load so the modules are loaded fresh with this chart in place
// React and the testing library load inside the same sandbox so the components and the renderer share one React
// This runs at file level because the testing library registers its cleanup hook when it loads
const originalAdmin = { ...window.m_chart_admin };

Object.assign( window.m_chart_admin, {
	post_id:           123,
	nonce:             'csv-nonce',
	ajax_url:          AJAX_URL,
	csv_delimiters:    DELIMITERS,
	// Not the first option, so a test can tell the PHP default from the top of the list
	default_delimiter: ';',
	spreadsheet_data:  [ [ [ 'old', 'data' ] ], [ [ 'second', 'sheet' ] ] ],
	set_names:         [ 'Revenue', 'Costs' ],
} );

jest.isolateModules( () => {
	( { createElement } = require( '@wordpress/element' ) );
	( { render, screen, fireEvent, act, waitFor } = require( '@testing-library/react' ) );
	( { speak } = require( '@wordpress/a11y' ) );
	CsvControls = require( '../../../components/admin-ui-src/components/CsvControls' ).default;
	( { ChartAdminProvider, useChartAdmin } = require( '../../../components/admin-ui-src/context/ChartAdminContext' ) );
} );

afterAll( () => {
	Object.assign( window.m_chart_admin, originalAdmin );
} );

/**
 * A stand in for a Jspreadsheet worksheet
 * Like the real one it pads what it is given, so what it holds is not quite what it was handed
 *
 * @param {Array} initial The sheet's starting 2D data
 * @return {Object} The fake worksheet
 */
function fakeWorksheet( initial = [ [ 'old', 'data' ] ] ) {
	let data = initial;

	return {
		// No rendered cells, so the column auto width pass has nothing to measure
		records: [ [] ],
		getData: jest.fn( () => data ),
		setData: jest.fn( ( next ) => {
			data = next.map( ( row ) => [ ...row, '' ] );
		} ),
	};
}

function renderControls( { worksheet = fakeWorksheet() } = {} ) {
	const getActiveWorksheet = jest.fn( () => worksheet );

	const utils = render(
		createElement(
			ChartAdminProvider,
			null,
			createElement( Capture ),
			createElement( CsvControls, { getActiveWorksheet } )
		)
	);

	return { ...utils, worksheet, getActiveWorksheet };
}

function csvFile( name = 'sales.csv', contents = 'a,b\n1,2' ) {
	return new File( [ contents ], name, { type: 'text/csv' } );
}

function fileInput() {
	return screen.getByLabelText( 'CSV file to import' );
}

function chooseFile( file = csvFile() ) {
	fireEvent.change( fileInput(), { target: { files: [ file ] } } );

	return file;
}

function button( name ) {
	return screen.queryByRole( 'button', { name } );
}

function delimiterSelect() {
	return screen.queryByRole( 'combobox', { name: 'CSV delimiter' } );
}

function respondWith( json ) {
	global.fetch = jest.fn().mockResolvedValue( { json: async () => json } );
}

// A request that stays in flight until the test settles it
function deferredFetch() {
	let resolve;
	let reject;

	global.fetch = jest.fn( () => new Promise( ( res, rej ) => {
		resolve = res;
		reject  = rej;
	} ) );

	return {
		resolve: ( json ) => resolve( { json: async () => json } ),
		reject:  ( error ) => reject( error ),
	};
}

async function importFile( file ) {
	chooseFile( file );

	fireEvent.click( button( 'Import' ) );

	// The controls come back once the request has settled either way
	await waitFor( () => expect( button( 'Select File' ) ).toBeInTheDocument() );
}

function postedFields() {
	const [ , options ] = global.fetch.mock.calls[ 0 ];

	return Object.fromEntries( options.body.entries() );
}

let submitted;
let submitSpy;

beforeEach( () => {
	speak.mockClear();
	submitted = [];

	// jsdom does not implement form submission, and the form is gone again by the time a test could look
	// so record what each submitted form would have sent
	submitSpy = jest.spyOn( window.HTMLFormElement.prototype, 'submit' ).mockImplementation( function () {
		submitted.push( {
			action:     this.action,
			method:     this.method,
			fields:     Object.fromEntries( new window.FormData( this ).entries() ),
			inDocument: document.body.contains( this ),
		} );
	} );
} );

// The spy is restored on its own, jest.restoreAllMocks() would also take away the console spies
// @wordpress/jest-console uses to fail a test that logs an unexpected error or warning
afterEach( () => {
	submitSpy.mockRestore();
	delete global.fetch;
	document.body.innerHTML = '';
} );

describe( 'CsvControls at rest', () => {
	test( 'offers Select File and Export under a CSV Import/Export heading', () => {
		renderControls();

		expect( screen.getByRole( 'group', { name: 'CSV Import/Export' } ) ).toBeInTheDocument();
		expect( button( 'Select File' ) ).toBeInTheDocument();
		expect( button( 'Export' ) ).toBeInTheDocument();

		// wp.components warns about its pre-6.7 margin styles the first time these controls render in this file
		// @wordpress/deprecated logs each message once per process, so only the first test to render the delimiter sees it
		chooseFile();

		expect( console ).toHaveWarned();
	} );

	test( 'does not offer Import, Cancel or the delimiter until a file is chosen', () => {
		renderControls();

		expect( button( 'Import' ) ).toBeNull();
		expect( button( 'Cancel Import' ) ).toBeNull();
		expect( delimiterSelect() ).toBeNull();
	} );

	test( 'the file field only offers CSV files', () => {
		renderControls();

		expect( fileInput() ).toHaveAttribute( 'type', 'file' );
		expect( fileInput() ).toHaveAttribute( 'accept', '.csv' );
	} );

	test( 'Select File opens the file picker', () => {
		renderControls();

		const openPicker = jest.spyOn( fileInput(), 'click' ).mockImplementation( () => {} );

		fireEvent.click( button( 'Select File' ) );

		expect( openPicker ).toHaveBeenCalledTimes( 1 );
	} );

	test( 'shows no errors and is not busy', () => {
		renderControls();

		expect( screen.queryByRole( 'alert' ) ).toBeNull();
		expect( screen.getByRole( 'status' ) ).toHaveAttribute( 'aria-busy', 'false' );
	} );

	test( 'has no accessibility violations', async () => {
		const { container } = renderControls();

		expect( await axe( container ) ).toHaveNoViolations();
	} );
} );

describe( 'CsvControls choosing a file', () => {
	test( 'a CSV file is queued with its name, a warning, Import and Cancel', () => {
		renderControls();

		chooseFile( csvFile( 'quarterly sales.csv' ) );

		expect( screen.getByText( /File: quarterly sales\.csv/ ) ).toBeInTheDocument();
		expect( screen.getByText( 'Importing this file will replace all existing data in this sheet' ) ).toBeInTheDocument();
		expect( button( 'Import' ) ).toBeInTheDocument();
		expect( button( 'Cancel Import' ) ).toBeInTheDocument();
		expect( delimiterSelect() ).toBeInTheDocument();
	} );

	test( 'Select File and Export are unavailable while a file is queued', () => {
		renderControls();

		chooseFile();

		expect( button( 'Select File' ) ).toBeNull();
		expect( button( 'Export' ) ).toBeNull();
	} );

	test( 'nothing is sent to the server just by choosing a file', () => {
		respondWith( { success: true, data: [] } );

		renderControls();

		chooseFile();

		expect( global.fetch ).not.toHaveBeenCalled();
	} );

	test( 'an upper case .CSV extension is accepted', () => {
		renderControls();

		chooseFile( csvFile( 'EXPORT.CSV' ) );

		expect( button( 'Import' ) ).toBeInTheDocument();
		expect( screen.queryByRole( 'alert' ) ).toBeNull();
	} );

	test.each( [ 'sales.xlsx', 'sales.csv.txt', 'csv', 'notes.txt' ] )( '%s is refused with a message', ( name ) => {
		renderControls();

		chooseFile( new File( [ 'x' ], name ) );

		expect( screen.getByRole( 'alert' ) ).toHaveTextContent( 'You can only import CSV files' );
		expect( button( 'Import' ) ).toBeNull();
		expect( button( 'Select File' ) ).toBeInTheDocument();
		expect( speak ).toHaveBeenCalledWith( 'You can only import CSV files', 'assertive' );
	} );

	test( 'Select File clears the wrong file message', () => {
		renderControls();

		chooseFile( new File( [ 'x' ], 'notes.txt' ) );

		jest.spyOn( fileInput(), 'click' ).mockImplementation( () => {} );
		fireEvent.click( button( 'Select File' ) );

		expect( screen.queryByRole( 'alert' ) ).toBeNull();
	} );

	test( 'choosing a CSV after a wrong file clears the message', () => {
		renderControls();

		chooseFile( new File( [ 'x' ], 'notes.txt' ) );
		chooseFile( csvFile() );

		expect( screen.queryByRole( 'alert' ) ).toBeNull();
		expect( button( 'Import' ) ).toBeInTheDocument();
	} );

	test( 'Cancel Import drops the file and brings the resting controls back', () => {
		respondWith( { success: true, data: [] } );

		const { worksheet } = renderControls();

		chooseFile();
		fireEvent.click( button( 'Cancel Import' ) );

		expect( screen.queryByText( /File:/ ) ).toBeNull();
		expect( button( 'Import' ) ).toBeNull();
		expect( button( 'Select File' ) ).toBeInTheDocument();
		expect( button( 'Export' ) ).toBeInTheDocument();
		expect( global.fetch ).not.toHaveBeenCalled();
		expect( worksheet.setData ).not.toHaveBeenCalled();
	} );

	test( 'has no accessibility violations with a file queued', async () => {
		const { container } = renderControls();

		chooseFile();

		expect( await axe( container ) ).toHaveNoViolations();
	} );
} );

describe( 'CsvControls delimiter', () => {
	test( 'lists the delimiters PHP supplied, each as "… Delimited"', () => {
		renderControls();

		chooseFile();

		const options = Array.from( delimiterSelect().options ).map( ( option ) => [ option.value, option.textContent ] );

		expect( options ).toEqual( [
			[ ',', 'Comma Delimited' ],
			[ '\t', 'Tab Delimited' ],
			[ ';', 'Semicolon Delimited' ],
		] );
	} );

	test( 'starts on the default delimiter from the plugin settings', () => {
		renderControls();

		chooseFile();

		expect( delimiterSelect() ).toHaveValue( ';' );
	} );

	test( 'the default delimiter is what gets sent when the user leaves it alone', async () => {
		respondWith( { success: true, data: [ [ 'a' ] ] } );

		renderControls();

		await importFile();

		expect( postedFields().csv_delimiter ).toBe( ';' );
	} );

	test.each( [
		[ 'Comma', ',' ],
		[ 'Tab', '\t' ],
	] )( 'choosing %s sends that delimiter with the import', async ( name, value ) => {
		respondWith( { success: true, data: [ [ 'a' ] ] } );

		renderControls();

		chooseFile();
		fireEvent.change( delimiterSelect(), { target: { value } } );

		expect( delimiterSelect() ).toHaveValue( value );

		fireEvent.click( button( 'Import' ) );

		await waitFor( () => expect( button( 'Select File' ) ).toBeInTheDocument() );

		expect( postedFields().csv_delimiter ).toBe( value );
	} );

	test( 'the chosen delimiter is remembered for the next file', () => {
		renderControls();

		chooseFile();
		fireEvent.change( delimiterSelect(), { target: { value: '\t' } } );
		fireEvent.click( button( 'Cancel Import' ) );

		chooseFile( csvFile( 'another.csv' ) );

		expect( delimiterSelect() ).toHaveValue( '\t' );
	} );
} );

describe( 'CsvControls import', () => {
	test( 'posts the file to the import action on admin-ajax', async () => {
		respondWith( { success: true, data: [ [ 'a' ] ] } );

		renderControls();

		await importFile();

		expect( global.fetch ).toHaveBeenCalledTimes( 1 );

		const [ url, options ] = global.fetch.mock.calls[ 0 ];

		expect( url ).toBe( `${ AJAX_URL }?action=m_chart_import_csv` );
		expect( options.method ).toBe( 'POST' );
		expect( options.body ).toBeInstanceOf( window.FormData );
	} );

	test( 'sends the file, the chart id, the delimiter and the nonce, and nothing else', async () => {
		respondWith( { success: true, data: [ [ 'a' ] ] } );

		renderControls();

		const file = csvFile( 'sales.csv', 'region;total\nNorth;10' );

		await importFile( file );

		const fields = postedFields();

		expect( Object.keys( fields ).sort() ).toEqual( [ 'csv_delimiter', 'import_csv_file', 'nonce', 'post_id' ] );
		expect( fields.post_id ).toBe( '123' );
		expect( fields.nonce ).toBe( 'csv-nonce' );
		expect( fields.csv_delimiter ).toBe( ';' );
		expect( fields.import_csv_file ).toBeInstanceOf( window.File );
		expect( fields.import_csv_file.name ).toBe( 'sales.csv' );
		expect( fields.import_csv_file.size ).toBe( file.size );
	} );

	test( 'shows that the import is running and takes the other controls away until it is done', async () => {
		const request = deferredFetch();

		renderControls();

		chooseFile();
		fireEvent.click( button( 'Import' ) );

		expect( screen.getByText( 'Importing file' ) ).toBeInTheDocument();
		expect( screen.getByRole( 'status' ) ).toHaveAttribute( 'aria-busy', 'true' );
		expect( speak ).toHaveBeenCalledWith( 'Importing CSV file' );

		expect( button( 'Import' ) ).toBeNull();
		expect( button( 'Cancel Import' ) ).toBeNull();
		expect( button( 'Select File' ) ).toBeNull();
		expect( button( 'Export' ) ).toBeNull();
		expect( screen.queryByText( /File:/ ) ).toBeNull();

		await act( async () => {
			request.resolve( { success: true, data: [ [ 'a' ] ] } );
		} );

		expect( screen.queryByText( 'Importing file' ) ).toBeNull();
		expect( screen.getByRole( 'status' ) ).toHaveAttribute( 'aria-busy', 'false' );
		expect( button( 'Select File' ) ).toBeInTheDocument();
		expect( button( 'Export' ) ).toBeInTheDocument();
	} );

	test( 'a successful import puts the returned rows into the sheet', async () => {
		const rows = [ [ 'Region', 'Total' ], [ 'North', '10' ], [ 'South', '12' ] ];

		respondWith( { success: true, data: rows } );

		const { worksheet } = renderControls();

		await importFile();

		expect( worksheet.setData ).toHaveBeenCalledTimes( 1 );
		expect( worksheet.setData ).toHaveBeenCalledWith( rows );
	} );

	test( 'a successful import updates the chart data from what the sheet now holds', async () => {
		respondWith( { success: true, data: [ [ 'Region', 'Total' ], [ 'North', '10' ] ] } );

		const { worksheet } = renderControls();

		await importFile();

		// The sheet pads what it is given, the chart has to get the sheet's version rather than the raw response
		expect( latestState.spreadsheetData[ 0 ] ).toEqual( [ [ 'Region', 'Total', '' ], [ 'North', '10', '' ] ] );
		expect( latestState.spreadsheetData[ 0 ] ).toBe( worksheet.getData() );

		// The other sheet is left alone
		expect( latestState.spreadsheetData[ 1 ] ).toEqual( [ [ 'second', 'sheet' ] ] );
	} );

	test( 'the import lands in whichever sheet is active', async () => {
		respondWith( { success: true, data: [ [ 'imported' ] ] } );

		renderControls( { worksheet: fakeWorksheet( [ [ 'second', 'sheet' ] ] ) } );

		act( () => dispatchRef( { type: 'SET_ACTIVE_SHEET', payload: 1 } ) );

		await importFile();

		expect( latestState.spreadsheetData[ 0 ] ).toEqual( [ [ 'old', 'data' ] ] );
		expect( latestState.spreadsheetData[ 1 ] ).toEqual( [ [ 'imported', '' ] ] );
	} );

	test( 'a successful import is announced and leaves no error behind', async () => {
		respondWith( { success: true, data: [ [ 'a' ] ] } );

		renderControls();

		await importFile();

		expect( speak ).toHaveBeenLastCalledWith( 'CSV file imported' );
		expect( screen.queryByRole( 'alert' ) ).toBeNull();
	} );

	test.each( [ 'R&D', 'x < y > z', '"quoted" \'single\'', '<b>bold</b>', 'café €5 ±2°', '日本語', '=SUM(A1:A9)' ] )(
		'an imported cell of %s reaches the sheet as sent',
		async ( cell ) => {
			respondWith( { success: true, data: [ [ cell ] ] } );

			const { worksheet } = renderControls();

			await importFile();

			expect( worksheet.setData ).toHaveBeenCalledWith( [ [ cell ] ] );
			expect( latestState.spreadsheetData[ 0 ][ 0 ][ 0 ] ).toBe( cell );
		}
	);

	test( 'the message from the server is shown when it refuses the file', async () => {
		respondWith( { success: false, data: 'CSV file too large (max 2MB)' } );

		const { worksheet } = renderControls();

		await importFile();

		expect( screen.getByRole( 'alert' ) ).toHaveTextContent( 'CSV file too large (max 2MB)' );
		expect( speak ).toHaveBeenLastCalledWith( 'CSV file too large (max 2MB)', 'assertive' );

		// Nothing was imported
		expect( worksheet.setData ).not.toHaveBeenCalled();
		expect( latestState.spreadsheetData[ 0 ] ).toEqual( [ [ 'old', 'data' ] ] );
		expect( speak ).not.toHaveBeenCalledWith( 'CSV file imported' );
	} );

	test( 'a refusal without a message still tells the user the import failed', async () => {
		respondWith( { success: false } );

		renderControls();

		await importFile();

		expect( screen.getByRole( 'alert' ) ).toHaveTextContent( 'Import failed' );
	} );

	test( 'a server message is shown as text, never as markup', async () => {
		respondWith( { success: false, data: '<img src=x onerror=alert(1)> bad file' } );

		const { container } = renderControls();

		await importFile();

		expect( screen.getByRole( 'alert' ) ).toHaveTextContent( '<img src=x onerror=alert(1)> bad file' );
		expect( container.querySelector( 'img' ) ).toBeNull();
	} );

	test( 'a network failure is reported with its reason', async () => {
		global.fetch = jest.fn().mockRejectedValue( new TypeError( 'Failed to fetch' ) );

		const { worksheet } = renderControls();

		await importFile();

		expect( screen.getByRole( 'alert' ) ).toHaveTextContent( 'Import error: Failed to fetch' );
		expect( speak ).toHaveBeenLastCalledWith( 'Import error: Failed to fetch', 'assertive' );
		expect( worksheet.setData ).not.toHaveBeenCalled();
	} );

	test( 'a response that is not JSON is reported as an import error', async () => {
		global.fetch = jest.fn().mockResolvedValue( {
			json: async () => {
				throw new SyntaxError( 'Unexpected token < in JSON at position 0' );
			},
		} );

		renderControls();

		await importFile();

		expect( screen.getByRole( 'alert' ) ).toHaveTextContent( 'Import error: Unexpected token < in JSON at position 0' );
	} );

	test( 'the controls come back after a failed import so the user can try again', async () => {
		respondWith( { success: false, data: 'CSV file was empty' } );

		const { worksheet } = renderControls();

		await importFile();

		expect( screen.queryByText( 'Importing file' ) ).toBeNull();
		expect( button( 'Export' ) ).toBeInTheDocument();

		respondWith( { success: true, data: [ [ 'second try' ] ] } );

		await importFile( csvFile( 'fixed.csv' ) );

		expect( worksheet.setData ).toHaveBeenCalledWith( [ [ 'second try' ] ] );
		expect( screen.queryByRole( 'alert' ) ).toBeNull();
	} );

	test( 'Select File clears the message from a failed import', async () => {
		respondWith( { success: false, data: 'CSV file was empty' } );

		renderControls();

		await importFile();

		jest.spyOn( fileInput(), 'click' ).mockImplementation( () => {} );
		fireEvent.click( button( 'Select File' ) );

		expect( screen.queryByRole( 'alert' ) ).toBeNull();
	} );

	test( 'an import while no sheet is mounted changes nothing and does not break', async () => {
		respondWith( { success: true, data: [ [ 'a' ] ] } );

		renderControls( { worksheet: null } );

		const before = latestState.spreadsheetData;

		await importFile();

		expect( latestState.spreadsheetData ).toBe( before );
		expect( screen.queryByRole( 'alert' ) ).toBeNull();
	} );
} );

describe( 'CsvControls export', () => {
	function addTitleField( value ) {
		const title = document.createElement( 'input' );

		title.id    = 'title';
		title.value = value;

		document.body.appendChild( title );
	}

	test( 'posts a form to the export action on admin-ajax', () => {
		renderControls();

		fireEvent.click( button( 'Export' ) );

		expect( submitted ).toHaveLength( 1 );
		expect( submitted[ 0 ].action ).toBe( `${ AJAX_URL }?action=m_chart_export_csv` );
		expect( submitted[ 0 ].method ).toBe( 'post' );
	} );

	test( 'sends the chart id, the sheet data, the title, the sheet name and the nonce, and nothing else', () => {
		addTitleField( 'Sales by region' );

		renderControls( { worksheet: fakeWorksheet( [ [ 'Region', 'Total' ], [ 'North', '10' ] ] ) } );

		fireEvent.click( button( 'Export' ) );

		expect( submitted[ 0 ].fields ).toEqual( {
			post_id:  '123',
			data:     '[["Region","Total"],["North","10"]]',
			title:    'Sales by region',
			set_name: 'Revenue',
			nonce:    'csv-nonce',
		} );
	} );

	test( 'exports what the sheet holds right now, not what was saved', () => {
		const worksheet = fakeWorksheet( [ [ 'old' ] ] );

		renderControls( { worksheet } );

		// The user edits a cell, nothing has been saved or even pushed to the chart yet
		worksheet.getData.mockReturnValue( [ [ 'edited just now' ] ] );

		fireEvent.click( button( 'Export' ) );

		expect( JSON.parse( submitted[ 0 ].fields.data ) ).toEqual( [ [ 'edited just now' ] ] );
	} );

	test( 'uses the title as it is currently typed in the editor', () => {
		addTitleField( 'First title' );

		renderControls();

		document.getElementById( 'title' ).value = 'Retitled before saving';

		fireEvent.click( button( 'Export' ) );

		expect( submitted[ 0 ].fields.title ).toBe( 'Retitled before saving' );
	} );

	test( 'sends an empty title when the screen has no title field', () => {
		renderControls();

		fireEvent.click( button( 'Export' ) );

		expect( submitted[ 0 ].fields.title ).toBe( '' );
	} );

	test( 'sends the name of the active sheet', () => {
		renderControls();

		act( () => dispatchRef( { type: 'SET_ACTIVE_SHEET', payload: 1 } ) );

		fireEvent.click( button( 'Export' ) );

		expect( submitted[ 0 ].fields.set_name ).toBe( 'Costs' );
	} );

	test( 'sends an empty sheet name for a sheet that has none', () => {
		renderControls();

		act( () => dispatchRef( { type: 'RENAME_SHEET', payload: { index: 0, name: '' } } ) );

		fireEvent.click( button( 'Export' ) );

		expect( submitted[ 0 ].fields.set_name ).toBe( '' );
	} );

	test.each( [ 'R&D', 'x < y > z', '"quoted" \'single\'', '<b>bold</b>', 'café €5 ±2°', '日本語', 'C:\\temp', 'two\nlines' ] )(
		'a cell, title and sheet name of %s are sent exactly',
		( text ) => {
			addTitleField( text );

			renderControls( { worksheet: fakeWorksheet( [ [ text, 1 ] ] ) } );

			act( () => dispatchRef( { type: 'RENAME_SHEET', payload: { index: 0, name: text } } ) );

			fireEvent.click( button( 'Export' ) );

			expect( JSON.parse( submitted[ 0 ].fields.data ) ).toEqual( [ [ text, 1 ] ] );
			expect( submitted[ 0 ].fields.set_name ).toBe( text );

			// The title comes from a single line text input, which cannot hold a line break
			expect( submitted[ 0 ].fields.title ).toBe( text.replace( /\n/g, '' ) );
		}
	);

	test( 'the form is in the page when it is submitted and gone afterwards', () => {
		renderControls();

		fireEvent.click( button( 'Export' ) );

		expect( submitted[ 0 ].inDocument ).toBe( true );
		expect( document.querySelector( 'form[action*="m_chart_export_csv"]' ) ).toBeNull();
	} );

	test( 'does not go through fetch, the browser has to receive the download itself', () => {
		respondWith( { success: true } );

		renderControls();

		fireEvent.click( button( 'Export' ) );

		expect( global.fetch ).not.toHaveBeenCalled();
	} );

	test( 'each click exports again', () => {
		renderControls();

		fireEvent.click( button( 'Export' ) );
		fireEvent.click( button( 'Export' ) );

		expect( submitted ).toHaveLength( 2 );
	} );

	test( 'does nothing while no sheet is mounted', () => {
		renderControls( { worksheet: null } );

		fireEvent.click( button( 'Export' ) );

		expect( submitted ).toHaveLength( 0 );
	} );
} );
