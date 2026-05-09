/**
 * Pure reducer tests for ChartAdminContext.
 *
 * The reducer is the data-flow contract for the admin UI — every state mutation
 * goes through it. Coverage threshold is configured to ≥95% lines/functions
 * for this file in jest.config.js.
 */
import { reducer } from '../../../components/admin-ui-src/context/ChartAdminContext';

const baseState = {
	postMeta: { type: 'line', height: 400 },
	spreadsheetData: [ [ [ 'A', 1 ], [ 'B', 2 ] ] ],
	setNames: [ 'Sheet 1' ],
	sheetIds: [ 0 ],
	nextSheetId: 1,
	activeSheet: 0,
	newSheetId: null,
	chartArgs: null,
	isRefreshing: false,
	formEnabled: false,
	pendingSubmit: false,
	sheetEditingDisabled: false,
};

describe( 'ChartAdminContext reducer', () => {
	test( 'unknown action returns state unchanged', () => {
		const next = reducer( baseState, { type: 'UNKNOWN' } );
		expect( next ).toBe( baseState );
	} );

	test( 'SET_POST_META merges (does not replace) postMeta', () => {
		const next = reducer( baseState, {
			type: 'SET_POST_META',
			payload: { theme: '_default' },
		} );

		expect( next.postMeta ).toEqual( {
			type:   'line',
			height: 400,
			theme:  '_default',
		} );
	} );

	test( 'SET_SHEET_DATA replaces a single sheet and disables form', () => {
		const next = reducer( baseState, {
			type: 'SET_SHEET_DATA',
			payload: { index: 0, data: [ [ 'X', 99 ] ] },
		} );

		expect( next.spreadsheetData[ 0 ] ).toEqual( [ [ 'X', 99 ] ] );
		expect( next.formEnabled ).toBe( false );
	} );

	test( 'ADD_SHEET appends new sheet, ID, name, and activates it', () => {
		const next = reducer( baseState, {
			type: 'ADD_SHEET',
			payload: { name: 'Sheet 2' },
		} );

		expect( next.spreadsheetData ).toHaveLength( 2 );
		expect( next.setNames ).toEqual( [ 'Sheet 1', 'Sheet 2' ] );
		expect( next.sheetIds ).toEqual( [ 0, 1 ] );
		expect( next.nextSheetId ).toBe( 2 );
		expect( next.activeSheet ).toBe( 1 );
		expect( next.newSheetId ).toBe( 1 );
	} );

	test( 'CLEAR_NEW_SHEET_ID resets newSheetId to null', () => {
		const next = reducer(
			{ ...baseState, newSheetId: 1 },
			{ type: 'CLEAR_NEW_SHEET_ID' }
		);

		expect( next.newSheetId ).toBeNull();
	} );

	test( 'DELETE_SHEET no-op when only one sheet remains', () => {
		const next = reducer( baseState, {
			type: 'DELETE_SHEET',
			payload: { index: 0 },
		} );

		// Single-sheet guard: state should be unchanged
		expect( next ).toBe( baseState );
	} );

	test( 'DELETE_SHEET removes target and clamps activeSheet', () => {
		const multi = {
			...baseState,
			spreadsheetData: [ [], [], [] ],
			setNames: [ 'A', 'B', 'C' ],
			sheetIds: [ 0, 1, 2 ],
			activeSheet: 2,
		};

		const next = reducer( multi, {
			type: 'DELETE_SHEET',
			payload: { index: 2 },
		} );

		expect( next.spreadsheetData ).toHaveLength( 2 );
		expect( next.setNames ).toEqual( [ 'A', 'B' ] );
		expect( next.sheetIds ).toEqual( [ 0, 1 ] );
		expect( next.activeSheet ).toBe( 1 );
	} );

	test( 'RENAME_SHEET updates a single set name by index', () => {
		const next = reducer( baseState, {
			type: 'RENAME_SHEET',
			payload: { index: 0, name: 'Renamed' },
		} );

		expect( next.setNames ).toEqual( [ 'Renamed' ] );
	} );

	test( 'SET_ACTIVE_SHEET updates activeSheet index', () => {
		const next = reducer( baseState, { type: 'SET_ACTIVE_SHEET', payload: 5 } );
		expect( next.activeSheet ).toBe( 5 );
	} );

	test( 'SET_CHART_ARGS replaces chart args', () => {
		const args = { data: { datasets: [] }, options: {} };
		const next = reducer( baseState, { type: 'SET_CHART_ARGS', payload: args } );
		expect( next.chartArgs ).toBe( args );
	} );

	test( 'SET_REFRESHING toggles isRefreshing flag', () => {
		const next = reducer( baseState, { type: 'SET_REFRESHING', payload: true } );
		expect( next.isRefreshing ).toBe( true );
	} );

	test( 'SET_FORM_ENABLED toggles formEnabled flag', () => {
		const next = reducer( baseState, { type: 'SET_FORM_ENABLED', payload: true } );
		expect( next.formEnabled ).toBe( true );
	} );

	test( 'SET_PENDING_SUBMIT toggles pendingSubmit flag', () => {
		const next = reducer( baseState, { type: 'SET_PENDING_SUBMIT', payload: true } );
		expect( next.pendingSubmit ).toBe( true );
	} );

	test( 'SET_SHEET_EDITING_DISABLED toggles flag', () => {
		const next = reducer( baseState, {
			type: 'SET_SHEET_EDITING_DISABLED',
			payload: true,
		} );

		expect( next.sheetEditingDisabled ).toBe( true );
	} );

	test( 'SET_SUBTITLE updates postMeta.subtitle without clobbering siblings', () => {
		const next = reducer( baseState, {
			type: 'SET_SUBTITLE',
			payload: 'New Subtitle',
		} );

		expect( next.postMeta.subtitle ).toBe( 'New Subtitle' );
		expect( next.postMeta.type ).toBe( 'line' );
		expect( next.postMeta.height ).toBe( 400 );
	} );
} );
