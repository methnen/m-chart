/**
 * Tests for the options JspreadsheetWrapper hands to Jspreadsheet CE
 *
 * Jspreadsheet parses any cell that starts with = as a formula unless told otherwise
 * Left on, a cell like =A1:ZZ400000 made it expand the whole range before doing anything else,
 * which froze the editor for whoever opened the chart, and every = cell displayed as #ERROR
 */
import { render } from '@testing-library/react';
import JspreadsheetWrapper from '../../../components/admin-ui-src/components/JspreadsheetWrapper';
import { ChartAdminProvider } from '../../../components/admin-ui-src/context/ChartAdminContext';

let options;

beforeEach( () => {
	options = null;

	// Stand in for the bundled library, the test only cares about what it is called with
	window.jspreadsheet = jest.fn( ( element, config ) => {
		options = config;

		return [ { getData: () => config.worksheets[ 0 ].data, getWidth: () => [], setWidth: () => {} } ];
	} );
} );

afterEach( () => {
	delete window.jspreadsheet;
} );

function mount( props = {} ) {
	return render(
		<ChartAdminProvider>
			<JspreadsheetWrapper
				sheetId={ 1 }
				sheetIndex={ 0 }
				isActive={ true }
				data={ [ [ '', 'A' ], [ '=SUM(A1)', '=A1:ZZ400000' ] ] }
				onMounted={ () => {} }
				onUnmounted={ () => {} }
				{ ...props }
			/>
		</ChartAdminProvider>
	);
}

describe( 'JspreadsheetWrapper', () => {
	test( 'turns formula parsing off so cells are only ever data', () => {
		mount();

		expect( window.jspreadsheet ).toHaveBeenCalledTimes( 1 );
		expect( options.parseFormulas ).toBe( false );
	} );

	test( 'never asks Jspreadsheet to render cells as HTML', () => {
		mount();

		expect( options.parseHTML ).toBeUndefined();
		expect( options.worksheets[ 0 ].parseHTML ).toBeUndefined();
		expect( options.worksheets[ 0 ].columns ).toBeUndefined();
	} );

	test( 'passes cell text through untouched', () => {
		mount();

		expect( options.worksheets[ 0 ].data[ 1 ] ).toEqual( [ '=SUM(A1)', '=A1:ZZ400000' ] );
	} );

	test( 'keeps formula parsing off in read-only mode too', () => {
		mount( { readOnly: true } );

		expect( options.parseFormulas ).toBe( false );
		expect( options.worksheets[ 0 ].editable ).toBe( false );
	} );
} );
