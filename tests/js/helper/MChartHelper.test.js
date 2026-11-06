/**
 * Tests for the public helpers on window.MChartHelper
 *
 * The helper is a classic script, so it is executed in this jsdom context with a Chart stub standing in for Chart.js
 */
import fs from 'fs';
import path from 'path';

beforeAll( () => {
	window.Chart = {
		helpers: {
			formatNumber: ( value, locale ) => new Intl.NumberFormat( locale || 'en-US' ).format( value ),
		},
	};

	const source = fs.readFileSync( path.resolve( __dirname, '../../../components/js/m-chart-chartjs-helper.js' ), 'utf8' );

	// Evaluate inside Jest's sandbox so the script sees this test's window and Chart globals
	new Function( source )();
} );

afterAll( () => {
	delete window.Chart;
	delete window.MChartHelper;
} );

const chart = { options: { locale: 'de-DE' } };

describe( 'MChartHelper.formatValue', () => {
	test( 'formats a parsed data point with its own affixes in the chart locale', () => {
		expect( window.MChartHelper.formatValue( chart, { value: 1234.5, prefix: '$', suffix: ' USD' } ) ).toBe( '$1.234,5 USD' );
	} );

	test( 'returns a text point as typed', () => {
		expect( window.MChartHelper.formatValue( chart, { value: null, text: 'n/a' } ) ).toBe( 'n/a' );
	} );

	test( 'formats a plain number with optional affixes', () => {
		expect( window.MChartHelper.formatValue( chart, 1000 ) ).toBe( '1.000' );
		expect( window.MChartHelper.formatValue( chart, 7, { suffix: '%' } ) ).toBe( '7%' );
	} );

	test( 'returns an empty string for nothing to show', () => {
		expect( window.MChartHelper.formatValue( chart, null ) ).toBe( '' );
		expect( window.MChartHelper.formatValue( chart, 'abc' ) ).toBe( '' );
		expect( window.MChartHelper.formatValue( chart, {} ) ).toBe( '' );
	} );
} );

describe( 'MChartHelper.dispatchRenderDone', () => {
	test( 'fires the canonical and legacy events on the element only, bubbling, with the detail', () => {
		const container = document.createElement( 'div' );
		const canvas    = document.createElement( 'canvas' );
		const other     = document.createElement( 'canvas' );

		container.appendChild( canvas );
		document.body.appendChild( container );
		document.body.appendChild( other );

		const seen = [];
		container.addEventListener( 'm_chart.render_done', ( e ) => seen.push( [ 'new', e.detail ] ) );
		container.addEventListener( 'render_done', ( e ) => seen.push( [ 'old', e.detail ] ) );
		other.addEventListener( 'm_chart.render_done', () => seen.push( [ 'other' ] ) );

		window.MChartHelper.dispatchRenderDone( canvas, { post_id: 4, instance: 1 } );

		expect( seen ).toEqual( [ [ 'new', { post_id: 4, instance: 1 } ], [ 'old', { post_id: 4, instance: 1 } ] ] );

		expect( () => window.MChartHelper.dispatchRenderDone( null, {} ) ).not.toThrow();
	} );
} );
