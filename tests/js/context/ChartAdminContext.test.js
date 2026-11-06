/**
 * Pure reducer tests for ChartAdminContext.
 *
 * The reducer is the data-flow contract for the admin UI — every state mutation
 * goes through it. Coverage threshold is configured to ≥95% lines/functions
 * for this file in jest.config.js.
 */
import { render, act } from '@testing-library/react';
import { reducer, ChartAdminProvider, useChartAdmin, setFormEnabled, initChartAdminState } from '../../../components/admin-ui-src/context/ChartAdminContext';

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

describe( 'ChartAdminProvider form actions', () => {
	let dispatchRef;

	function Capture() {
		dispatchRef = useChartAdmin().dispatch;
		return null;
	}

	test( 'fires m_chart.form_enabled / form_disabled once per change, not on mount', () => {
		const enabled  = jest.fn();
		const disabled = jest.fn();

		window.wp.hooks.addAction( 'm_chart.form_enabled',  'test/enabled',  enabled );
		window.wp.hooks.addAction( 'm_chart.form_disabled', 'test/disabled', disabled );

		render( <ChartAdminProvider><Capture /></ChartAdminProvider> );

		expect( enabled ).not.toHaveBeenCalled();
		expect( disabled ).not.toHaveBeenCalled();

		act( () => dispatchRef( { type: 'SET_FORM_ENABLED', payload: true } ) );
		expect( enabled ).toHaveBeenCalledTimes( 1 );
		expect( enabled ).toHaveBeenCalledWith( 0 );

		// Same value again is not a change
		act( () => dispatchRef( { type: 'SET_FORM_ENABLED', payload: true } ) );
		expect( enabled ).toHaveBeenCalledTimes( 1 );

		act( () => dispatchRef( { type: 'SET_FORM_ENABLED', payload: false } ) );
		expect( disabled ).toHaveBeenCalledTimes( 1 );
	} );

	test( 'window-level setFormEnabled dispatches through the mounted provider', () => {
		const enabled = jest.fn();

		window.wp.hooks.addAction( 'm_chart.form_enabled', 'test/enabled', enabled );

		const { unmount } = render( <ChartAdminProvider><Capture /></ChartAdminProvider> );

		act( () => setFormEnabled( true ) );
		expect( enabled ).toHaveBeenCalledTimes( 1 );

		unmount();

		// Safe to call with nothing mounted
		expect( () => setFormEnabled( false ) ).not.toThrow();
	} );
} );

