/**
 * Unit tests for ChartPreview's hand-off between the m_chart.render_chart filter
 * and the built-in Chart.js renderer
 *
 * A library plugin may return its own instance from the filter on one render and
 * return false on the next (M Chart Pro's Display as Table does this when the
 * toggle is turned off). Core must destroy the plugin's instance and create a
 * fresh Chart.js chart rather than calling Chart.js methods on a foreign object
 */
import { render, act } from '@testing-library/react';
import { ChartAdminProvider, useChartAdmin } from '../../../components/admin-ui-src/context/ChartAdminContext';
import ChartPreview, { defaultChartjsRender } from '../../../components/admin-ui-src/components/ChartPreview';

const ARGS_A = { type: 'line', data: { labels: [ 'a' ], datasets: [ { data: [ 1 ] } ] }, options: {} };
const ARGS_B = { type: 'bar',  data: { labels: [ 'b' ], datasets: [ { data: [ 2 ] } ] }, options: {} };

// Captures the context dispatch so tests can push new chart args into state
let dispatchRef = null;

function CaptureDispatch() {
	const { dispatch } = useChartAdmin();
	dispatchRef = dispatch;
	return null;
}

function renderPreview() {
	return render(
		<ChartAdminProvider>
			<CaptureDispatch />
			<ChartPreview />
		</ChartAdminProvider>
	);
}

function setChartArgs( args ) {
	act( () => {
		dispatchRef( { type: 'SET_CHART_ARGS', payload: args } );
	} );
}

describe( 'ChartPreview renderer hand-off', () => {
	let ChartMock;
	let instances;

	beforeEach( () => {
		dispatchRef = null;
		instances   = [];

		// Minimal stand-in for the Chart.js constructor
		ChartMock = jest.fn( function ( canvas, config ) {
			this.canvas  = canvas;
			this.config  = { type: config.type };
			this.data    = config.data;
			this.options = config.options;
			this.update  = jest.fn();
			this.destroy = jest.fn();
			instances.push( this );
		} );

		window.Chart = ChartMock;
	} );

	afterEach( () => {
		delete window.Chart;
	} );

	test( 'with no filter, the Chart.js instance is created once and then updated in place', () => {
		renderPreview();

		setChartArgs( ARGS_A );

		expect( ChartMock ).toHaveBeenCalledTimes( 1 );
		expect( instances[ 0 ].canvas ).toBeInstanceOf( HTMLCanvasElement );

		setChartArgs( ARGS_B );

		expect( ChartMock ).toHaveBeenCalledTimes( 1 );
		expect( instances[ 0 ].update ).toHaveBeenCalledTimes( 1 );
		expect( instances[ 0 ].destroy ).not.toHaveBeenCalled();
		expect( instances[ 0 ].config.type ).toBe( 'bar' );
	} );

	test( 'a filter instance is destroyed, never updated, when the filter later returns false', () => {
		const stub = { isStub: true, destroy: jest.fn(), update: jest.fn() };
		const seen = [];

		let handleRender = true;

		window.wp.hooks.addFilter(
			'm_chart.render_chart',
			'test/render',
			( handled, canvas, args, onComplete, existingInstance ) => {
				seen.push( existingInstance );

				return handleRender ? stub : false;
			}
		);

		renderPreview();

		setChartArgs( ARGS_A );

		// The filter handled the first render so Chart.js was never touched
		expect( ChartMock ).not.toHaveBeenCalled();
		expect( seen[ 0 ] ).toBeNull();

		handleRender = false;
		setChartArgs( ARGS_B );

		// The filter still receives its own previous instance so it can inspect it
		expect( seen[ 1 ] ).toBe( stub );

		// Core destroyed the stub and created a fresh Chart.js chart instead of updating the stub
		expect( stub.destroy ).toHaveBeenCalledTimes( 1 );
		expect( stub.update ).not.toHaveBeenCalled();
		expect( ChartMock ).toHaveBeenCalledTimes( 1 );
		expect( instances[ 0 ].update ).not.toHaveBeenCalled();

		// Subsequent renders update the Chart.js instance core now owns
		setChartArgs( ARGS_A );

		expect( ChartMock ).toHaveBeenCalledTimes( 1 );
		expect( instances[ 0 ].update ).toHaveBeenCalledTimes( 1 );
		expect( seen[ 2 ] ).toBe( instances[ 0 ] );
	} );

	test( 'a filter instance without a destroy method is dropped without throwing', () => {
		let handleRender = true;

		window.wp.hooks.addFilter(
			'm_chart.render_chart',
			'test/render',
			() => ( handleRender ? { isStub: true } : false )
		);

		renderPreview();
		setChartArgs( ARGS_A );

		handleRender = false;

		expect( () => setChartArgs( ARGS_B ) ).not.toThrow();
		expect( ChartMock ).toHaveBeenCalledTimes( 1 );
	} );

	test( 'the Chart.js instance is destroyed on unmount', () => {
		const { unmount } = renderPreview();

		setChartArgs( ARGS_A );
		unmount();

		expect( instances[ 0 ].destroy ).toHaveBeenCalledTimes( 1 );
	} );
} );

describe( 'defaultChartjsRender', () => {
	beforeEach( () => {
		window.Chart = jest.fn( function ( canvas, config ) {
			this.canvas  = canvas;
			this.config  = { type: config.type };
			this.data    = config.data;
			this.options = config.options;
			this.update  = jest.fn();
		} );
	} );

	afterEach( () => {
		delete window.Chart;
	} );

	test( 'creates a new instance when existingInstance is null and fills in missing datasets / labels', () => {
		const canvas     = document.createElement( 'canvas' );
		const onComplete = jest.fn();
		const instance   = defaultChartjsRender( canvas, { type: 'pie', data: { labels: null }, options: {} }, onComplete, null );

		expect( window.Chart ).toHaveBeenCalledTimes( 1 );
		expect( instance.canvas ).toBe( canvas );
		expect( instance.data.datasets ).toEqual( [] );
		expect( instance.data.labels ).toEqual( [] );
		expect( instance.options.animation.onComplete ).toBe( onComplete );
	} );

	test( 'updates the passed instance in place instead of creating another', () => {
		const canvas   = document.createElement( 'canvas' );
		const first    = defaultChartjsRender( canvas, ARGS_A, () => {}, null );
		const second   = defaultChartjsRender( canvas, ARGS_B, () => {}, first );

		expect( second ).toBe( first );
		expect( window.Chart ).toHaveBeenCalledTimes( 1 );
		expect( first.update ).toHaveBeenCalledTimes( 1 );
		expect( first.config.type ).toBe( 'bar' );
	} );

	test( 'does not mutate the chart args it is given', () => {
		const args = { type: 'line', data: { labels: [ 'a' ], datasets: [ { data: [ 1 ] } ] }, options: { plugins: {} } };
		const copy = JSON.parse( JSON.stringify( args ) );

		defaultChartjsRender( document.createElement( 'canvas' ), args, () => {}, null );

		expect( args ).toEqual( copy );
	} );

	test( 'is exposed on window.m_chart for library plugins', () => {
		// index.js only mounts the app when the admin mount points exist, so requiring it here just sets up the global
		require( '../../../components/admin-ui-src/index.js' );

		expect( window.m_chart.defaultChartjsRender ).toBe( defaultChartjsRender );
	} );
} );
