/**
 * Submit-gate integration tests for SpreadsheetMetaBox.
 *
 * Locks in the coordination logic for the cell-edit + save-click race fix
 * (commit b81cc44). The E2E spec proves end-to-end; this Jest layer proves
 * the React + DOM coordination without a real browser:
 *
 *   1. Click #publish while formEnabled === false → form.submit NOT called;
 *      data textarea IS written; pendingSubmit → true
 *   2. SET_FORM_ENABLED:true after pendingSubmit → form.submit called once
 *   3. Rapid double-click during pending → still exactly one form.submit
 *   4. Form-submit event fallback path (Cmd+S equivalent) — keyboard publish
 *      while formEnabled false is blocked at the submit event, no double-submit
 */
import { act, render } from '@testing-library/react';
import SpreadsheetMetaBox from '../../../components/admin-ui-src/components/SpreadsheetMetaBox';
import { ChartAdminProvider, useChartAdmin } from '../../../components/admin-ui-src/context/ChartAdminContext';

// Mock the heavy child components — they require Jspreadsheet and are not under
// test here. The wrapper mock reports a fake worksheet through onMounted when
// mockMount.enabled is set, otherwise it never mounts so writeDataToForm has to
// fall back to the data held in state
const mockMount = { enabled: false, worksheet: { getData: () => [ [ 'from', 'worksheet' ] ] } };

jest.mock( '../../../components/admin-ui-src/components/JspreadsheetWrapper', () => {
	const { useEffect } = require( '@wordpress/element' );

	function MockJspreadsheetWrapper( { sheetId, onMounted, onUnmounted } ) {
		useEffect( () => {
			if ( ! mockMount.enabled ) {
				return undefined;
			}

			onMounted( sheetId, mockMount.worksheet );

			return () => onUnmounted( sheetId );
		}, [] ); // eslint-disable-line react-hooks/exhaustive-deps

		return null;
	}

	return {
		__esModule: true,
		default: MockJspreadsheetWrapper,
		spreadsheetAutoWidth: () => {},
	};
} );
jest.mock( '../../../components/admin-ui-src/components/SheetTabs', () => ( {
	__esModule: true,
	default:    () => null,
} ) );
jest.mock( '../../../components/admin-ui-src/components/CsvControls', () => ( {
	__esModule: true,
	default:    () => null,
} ) );

// Capture dispatch out of the provider so tests can drive state transitions
let capturedDispatch;
function DispatchProbe() {
	const { dispatch } = useChartAdmin();
	capturedDispatch = dispatch;
	return null;
}

function setupDom() {
	document.body.innerHTML = `
		<form id="post">
			<button id="publish" type="submit">Publish</button>
			<button id="save-post" type="submit">Save Draft</button>
			<textarea name="m-chart[data]"></textarea>
		</form>
	`;

	// Spy on form.submit (jsdom doesn't actually navigate; we just observe the call)
	const form = document.getElementById( 'post' );
	form.submit = jest.fn();
	return form;
}

function renderUnderTest() {
	return render(
		<ChartAdminProvider>
			<DispatchProbe />
			<SpreadsheetMetaBox />
		</ChartAdminProvider>
	);
}