describe( 'm_chart.chart_args filter', () => {
	const stateWithArgs = { ...baseState, postId: 7, baseChartArgs: null };

	test( 'SET_CHART_ARGS stores the raw args and the filtered args separately', () => {
		window.wp.hooks.addFilter( 'm_chart.chart_args', 'test/args', ( args, context ) => ( {
			...args,
			annotations: [ 'a' ],
			seen: context,
		} ) );

		const raw  = { type: 'line' };
		const next = reducer( stateWithArgs, { type: 'SET_CHART_ARGS', payload: raw } );

		expect( next.baseChartArgs ).toBe( raw );
		expect( next.chartArgs.annotations ).toEqual( [ 'a' ] );
		expect( next.chartArgs.seen ).toEqual( { postId: 7, postMeta: baseState.postMeta, source: 'refresh' } );
	} );

	test( 'SET_CHART_ARGS passes an explicit source through', () => {
		const sources = [];
		window.wp.hooks.addFilter( 'm_chart.chart_args', 'test/args', ( args, { source } ) => {
			sources.push( source );
			return args;
		} );

		reducer( stateWithArgs, { type: 'SET_CHART_ARGS', payload: { type: 'bar' }, source: 'initial' } );

		expect( sources ).toEqual( [ 'initial' ] );
	} );

	test( 'REAPPLY_CHART_ARGS re-runs the filter on the stored base', () => {
		let extra = 1;
		window.wp.hooks.addFilter( 'm_chart.chart_args', 'test/args', ( args ) => ( { ...args, extra } ) );

		const first = reducer( stateWithArgs, { type: 'SET_CHART_ARGS', payload: { type: 'line' } } );
		expect( first.chartArgs.extra ).toBe( 1 );

		extra = 2;
		const second = reducer( first, { type: 'REAPPLY_CHART_ARGS' } );

		expect( second.chartArgs.extra ).toBe( 2 );
		expect( second.baseChartArgs ).toBe( first.baseChartArgs );
		expect( second.chartArgs ).not.toBe( first.chartArgs );
		expect( second.formEnabled ).toBe( false );
	} );

	test( 'REAPPLY_CHART_ARGS gates the form only when the args actually changed', () => {
		const enabled = { ...stateWithArgs, formEnabled: true };
		const first   = { ...reducer( enabled, { type: 'SET_CHART_ARGS', payload: { type: 'line' } } ), formEnabled: true };

		// No filter, same args: nothing to render, Save stays available
		expect( reducer( first, { type: 'REAPPLY_CHART_ARGS' } ).formEnabled ).toBe( true );

		window.wp.hooks.addFilter( 'm_chart.chart_args', 'test/args', ( args ) => ( { ...args, changed: true } ) );

		expect( reducer( first, { type: 'REAPPLY_CHART_ARGS' } ).formEnabled ).toBe( false );
	} );

	test( 'REAPPLY_CHART_ARGS returns the same state when nothing changes the args', () => {
		const first  = reducer( stateWithArgs, { type: 'SET_CHART_ARGS', payload: { type: 'line' } } );
		const second = reducer( first, { type: 'REAPPLY_CHART_ARGS' } );

		expect( second ).toBe( first );
	} );

	test( 'a filter that edits the args in place leaves the base untouched', () => {
		window.wp.hooks.addFilter( 'm_chart.chart_args', 'test/args', ( args ) => {
			args.options.mutated = true;
			return args;
		} );

		const raw  = { type: 'line', options: { plugins: {} } };
		const next = reducer( stateWithArgs, { type: 'SET_CHART_ARGS', payload: raw } );

		expect( next.chartArgs.options.mutated ).toBe( true );
		expect( next.baseChartArgs ).toBe( raw );
		expect( raw.options.mutated ).toBeUndefined();

		// A reapply runs the filter on a fresh copy and still hands the preview new args
		const again = reducer( { ...next, formEnabled: true }, { type: 'REAPPLY_CHART_ARGS' } );

		expect( again.chartArgs ).not.toBe( next.chartArgs );
		expect( again.chartArgs.options.mutated ).toBe( true );
		expect( again.formEnabled ).toBe( false );

		// Removing the filter and reapplying gets the unfiltered args back
		// As a copy, wp.hooks keeps the hook entry once a filter was registered so hasFilter() stays true
		window.wp.hooks.removeFilter( 'm_chart.chart_args', 'test/args' );
		const restored = reducer( again, { type: 'REAPPLY_CHART_ARGS' } );

		expect( restored.chartArgs ).toEqual( raw );
		expect( restored.chartArgs.options.mutated ).toBeUndefined();
	} );

	test( 'callbacks inside the args survive the copy handed to filters', () => {
		const onClick = () => {};
		window.wp.hooks.addFilter( 'm_chart.chart_args', 'test/args', ( args ) => args );

		const next = reducer( stateWithArgs, { type: 'SET_CHART_ARGS', payload: { type: 'line', options: { onClick } } } );

		expect( next.chartArgs ).not.toBe( next.baseChartArgs );
		expect( next.chartArgs.options.onClick ).toBe( onClick );
	} );

	test( 'without a filter the rendered args are the raw args', () => {
		const raw  = { type: 'pie' };
		const next = reducer( stateWithArgs, { type: 'SET_CHART_ARGS', payload: raw } );

		expect( next.chartArgs ).toBe( raw );
	} );

	test( 'the lazy initialiser filters the PHP seeded args at mount time', () => {
		window.wp.hooks.addFilter( 'm_chart.chart_args', 'test/args', ( args, { source } ) => ( { ...args, source } ) );

		const seed = { ...stateWithArgs, chartArgs: { type: 'line' } };
		const init = initChartAdminState( seed );

		expect( init.baseChartArgs ).toBe( seed.chartArgs );
		expect( init.chartArgs.source ).toBe( 'initial' );
	} );

	test( 'a filter registered after mount can ask for a reapply through the provider', () => {
		let dispatchRef;
		let latest;

		function Capture() {
			const { state, dispatch } = useChartAdmin();
			dispatchRef = dispatch;
			latest      = state;
			return null;
		}

		render( <ChartAdminProvider><Capture /></ChartAdminProvider> );

		act( () => dispatchRef( { type: 'SET_CHART_ARGS', payload: { type: 'line' } } ) );
		expect( latest.chartArgs ).toEqual( { type: 'line' } );

		window.wp.hooks.addFilter( 'm_chart.chart_args', 'test/late', ( args ) => ( { ...args, late: true } ) );
		act( () => dispatchRef( { type: 'REAPPLY_CHART_ARGS' } ) );

		expect( latest.chartArgs ).toEqual( { type: 'line', late: true } );
		expect( latest.baseChartArgs ).toEqual( { type: 'line' } );
	} );
} );

describe( 'REPLACE_SHEETS', () => {
	const twoSheets = {
		...baseState,
		spreadsheetData: [ [ [ 'a' ] ], [ [ 'b' ] ] ],
		setNames: [ 'One', 'Two' ],
		sheetIds: [ 0, 1 ],
		nextSheetId: 2,
		activeSheet: 1,
		newSheetId: 1,
		formEnabled: true,
	};

	test( 'replaces data and names, regenerates ids, clamps the active sheet and leaves rename mode', () => {
		const next = reducer( twoSheets, {
			type: 'REPLACE_SHEETS',
			payload: {
				sets:        [ [ [ 'x', 1 ] ], [ [ 'y', 2 ] ], [ [ 'z', 3 ] ] ],
				setNames:    [ 'X', 'Y' ],
				activeSheet: 9,
			},
		} );

		expect( next.spreadsheetData ).toEqual( [ [ [ 'x', 1 ] ], [ [ 'y', 2 ] ], [ [ 'z', 3 ] ] ] );
		expect( next.setNames ).toEqual( [ 'X', 'Y', '' ] );
		expect( next.sheetIds ).toEqual( [ 2, 3, 4 ] );
		expect( next.nextSheetId ).toBe( 5 );
		expect( next.activeSheet ).toBe( 2 );
		expect( next.newSheetId ).toBeNull();
		expect( next.formEnabled ).toBe( false );
	} );

	test( 'defaults the active sheet to 0 and tolerates an empty payload', () => {
		const next = reducer( twoSheets, { type: 'REPLACE_SHEETS', payload: {} } );

		expect( next.spreadsheetData ).toEqual( [ [ [ '' ] ] ] );
		expect( next.setNames ).toEqual( [ '' ] );
		expect( next.sheetIds ).toEqual( [ 2 ] );
		expect( next.activeSheet ).toBe( 0 );
	} );
} );
