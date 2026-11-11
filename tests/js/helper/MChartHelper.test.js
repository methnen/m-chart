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

describe( 'MChartHelper.isSafeSourceUrl', () => {
	test.each( [
		'https://example.com/report?a=1&b=2#top',
		'http://example.com/',
		'mailto:someone@example.com',
		'/reports/2026/',
		'reports/2026.html',
	] )( 'allows %s', ( url ) => {
		expect( window.MChartHelper.isSafeSourceUrl( url ) ).toBe( true );
	} );

	test.each( [
		'javascript:alert(document.domain)',
		' javascript:alert(1)',
		'JaVaScRiPt:alert(1)',
		'java\tscript:alert(1)',
		'data:text/html,<script>alert(1)</script>',
		'vbscript:msgbox(1)',
		'blob:https://example.com/1234',
		'',
		'   ',
		null,
		undefined,
		[ 'https://example.com' ],
	] )( 'refuses %p', ( url ) => {
		expect( window.MChartHelper.isSafeSourceUrl( url ) ).toBe( false );
	} );
} );

describe( 'MChartHelper.afterEvent source link', () => {
	const bounds = { left: 10, right: 110, top: 380, bottom: 396 };

	function chartWith( sourceUrl ) {
		return {
			canvas:              { style: { cursor: '' } },
			$mchartSourceBounds: bounds,
			options:             { plugins: {
				'm-chart-helper': { labels_pos: 'first_column' },
				mchart:           { include_source: true, source: 'Source name', source_url: sourceUrl },
			} },
		};
	}

	let open;

	beforeEach( () => {
		open = jest.spyOn( window, 'open' ).mockReturnValue( { opener: {} } );
	} );

	afterEach( () => {
		open.mockRestore();
	} );

	test( 'opens an ordinary link in a new tab with no opener', () => {
		window.MChartHelper.afterEvent( chartWith( 'https://example.com/report' ), { event: { type: 'click', x: 50, y: 388 } } );

		expect( open ).toHaveBeenCalledWith( 'https://example.com/report', '_blank', 'noopener,noreferrer' );
	} );

	test( 'does not hand a javascript: link to the browser', () => {
		window.MChartHelper.afterEvent( chartWith( 'javascript:alert(document.domain)' ), { event: { type: 'click', x: 50, y: 388 } } );

		expect( open ).not.toHaveBeenCalled();
	} );

	test( 'only shows the pointer for a link that will open', () => {
		const safe   = chartWith( 'https://example.com/report' );
		const unsafe = chartWith( 'javascript:alert(1)' );

		window.MChartHelper.afterEvent( safe, { event: { type: 'mousemove', x: 50, y: 388 } } );
		window.MChartHelper.afterEvent( unsafe, { event: { type: 'mousemove', x: 50, y: 388 } } );

		expect( safe.canvas.style.cursor ).toBe( 'pointer' );
		expect( unsafe.canvas.style.cursor ).toBe( '' );
	} );
} );

describe( 'MChartHelper.afterDraw source line', () => {
	// Chart text is painted onto the canvas character for character, so what PHP sends is what has to arrive at fillText
	test.each( [
		'R&D',
		'x < y > z',
		'"quoted" \'single\'',
		'&amp;',
		'<b>bold</b>',
		'café €5 ±2°',
		'日本語',
		'C:\\temp',
		'<script>alert(1)</script>',
	] )( 'paints %s exactly as given', ( source ) => {
		const ctx = {
			save:        jest.fn(),
			restore:     jest.fn(),
			fillText:    jest.fn(),
			measureText: () => ( { width: 100 } ),
		};

		const chart = {
			ctx,
			width:   600,
			height:  400,
			options: { plugins: {
				'm-chart-helper': { labels_pos: 'first_column' },
				mchart:           { include_source: true, source },
			} },
		};

		window.MChartHelper.afterDraw( chart );

		expect( ctx.fillText ).toHaveBeenCalledTimes( 1 );
		expect( ctx.fillText.mock.calls[ 0 ][ 0 ] ).toBe( source );
	} );
} );