describe( 'SpreadsheetMetaBox submit gate', () => {
	let form;

	beforeEach( () => {
		form = setupDom();
		capturedDispatch = null;
		mockMount.enabled = false;
	} );

	afterEach( () => {
		document.body.innerHTML = '';
		jest.restoreAllMocks();
	} );

	test( 'click on #publish while form is disabled defers submit and sets pendingSubmit', () => {
		// Initial state has formEnabled: false (matches real boot — flipped true by
		// the first chart render). So a click in this state should engage the gate.
		renderUnderTest();

		const publishBtn = document.getElementById( 'publish' );

		// Synthesize a click and check it was preventDefaulted
		// (the click handler calls e.preventDefault when the gate engages)
		const clickEvent = new MouseEvent( 'click', { bubbles: true, cancelable: true } );
		act( () => {
			publishBtn.dispatchEvent( clickEvent );
		} );

		// Form must NOT have been submitted
		expect( form.submit ).not.toHaveBeenCalled();

		// The default action must have been prevented
		expect( clickEvent.defaultPrevented ).toBe( true );

		// The data textarea must have been written (even with empty fallback) —
		// confirms writeDataToForm ran before the gate set pendingSubmit
		const textarea = form.querySelector( 'textarea[name="m-chart[data]"]' );
		expect( textarea.value ).not.toBe( '' );
	} );

	test( 'SET_FORM_ENABLED true after pending state triggers exactly one form.submit', () => {
		renderUnderTest();

		const publishBtn = document.getElementById( 'publish' );

		// Engage the gate
		act( () => {
			publishBtn.dispatchEvent( new MouseEvent( 'click', { bubbles: true, cancelable: true } ) );
		} );

		expect( form.submit ).not.toHaveBeenCalled();

		// Flip formEnabled — the useEffect at SpreadsheetMetaBox.js:79-92 should
		// observe both flags true and call form.submit exactly once
		act( () => {
			capturedDispatch( { type: 'SET_FORM_ENABLED', payload: true } );
		} );

		expect( form.submit ).toHaveBeenCalledTimes( 1 );
	} );

	test( 'rapid double-click while pending still yields exactly one form.submit', () => {
		renderUnderTest();

		const publishBtn = document.getElementById( 'publish' );

		// Two clicks in quick succession — the second should also be gated
		// (formEnabled is still false from the initial state)
		act( () => {
			publishBtn.dispatchEvent( new MouseEvent( 'click', { bubbles: true, cancelable: true } ) );
			publishBtn.dispatchEvent( new MouseEvent( 'click', { bubbles: true, cancelable: true } ) );
		} );

		expect( form.submit ).not.toHaveBeenCalled();

		// One transition to enabled — one auto-submit
		act( () => {
			capturedDispatch( { type: 'SET_FORM_ENABLED', payload: true } );
		} );

		expect( form.submit ).toHaveBeenCalledTimes( 1 );
	} );

	test( 'form submit event while disabled is blocked (Cmd+S / keyboard publish path)', () => {
		renderUnderTest();

		// Dispatch a submit event directly on the form — this is the path
		// keyboard-driven publish (Cmd/Ctrl+S) takes, bypassing the button click
		const submitEvent = new Event( 'submit', { bubbles: true, cancelable: true } );
		act( () => {
			form.dispatchEvent( submitEvent );
		} );

		// The fallback listener at SpreadsheetMetaBox.js:126-147 should preventDefault
		// when formEnabled is false — blocking the submit
		expect( submitEvent.defaultPrevented ).toBe( true );
		expect( form.submit ).not.toHaveBeenCalled();
	} );

	test( 'writeDataToForm falls back to the data in state when a worksheet is not mounted', () => {
		renderUnderTest();

		act( () => {
			document.getElementById( 'publish' ).dispatchEvent( new MouseEvent( 'click', { bubbles: true, cancelable: true } ) );
		} );

		const textarea = form.querySelector( 'textarea[name="m-chart[data]"]' );

		// setup.js seeds spreadsheet_data as [ [ [ '' ] ] ]
		expect( JSON.parse( textarea.value ) ).toEqual( [ [ [ '' ] ] ] );
	} );

	test( 'writeDataToForm reads mounted worksheets and fires m_chart.before_submit', () => {
		mockMount.enabled = true;

		const beforeSubmit = jest.fn();
		window.wp.hooks.addAction( 'm_chart.before_submit', 'test/before', beforeSubmit );

		renderUnderTest();

		act( () => {
			document.getElementById( 'publish' ).dispatchEvent( new MouseEvent( 'click', { bubbles: true, cancelable: true } ) );
		} );

		const textarea = form.querySelector( 'textarea[name="m-chart[data]"]' );

		expect( JSON.parse( textarea.value ) ).toEqual( [ [ [ 'from', 'worksheet' ] ] ] );
		expect( beforeSubmit ).toHaveBeenCalledWith( 0, form );
	} );

	test( 'm_chart.spreadsheet_mounted / unmounted fire with the sheet index', () => {
		mockMount.enabled = true;

		const mounted   = jest.fn();
		const unmounted = jest.fn();
		window.wp.hooks.addAction( 'm_chart.spreadsheet_mounted',   'test/mounted',   mounted );
		window.wp.hooks.addAction( 'm_chart.spreadsheet_unmounted', 'test/unmounted', unmounted );

		renderUnderTest();

		expect( mounted ).toHaveBeenCalledTimes( 1 );
		expect( mounted ).toHaveBeenCalledWith( 0, 0, mockMount.worksheet );

		// Replacing the sheets gives every worksheet a fresh id, so each remounts exactly once
		act( () => {
			capturedDispatch( {
				type: 'REPLACE_SHEETS',
				payload: { sets: [ [ [ 'a' ] ], [ [ 'b' ] ] ], setNames: [ 'A', 'B' ] },
			} );
		} );

		expect( unmounted ).toHaveBeenCalledTimes( 1 );
		expect( mounted ).toHaveBeenCalledTimes( 3 );
		expect( mounted.mock.calls[ 1 ][ 1 ] ).toBe( 0 );
		expect( mounted.mock.calls[ 2 ][ 1 ] ).toBe( 1 );
	} );
} );
