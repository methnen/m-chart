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

const germanChart = { options: { locale: 'de-DE' } };

describe( 'MChartHelper.formatValue', () => {
	test( 'formats a parsed data point with its own affixes in the chart locale', () => {
		expect( window.MChartHelper.formatValue( germanChart, { value: 1234.5, prefix: '$', suffix: ' USD' } ) ).toBe( '$1.234,5 USD' );
	} );

	test( 'returns a text point as typed', () => {
		expect( window.MChartHelper.formatValue( germanChart, { value: null, text: 'n/a' } ) ).toBe( 'n/a' );
	} );

	test( 'formats a plain number with optional affixes', () => {
		expect( window.MChartHelper.formatValue( germanChart, 1000 ) ).toBe( '1.000' );
		expect( window.MChartHelper.formatValue( germanChart, 7, { suffix: '%' } ) ).toBe( '7%' );
	} );

	test( 'returns an empty string for nothing to show', () => {
		expect( window.MChartHelper.formatValue( germanChart, null ) ).toBe( '' );
		expect( window.MChartHelper.formatValue( germanChart, 'abc' ) ).toBe( '' );
		expect( window.MChartHelper.formatValue( germanChart, {} ) ).toBe( '' );
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

/*
 * The plugin hooks, driven the way Chart.js drives them but with small stand-in chart objects
 */

// A canvas context that measures every character as 10px wide and remembers the font each measurement was taken in
function fakeContext() {
	const ctx = {
		font:      '',
		measured:  [],
		save:      jest.fn(),
		restore:   jest.fn(),
		beginPath: jest.fn(),
		rect:      jest.fn(),
		clip:      jest.fn(),
		fillText:  jest.fn(),
		measureText( text ) {
			ctx.measured.push( { text, font: ctx.font } );

			return { width: text.length * 10 };
		},
	};

	return ctx;
}

/**
 * A stand-in for an M Chart Chart.js instance
 *
 * @param {string} type            The native Chart.js type
 * @param {Object} setup
 * @param {Object} setup.data      Chart.js data object
 * @param {string} setup.labelsPos labels_pos as PHP writes it into the helper's options
 * @param {string} setup.locale    BCP 47 locale
 * @param {Object} setup.scales    options.scales
 * @param {Object} setup.plugins   Extra options.plugins blocks
 * @return {Object} The chart
 */
function mChart( type, { data = { labels: [], datasets: [] }, labelsPos = 'first_column', locale = 'en-US', scales, plugins = {} } = {} ) {
	return {
		config:  { type, data, options: {} },
		data,
		options: {
			locale,
			scales,
			plugins: {
				'm-chart-helper': { labels_pos: labelsPos },
				tooltip:          {},
				datalabels:       {},
				...plugins,
			},
		},
	};
}

// A tooltip item for one data point, shaped like the ones Chart.js hands to tooltip callbacks
function tooltipItem( chart, datasetIndex, dataIndex, extra = {} ) {
	const dataset = chart.data.datasets[ datasetIndex ];
	const raw     = dataset.data[ dataIndex ];

	return {
		chart,
		dataset,
		datasetIndex,
		dataIndex,
		raw,
		label:  chart.data.labels?.[ dataIndex ],
		parsed: raw && 'object' === typeof raw ? { x: raw.x, y: raw.y } : { y: raw },
		...extra,
	};
}

function tooltipLabel( chart, datasetIndex = 0, dataIndex = 0, extra = {} ) {
	return chart.options.plugins.tooltip.callbacks.label( tooltipItem( chart, datasetIndex, dataIndex, extra ) );
}

function tooltipTitle( chart, datasetIndex = 0, dataIndex = 0, extra = {} ) {
	return chart.options.plugins.tooltip.callbacks.title( [ tooltipItem( chart, datasetIndex, dataIndex, extra ) ] );
}

describe( 'MChartHelper.beforeLayout title and subtitle wrapping', () => {
	const LONG_TITLE = 'Quarterly revenue by sales region';

	/**
	 * A chart about to be laid out
	 * At the default width of 232 with 16px of padding either side, 20 characters fit on a line
	 *
	 * @param {Object} setup
	 * @param {*}      setup.title    Title text, or a whole title options block
	 * @param {*}      setup.subtitle Subtitle text, or a whole subtitle options block
	 * @param {number} setup.width    Chart width in pixels
	 * @param {*}      setup.padding  options.layout.padding, undefined leaves the layout block out
	 * @return {Object} The chart
	 */
	function layoutChart( { title = '', subtitle = '', width = 232, padding = 16 } = {} ) {
		const block = ( value ) => ( value && 'object' === typeof value && ! Array.isArray( value ) ? value : { display: true, text: value } );

		const chart = mChart( 'line', { plugins: { title: block( title ), subtitle: block( subtitle ) } } );

		chart.ctx   = fakeContext();
		chart.width = width;

		if ( undefined !== padding ) {
			chart.options.layout = { padding };
		}

		return chart;
	}

	function titleOf( chart ) {
		return chart.options.plugins.title.text;
	}

	function subtitleOf( chart ) {
		return chart.options.plugins.subtitle.text;
	}

	test( 'a title that fits is left as a single line', () => {
		const chart = layoutChart( { title: 'Revenue by region' } );

		window.MChartHelper.beforeLayout( chart );

		expect( titleOf( chart ) ).toBe( 'Revenue by region' );
	} );

	test( 'a title that fits exactly is not wrapped', () => {
		// 20 characters in a 200px line
		const chart = layoutChart( { title: 'Quarterly revenue by' } );

		window.MChartHelper.beforeLayout( chart );

		expect( titleOf( chart ) ).toBe( 'Quarterly revenue by' );
	} );

	test( 'a title too long for the chart is broken into lines at word boundaries', () => {
		const chart = layoutChart( { title: LONG_TITLE } );

		window.MChartHelper.beforeLayout( chart );

		expect( titleOf( chart ) ).toEqual( [ 'Quarterly revenue by', 'sales region' ] );
	} );

	test( 'every wrapped line fits and no word is lost or split', () => {
		const text  = 'Average household energy use per person across every surveyed region in 2026';
		const chart = layoutChart( { title: text } );

		window.MChartHelper.beforeLayout( chart );

		const lines = titleOf( chart );

		expect( lines.length ).toBeGreaterThan( 2 );
		expect( lines.every( ( line ) => line.length * 10 <= 200 ) ).toBe( true );
		expect( lines.join( ' ' ) ).toBe( text );
	} );

	test( 'the subtitle is wrapped the same way', () => {
		const chart = layoutChart( { title: 'Revenue', subtitle: LONG_TITLE } );

		window.MChartHelper.beforeLayout( chart );

		expect( titleOf( chart ) ).toBe( 'Revenue' );
		expect( subtitleOf( chart ) ).toEqual( [ 'Quarterly revenue by', 'sales region' ] );
	} );

	test( 'title and subtitle are wrapped independently', () => {
		const chart = layoutChart( { title: LONG_TITLE, subtitle: 'Fiscal year 2026' } );

		window.MChartHelper.beforeLayout( chart );

		expect( titleOf( chart ) ).toEqual( [ 'Quarterly revenue by', 'sales region' ] );
		expect( subtitleOf( chart ) ).toBe( 'Fiscal year 2026' );
	} );

	test( 'a narrower chart gets more lines', () => {
		// 100px of room, 10 characters to a line
		const chart = layoutChart( { title: LONG_TITLE, width: 132 } );

		window.MChartHelper.beforeLayout( chart );

		expect( titleOf( chart ) ).toEqual( [ 'Quarterly', 'revenue by', 'sales', 'region' ] );
	} );

	test( 'a wrapped title goes back to one line when the chart is made wide enough', () => {
		const chart = layoutChart( { title: LONG_TITLE } );

		window.MChartHelper.beforeLayout( chart );

		chart.width = 600;

		window.MChartHelper.beforeLayout( chart );

		expect( titleOf( chart ) ).toBe( LONG_TITLE );
	} );

	test( 'resizing re-wraps from the original text, not from the lines of the last wrap', () => {
		const chart = layoutChart( { title: LONG_TITLE, width: 132 } );

		window.MChartHelper.beforeLayout( chart );

		chart.width = 232;

		window.MChartHelper.beforeLayout( chart );

		expect( titleOf( chart ) ).toEqual( [ 'Quarterly revenue by', 'sales region' ] );

		chart.width = 132;

		window.MChartHelper.beforeLayout( chart );

		expect( titleOf( chart ) ).toEqual( [ 'Quarterly', 'revenue by', 'sales', 'region' ] );
	} );

	test( 'laying out twice at the same width gives the same lines', () => {
		const chart = layoutChart( { title: LONG_TITLE } );

		window.MChartHelper.beforeLayout( chart );
		window.MChartHelper.beforeLayout( chart );

		expect( titleOf( chart ) ).toEqual( [ 'Quarterly revenue by', 'sales region' ] );
	} );

	test( 'a new title set after a wrap replaces the old one', () => {
		const chart = layoutChart( { title: LONG_TITLE } );

		window.MChartHelper.beforeLayout( chart );

		// The editor hands the chart its new title as a plain string
		chart.options.plugins.title.text = 'Headcount by office and year';

		window.MChartHelper.beforeLayout( chart );

		expect( titleOf( chart ) ).toEqual( [ 'Headcount by office', 'and year' ] );

		chart.width = 600;

		window.MChartHelper.beforeLayout( chart );

		expect( titleOf( chart ) ).toBe( 'Headcount by office and year' );
	} );

	test.each( [
		[ 'a number for every side', 26, [ 'Quarterly revenue', 'by' ] ],
		[ 'left and right values', { top: 0, right: 30, bottom: 0, left: 22 }, [ 'Quarterly revenue', 'by' ] ],
		[ 'an x shorthand', { x: 26 }, [ 'Quarterly revenue', 'by' ] ],
		[ 'only top and bottom values', { top: 40, bottom: 40 }, 'Quarterly revenue by' ],
		[ 'nothing, which means the default 16px either side', undefined, 'Quarterly revenue by' ],
	] )( 'the layout padding is taken off the room for text when it is %s', ( description, padding, expected ) => {
		// The title needs 200px, the chart is 232px wide
		const chart = layoutChart( { title: 'Quarterly revenue by', padding } );

		window.MChartHelper.beforeLayout( chart );

		expect( titleOf( chart ) ).toEqual( expected );
	} );

	test( 'a single word wider than the chart is left on one line rather than split', () => {
		const chart = layoutChart( { title: 'Supercalifragilisticexpialidocious' } );

		window.MChartHelper.beforeLayout( chart );

		expect( titleOf( chart ) ).toBe( 'Supercalifragilisticexpialidocious' );
	} );

	test( 'an over-long word gets a line to itself and the rest wraps around it', () => {
		const chart = layoutChart( { title: 'Annual Supercalifragilisticexpialidocious index' } );

		window.MChartHelper.beforeLayout( chart );

		expect( titleOf( chart ) ).toEqual( [ 'Annual', 'Supercalifragilisticexpialidocious', 'index' ] );
	} );

	test( 'multi-line text supplied by something else is left exactly as it is', () => {
		const lines = [ 'A first line that is far too long to fit', 'Second line' ];
		const chart = layoutChart( { title: lines } );

		window.MChartHelper.beforeLayout( chart );

		expect( titleOf( chart ) ).toBe( lines );
		expect( titleOf( chart ) ).toEqual( [ 'A first line that is far too long to fit', 'Second line' ] );
	} );

	test( 'a title that is switched off is not touched', () => {
		const chart = layoutChart( { title: { display: false, text: LONG_TITLE } } );

		window.MChartHelper.beforeLayout( chart );

		expect( titleOf( chart ) ).toBe( LONG_TITLE );
	} );

	test.each( [ '', undefined, null ] )( 'an empty title of %p is harmless', ( text ) => {
		const chart = layoutChart( { title: { display: true, text }, subtitle: LONG_TITLE } );

		expect( () => window.MChartHelper.beforeLayout( chart ) ).not.toThrow();

		// The subtitle is still handled
		expect( subtitleOf( chart ) ).toEqual( [ 'Quarterly revenue by', 'sales region' ] );
	} );

	test( 'a chart with no title or subtitle block at all is harmless', () => {
		const chart = layoutChart();

		delete chart.options.plugins.title;
		delete chart.options.plugins.subtitle;

		expect( () => window.MChartHelper.beforeLayout( chart ) ).not.toThrow();
	} );

	test( 'text is measured in the font it will be drawn in', () => {
		const chart = layoutChart( {
			title:    { display: true, text: LONG_TITLE, font: { size: 30, weight: 'bold', family: 'Georgia' } },
			subtitle: { display: true, text: LONG_TITLE, font: { size: 14 } },
		} );

		window.MChartHelper.beforeLayout( chart );

		const fonts = [ ...new Set( chart.ctx.measured.map( ( m ) => m.font ) ) ];

		expect( fonts ).toEqual( [ 'bold 30px Georgia', '14px sans-serif' ] );
	} );

	test( 'falls back to the theme default sizes, 21px for the title and 18px for the subtitle', () => {
		const chart = layoutChart( { title: LONG_TITLE, subtitle: LONG_TITLE } );

		window.MChartHelper.beforeLayout( chart );

		const fonts = [ ...new Set( chart.ctx.measured.map( ( m ) => m.font ) ) ];

		expect( fonts ).toEqual( [ '21px sans-serif', '18px sans-serif' ] );
	} );

	test( 'leaves the canvas state as it found it', () => {
		const chart = layoutChart( { title: LONG_TITLE, subtitle: 'Short' } );

		window.MChartHelper.beforeLayout( chart );

		expect( chart.ctx.save ).toHaveBeenCalledTimes( 2 );
		expect( chart.ctx.restore ).toHaveBeenCalledTimes( 2 );
	} );

	test( 'does nothing before the chart has a width', () => {
		const chart = layoutChart( { title: LONG_TITLE, width: 0 } );

		window.MChartHelper.beforeLayout( chart );

		expect( titleOf( chart ) ).toBe( LONG_TITLE );
		expect( chart.ctx.measured ).toHaveLength( 0 );
	} );

	test( 'does nothing before the chart has a canvas context', () => {
		const chart = layoutChart( { title: LONG_TITLE } );

		delete chart.ctx;

		expect( () => window.MChartHelper.beforeLayout( chart ) ).not.toThrow();
		expect( titleOf( chart ) ).toBe( LONG_TITLE );
	} );

	test( 'leaves a chart that is not M Chart\'s alone', () => {
		const chart = layoutChart( { title: LONG_TITLE } );

		delete chart.options.plugins[ 'm-chart-helper' ];

		window.MChartHelper.beforeLayout( chart );

		expect( titleOf( chart ) ).toBe( LONG_TITLE );
		expect( chart.ctx.measured ).toHaveLength( 0 );
	} );
} );

describe( 'MChartHelper.beforeUpdate tooltips for standard charts', () => {
	// Pass label: undefined for a series that has no name at all, leaving it out gives the series the name Revenue
	function seriesChart( type, setup = {} ) {
		const { labelsPos = 'first_column', locale = 'en-US', rawData, data = [ 1234.5, 99 ], labels = [ 'North', 'South' ] } = setup;

		const dataset = { data };
		const label   = 'label' in setup ? setup.label : 'Revenue';

		if ( undefined !== label ) {
			dataset.label = label;
		}

		if ( rawData ) {
			dataset.rawData = rawData;
		}

		const chart = mChart( type, { labelsPos, locale, data: { labels, datasets: [ dataset ] } } );

		window.MChartHelper.beforeUpdate( chart );

		return chart;
	}

	const RAW = [ { value: 1234.5, prefix: '$', suffix: ' USD' }, { value: 99, prefix: '$', suffix: ' USD' } ];

	test.each( [ 'line', 'bar', 'pie', 'doughnut', 'radar', 'polarArea' ] )(
		'a %s chart tooltip reads "Series: value" with the value\'s prefix and suffix',
		( type ) => {
			const chart = seriesChart( type, { rawData: RAW } );

			expect( tooltipLabel( chart ) ).toBe( 'Revenue: $1,234.5 USD' );
			expect( tooltipLabel( chart, 0, 1 ) ).toBe( 'Revenue: $99 USD' );
		}
	);

	test( 'the number is formatted for the chart locale', () => {
		const chart = seriesChart( 'line', { rawData: RAW, locale: 'de-DE' } );

		expect( tooltipLabel( chart ) ).toBe( 'Revenue: $1.234,5 USD' );
	} );

	test.each( [ undefined, '' ] )( 'a series with a name of %p shows the value on its own', ( label ) => {
		const chart = seriesChart( 'line', { label, rawData: RAW } );

		expect( tooltipLabel( chart ) ).toBe( '$1,234.5 USD' );
	} );

	test( 'a point without parsed data falls back to the plain number', () => {
		const chart = seriesChart( 'line' );

		expect( tooltipLabel( chart ) ).toBe( 'Revenue: 1,234.5' );
	} );

	test( 'a zero is shown as a value, not treated as empty', () => {
		const chart = seriesChart( 'bar', { data: [ 0 ], rawData: [ { value: 0, prefix: '', suffix: '%' } ] } );

		expect( tooltipLabel( chart ) ).toBe( 'Revenue: 0%' );
	} );

	test.each( [ null, undefined ] )( 'an empty point (%p) gets no tooltip line', ( value ) => {
		const chart = seriesChart( 'line', { data: [ value ], rawData: [ { value: null, text: '' } ] } );

		expect( tooltipLabel( chart ) ).toBeNull();
	} );

	test( 'special characters in a series name and its affixes come through as typed', () => {
		const chart = seriesChart( 'line', {
			label:   'R&D <b>"spend"</b>',
			data:    [ 5 ],
			rawData: [ { value: 5, prefix: '<', suffix: '> &amp; €' } ],
		} );

		expect( tooltipLabel( chart ) ).toBe( 'R&D <b>"spend"</b>: <5> &amp; €' );
	} );

	describe( 'when labels sit in both the first row and the first column', () => {
		test( 'a bar chart shows the series name, the category is already in the tooltip title', () => {
			const chart = seriesChart( 'bar', { labelsPos: 'both', rawData: RAW } );

			expect( tooltipLabel( chart ) ).toBe( 'Revenue: $1,234.5 USD' );
		} );

		test( 'a bar chart with an unnamed series shows the value on its own', () => {
			const chart = seriesChart( 'bar', { labelsPos: 'both', label: undefined, rawData: RAW } );

			expect( tooltipLabel( chart ) ).toBe( '$1,234.5 USD' );
		} );

		test( 'a line chart shows the series name', () => {
			const chart = seriesChart( 'line', { labelsPos: 'both', rawData: RAW } );

			expect( tooltipLabel( chart ) ).toBe( 'Revenue: $1,234.5 USD' );
		} );

		test( 'a pie chart with an unnamed series falls back to the slice label', () => {
			const chart = seriesChart( 'pie', { labelsPos: 'both', label: undefined, rawData: RAW } );

			expect( tooltipLabel( chart ) ).toBe( 'North: $1,234.5 USD' );
			expect( tooltipLabel( chart, 0, 1 ) ).toBe( 'South: $99 USD' );
		} );

		test( 'a polar area chart shows the category and then the series name', () => {
			const chart = seriesChart( 'polarArea', { labelsPos: 'both', rawData: RAW } );

			expect( tooltipLabel( chart ) ).toBe( 'North: Revenue: $1,234.5 USD' );
		} );

		test( 'a polar area chart does not repeat a series name that matches the category', () => {
			const chart = seriesChart( 'polarArea', { labelsPos: 'both', label: 'North', rawData: RAW } );

			expect( tooltipLabel( chart ) ).toBe( 'North: $1,234.5 USD' );
		} );

		test( 'a polar area chart with an unnamed series shows just the category', () => {
			const chart = seriesChart( 'polarArea', { labelsPos: 'both', label: undefined, rawData: RAW } );

			expect( tooltipLabel( chart, 0, 1 ) ).toBe( 'South: $99 USD' );
		} );
	} );

	test( 'the callbacks are installed again after the options are swapped out, as the editor preview does on every refresh', () => {
		const chart = seriesChart( 'line', { rawData: RAW } );

		chart.options.plugins.tooltip    = {};
		chart.options.plugins.datalabels = {};

		window.MChartHelper.beforeUpdate( chart );

		expect( tooltipLabel( chart ) ).toBe( 'Revenue: $1,234.5 USD' );
		expect( typeof chart.options.plugins.datalabels.formatter ).toBe( 'function' );
	} );

	test( 'a chart that is not M Chart\'s gets no callbacks', () => {
		const chart = mChart( 'line', { data: { labels: [ 'A' ], datasets: [ { label: 'Theirs', data: [ 1 ] } ] } } );

		delete chart.options.plugins[ 'm-chart-helper' ];

		window.MChartHelper.beforeUpdate( chart );

		expect( chart.options.plugins.tooltip.callbacks ).toBeUndefined();
		expect( chart.options.plugins.datalabels.formatter ).toBeUndefined();
	} );
} );

describe( 'MChartHelper.beforeUpdate data labels for standard charts', () => {
	function dataLabel( chart, label, dataIndex = 0 ) {
		return chart.options.plugins.datalabels.formatter( label, { dataset: chart.data.datasets[ 0 ], dataIndex } );
	}

	function barChart( dataset, locale = 'en-US' ) {
		const chart = mChart( 'bar', { locale, data: { labels: [ 'North', 'South' ], datasets: [ dataset ] } } );

		window.MChartHelper.beforeUpdate( chart );

		return chart;
	}

	test( 'shows the value with its prefix and suffix in the chart locale', () => {
		const chart = barChart( { data: [ 1234.5 ], rawData: [ { value: 1234.5, prefix: '€', suffix: ' m' } ] }, 'de-DE' );

		expect( dataLabel( chart, 1234.5 ) ).toBe( '€1.234,5 m' );
	} );

	test( 'shows a text cell as typed', () => {
		const chart = barChart( { data: [ null ], rawData: [ { value: null, text: 'n/a' } ] } );

		expect( dataLabel( chart, 'n/a' ) ).toBe( 'n/a' );
	} );

	test( 'formats a bare number when there is no parsed data for the point', () => {
		const chart = barChart( { data: [ 98765.4 ] } );

		expect( dataLabel( chart, 98765.4 ) ).toBe( '98,765.4' );
	} );

	test( 'leaves a label that is not a number alone', () => {
		const chart = barChart( { data: [ 'pending' ] } );

		expect( dataLabel( chart, 'pending' ) ).toBe( 'pending' );
	} );

	test( 'has nothing to show for an empty point', () => {
		const chart = barChart( { data: [ null ] } );

		expect( dataLabel( chart, null ) ).toBeNull();
	} );
} );

describe( 'MChartHelper.beforeUpdate bubble charts', () => {
	/**
	 * A bubble chart as PHP sends it: x, y and r per point, an optional point label, and the parsed cells in rawData
	 *
	 * @param {Object}   setup
	 * @param {Array[]}  setup.series  One array of points per dataset
	 * @param {string[]} setup.labels  data.labels, the x, y and r column headings
	 * @param {Object}   setup.scales  options.scales
	 * @param {Array[]}  setup.rawData One rawData array per dataset
	 * @param {string[]} setup.names   Dataset labels
	 * @return {Object} The chart, not yet updated
	 */
	function bubbleChart( { series, labels = [ 'GDP', 'Life expectancy', 'Population' ], scales, rawData = [], names = [ 'Europe', 'Asia' ] } ) {
		return mChart( 'bubble', {
			scales,
			data: {
				labels,
				datasets: series.map( ( data, i ) => {
					const dataset = { data };

					if ( undefined !== names[ i ] ) {
						dataset.label = names[ i ];
					}

					if ( rawData[ i ] ) {
						dataset.rawData = rawData[ i ];
					}

					return dataset;
				} ),
			},
		} );
	}

	function updated( setup ) {
		const chart = bubbleChart( setup );

		window.MChartHelper.beforeUpdate( chart );

		return chart;
	}

	function radii( chart ) {
		return chart.data.datasets.map( ( dataset ) => dataset.data.map( ( point ) => point.r ) );
	}

	const FRANCE = { x: 40000, y: 81.5, r: 67000000, label: 'France' };

	describe( 'radius scaling', () => {
		test( 'the largest value becomes a 31px radius and a zero becomes 1px', () => {
			const chart = updated( { series: [ [ { x: 1, y: 1, r: 100 }, { x: 2, y: 2, r: 0 } ] ] } );

			expect( radii( chart ) ).toEqual( [ [ 31, 1 ] ] );
		} );

		test( 'bubble area, not radius, is proportional to the value', () => {
			// A quarter of the value is half the radius range, a ninth is a third of it
			const chart = updated( { series: [ [ { x: 1, y: 1, r: 900 }, { x: 2, y: 2, r: 225 }, { x: 3, y: 3, r: 100 } ] ] } );

			expect( radii( chart )[ 0 ] ).toEqual( [ 31, 16, 11 ] );
		} );

		test( 'values are scaled against the largest across every series, so series stay comparable', () => {
			const chart = updated( { series: [
				[ { x: 1, y: 1, r: 100 } ],
				[ { x: 2, y: 2, r: 400 } ],
			] } );

			expect( radii( chart ) ).toEqual( [ [ 16 ], [ 31 ] ] );
		} );

		test( 'a negative value is sized by its magnitude', () => {
			const chart = updated( { series: [ [ { x: 1, y: 1, r: -400 }, { x: 2, y: 2, r: 100 } ] ] } );

			expect( radii( chart ) ).toEqual( [ [ 31, 16 ] ] );
		} );

		test( 'a chart where every value is zero gets minimum bubbles rather than broken ones', () => {
			const chart = updated( { series: [ [ { x: 1, y: 1, r: 0 }, { x: 2, y: 2, r: 0 } ] ] } );

			expect( radii( chart ) ).toEqual( [ [ 1, 1 ] ] );
		} );

		test( 'the x and y positions are not changed', () => {
			const chart = updated( { series: [ [ { ...FRANCE } ] ] } );

			expect( chart.data.datasets[ 0 ].data[ 0 ] ).toMatchObject( { x: 40000, y: 81.5, label: 'France' } );
		} );

		test( 'updating the chart again does not shrink the bubbles a second time', () => {
			const chart = updated( { series: [ [ { x: 1, y: 1, r: 900 }, { x: 2, y: 2, r: 225 } ] ] } );

			window.MChartHelper.beforeUpdate( chart );
			window.MChartHelper.beforeUpdate( chart );

			expect( radii( chart ) ).toEqual( [ [ 31, 16 ] ] );
		} );

		test( 'the same data handed to a second chart is not scaled from its already scaled radii', () => {
			const first = updated( { series: [ [ { x: 1, y: 1, r: 900 }, { x: 2, y: 2, r: 225 } ] ] } );

			const second = mChart( 'bubble', { data: first.data } );

			window.MChartHelper.beforeUpdate( second );

			expect( radii( second ) ).toEqual( [ [ 31, 16 ] ] );
		} );

		test( 'new data swapped into the same chart is scaled', () => {
			const chart = updated( { series: [ [ { x: 1, y: 1, r: 900 } ] ] } );

			const next = { labels: [], datasets: [ { label: 'Europe', data: [ { x: 1, y: 1, r: 50 }, { x: 2, y: 2, r: 200 } ] } ] };

			chart.data        = next;
			chart.config.data = next;

			window.MChartHelper.beforeUpdate( chart );

			expect( radii( chart ) ).toEqual( [ [ 16, 31 ] ] );
		} );

		test( 'an empty series is harmless', () => {
			expect( () => updated( { series: [ [] ] } ) ).not.toThrow();
		} );
	} );

	describe( 'tooltips', () => {
		test( 'the title is the series name', () => {
			const chart = updated( { series: [ [ { ...FRANCE } ] ] } );

			expect( tooltipTitle( chart ) ).toBe( 'Europe' );
		} );

		test( 'the title is empty for an unnamed series', () => {
			const chart = updated( { series: [ [ { ...FRANCE } ] ], names: [] } );

			expect( tooltipTitle( chart ) ).toBe( '' );
		} );

		test( 'the title is empty when the tooltip has no items', () => {
			const chart = updated( { series: [ [ { ...FRANCE } ] ] } );

			expect( chart.options.plugins.tooltip.callbacks.title( [] ) ).toBe( '' );
		} );

		test( 'lists the point name, then x, y and the real value under their column headings', () => {
			const chart = updated( { series: [ [ { ...FRANCE } ] ] } );

			expect( tooltipLabel( chart ) ).toEqual( [
				'France',
				'GDP: 40,000',
				'Life expectancy: 81.5',
				'Population: 67,000,000',
			] );
		} );

		test( 'shows the value that was entered, not the pixel radius it was scaled to', () => {
			const chart = updated( { series: [ [ { ...FRANCE }, { x: 1, y: 2, r: 16750000, label: 'Netherlands' } ] ] } );

			expect( chart.data.datasets[ 0 ].data[ 1 ].r ).toBe( 16 );
			expect( tooltipLabel( chart, 0, 1 ).pop() ).toBe( 'Population: 16,750,000' );
		} );

		test( 'axis titles are preferred over the column headings for x and y', () => {
			const chart = updated( {
				series: [ [ { ...FRANCE } ] ],
				scales: { x: { title: { text: 'GDP per head' } }, y: { title: { text: 'Years' } } },
			} );

			expect( tooltipLabel( chart ) ).toEqual( [
				'France',
				'GDP per head: 40,000',
				'Years: 81.5',
				'Population: 67,000,000',
			] );
		} );

		test( 'values stand alone when there are no names for them, never "undefined: …"', () => {
			const chart = updated( { series: [ [ { ...FRANCE } ] ], labels: [] } );

			expect( tooltipLabel( chart ) ).toEqual( [ 'France', '40,000', '81.5', '67,000,000' ] );
		} );

		test( 'a point without a name has no name line', () => {
			const chart = updated( { series: [ [ { x: 40000, y: 81.5, r: 67000000 } ] ] } );

			expect( tooltipLabel( chart ) ).toEqual( [ 'GDP: 40,000', 'Life expectancy: 81.5', 'Population: 67,000,000' ] );
		} );

		test( 'a missing coordinate drops its line instead of showing an empty one', () => {
			const chart = updated( { series: [ [ { x: 40000, y: null, r: 67000000, label: 'France' } ] ] } );

			expect( tooltipLabel( chart ) ).toEqual( [ 'France', 'GDP: 40,000', 'Population: 67,000,000' ] );
		} );

		test( 'numbers follow the chart locale', () => {
			const chart = bubbleChart( { series: [ [ { ...FRANCE } ] ] } );

			chart.options.locale = 'de-DE';

			window.MChartHelper.beforeUpdate( chart );

			expect( tooltipLabel( chart ) ).toEqual( [
				'France',
				'GDP: 40.000',
				'Life expectancy: 81,5',
				'Population: 67.000.000',
			] );
		} );
	} );

	describe( 'data labels', () => {
		function dataLabel( chart, datasetIndex, dataIndex ) {
			const dataset = chart.data.datasets[ datasetIndex ];

			return chart.options.plugins.datalabels.formatter( dataset.data[ dataIndex ], { dataset, dataIndex } );
		}

		const cell = ( value, prefix = '', suffix = '' ) => ( { value, prefix, suffix } );

		test( 'show the entered value with the radius cell\'s prefix and suffix, from a flat x/y/r stream', () => {
			const chart = updated( {
				series:  [ [ { x: 1, y: 2, r: 300 }, { x: 3, y: 4, r: 1200 } ] ],
				rawData: [ [
					cell( 1 ), cell( 2 ), cell( 300, '$', 'k' ),
					cell( 3 ), cell( 4 ), cell( 1200, '$', 'k' ),
				] ],
			} );

			expect( dataLabel( chart, 0, 0 ) ).toBe( '$300k' );
			expect( dataLabel( chart, 0, 1 ) ).toBe( '$1,200k' );
		} );

		test( 'show the entered value with its prefix and suffix, from one [ x, y, r ] entry per point', () => {
			const chart = updated( {
				series:  [ [ { x: 1, y: 2, r: 300 }, { x: 3, y: 4, r: 1200 } ] ],
				rawData: [ [
					[ cell( 1 ), cell( 2 ), cell( 300, '', ' t' ) ],
					[ cell( 3 ), cell( 4 ), cell( 1200, '', ' t' ) ],
				] ],
			} );

			expect( dataLabel( chart, 0, 0 ) ).toBe( '300 t' );
			expect( dataLabel( chart, 0, 1 ) ).toBe( '1,200 t' );
		} );

		test( 'show the bare value when there is no parsed data', () => {
			const chart = updated( { series: [ [ { x: 1, y: 2, r: 300 } ] ] } );

			expect( dataLabel( chart, 0, 0 ) ).toBe( '300' );
		} );

		test( 'each series reads its own parsed data', () => {
			const chart = updated( {
				series:  [ [ { x: 1, y: 2, r: 10 } ], [ { x: 1, y: 2, r: 20 } ] ],
				rawData: [
					[ cell( 1 ), cell( 2 ), cell( 10, '$' ) ],
					[ cell( 1 ), cell( 2 ), cell( 20, '€' ) ],
				],
			} );

			expect( dataLabel( chart, 0, 0 ) ).toBe( '$10' );
			expect( dataLabel( chart, 1, 0 ) ).toBe( '€20' );
		} );
	} );
} );

describe( 'MChartHelper.beforeUpdate scatter charts', () => {
	function scatterChart( { points, labels = [ 'Height', 'Weight' ], scales, rawData, name = 'Class A' } ) {
		const dataset = { data: points };

		if ( undefined !== name ) {
			dataset.label = name;
		}

		if ( rawData ) {
			dataset.rawData = rawData;
		}

		const chart = mChart( 'scatter', { scales, data: { labels, datasets: [ dataset ] } } );

		window.MChartHelper.beforeUpdate( chart );

		return chart;
	}

	const cell = ( value, prefix = '', suffix = '' ) => ( { value, prefix, suffix } );

	test( 'the tooltip title is the series name', () => {
		const chart = scatterChart( { points: [ { x: 170, y: 65 } ] } );

		expect( tooltipTitle( chart ) ).toBe( 'Class A' );
	} );

	test( 'the tooltip lists x and y under their column headings', () => {
		const chart = scatterChart( { points: [ { x: 1700.5, y: 65 } ] } );

		expect( tooltipLabel( chart ) ).toEqual( [ 'Height: 1,700.5', 'Weight: 65' ] );
	} );

	test( 'a named point leads with its name', () => {
		const chart = scatterChart( { points: [ { x: 170, y: 65, label: 'Sam' } ] } );

		expect( tooltipLabel( chart ) ).toEqual( [ 'Sam', 'Height: 170', 'Weight: 65' ] );
	} );

	test( 'axis titles are preferred over the column headings', () => {
		const chart = scatterChart( {
			points: [ { x: 170, y: 65 } ],
			scales: { x: { title: { text: 'Height (cm)' } }, y: { title: { text: 'Weight (kg)' } } },
		} );

		expect( tooltipLabel( chart ) ).toEqual( [ 'Height (cm): 170', 'Weight (kg): 65' ] );
	} );

	test( 'values stand alone when there are no names for them', () => {
		const chart = scatterChart( { points: [ { x: 170, y: 65 } ], labels: [] } );

		expect( tooltipLabel( chart ) ).toEqual( [ '170', '65' ] );
	} );

	test( 'the points themselves are left as they are, there is no radius to scale', () => {
		const chart = scatterChart( { points: [ { x: 170, y: 65 } ] } );

		expect( chart.data.datasets[ 0 ].data ).toEqual( [ { x: 170, y: 65 } ] );
	} );

	describe( 'data labels', () => {
		function dataLabel( chart, dataIndex ) {
			const dataset = chart.data.datasets[ 0 ];

			return chart.options.plugins.datalabels.formatter( dataset.data[ dataIndex ], { dataset, dataIndex } );
		}

		test( 'show the y value with its prefix and suffix, from a flat x/y stream', () => {
			const chart = scatterChart( {
				points:  [ { x: 170, y: 65 }, { x: 180, y: 1080 } ],
				rawData: [ cell( 170 ), cell( 65, '', ' kg' ), cell( 180 ), cell( 1080, '', ' kg' ) ],
			} );

			expect( dataLabel( chart, 0 ) ).toBe( '65 kg' );
			expect( dataLabel( chart, 1 ) ).toBe( '1,080 kg' );
		} );

		test( 'show the y value with its prefix and suffix, from one [ x, y ] entry per point', () => {
			const chart = scatterChart( {
				points:  [ { x: 170, y: 65 }, { x: 180, y: 80 } ],
				rawData: [ [ cell( 170 ), cell( 65, '~' ) ], [ cell( 180 ), cell( 80, '~' ) ] ],
			} );

			expect( dataLabel( chart, 0 ) ).toBe( '~65' );
			expect( dataLabel( chart, 1 ) ).toBe( '~80' );
		} );

		test( 'show a text y cell as typed', () => {
			const chart = scatterChart( {
				points:  [ { x: 170, y: null } ],
				rawData: [ cell( 170 ), { value: null, text: 'n/a' } ],
			} );

			expect( dataLabel( chart, 0 ) ).toBe( 'n/a' );
		} );

		test( 'fall back to the plotted y value when there is no parsed data', () => {
			const chart = scatterChart( { points: [ { x: 170, y: 6500.5 } ] } );

			expect( dataLabel( chart, 0 ) ).toBe( '6,500.5' );
		} );
	} );
} );

describe( 'MChartHelper.beforeUpdate boxplot and violin tooltips', () => {
	const STATS = { min: 150, q1: 160, median: 165.5, q3: 1720, max: 1900, outliers: [] };

	function distributionChart( type, dataset = {} ) {
		const chart = mChart( type, { data: {
			labels:   [ 'Group A' ],
			datasets: [ { label: 'Heights', data: [ [ 150, 160, 165.5 ] ], ...dataset } ],
		} } );

		window.MChartHelper.beforeUpdate( chart );

		return chart;
	}

	// chartjs-chart-boxplot hands the computed statistics over as an object on formattedValue
	function statsLabel( chart, stats ) {
		return tooltipLabel( chart, 0, 0, { formattedValue: { raw: stats } } );
	}

	test.each( [ 'boxplot', 'violin' ] )( 'a %s tooltip is titled with the category', ( type ) => {
		const chart = distributionChart( type );

		expect( tooltipTitle( chart ) ).toBe( 'Group A' );
	} );

	test( 'the title is empty when the tooltip has no items', () => {
		const chart = distributionChart( 'boxplot' );

		expect( chart.options.plugins.tooltip.callbacks.title( [] ) ).toBe( '' );
	} );

	test.each( [ 'boxplot', 'violin' ] )( 'a %s tooltip lists the series name and the five statistics', ( type ) => {
		const chart = distributionChart( type );

		expect( statsLabel( chart, STATS ) ).toEqual( [
			'Heights',
			'Min: 150',
			'Q1: 160',
			'Median: 165.5',
			'Q3: 1,720',
			'Max: 1,900',
		] );
	} );

	test( 'the statistics carry the series prefix and suffix', () => {
		const chart = distributionChart( 'boxplot', { mChartDatasetPrefix: '~', mChartDatasetSuffix: ' cm' } );

		expect( statsLabel( chart, STATS ).slice( 1, 3 ) ).toEqual( [ 'Min: ~150 cm', 'Q1: ~160 cm' ] );
	} );

	test( 'an unnamed series has no name line', () => {
		const chart = distributionChart( 'boxplot', { label: '' } );

		expect( statsLabel( chart, STATS )[ 0 ] ).toBe( 'Min: 150' );
	} );

	test.each( [
		[ [ 210 ], '+ 1 outlier' ],
		[ [ 210, 215, 90 ], '+ 3 outliers' ],
	] )( 'outliers %p are counted as "%s"', ( outliers, line ) => {
		const chart = distributionChart( 'boxplot' );

		expect( statsLabel( chart, { ...STATS, outliers } ).pop() ).toBe( line );
	} );

	test( 'no outlier line is shown when there are none', () => {
		const chart = distributionChart( 'boxplot' );

		expect( statsLabel( chart, STATS ).pop() ).toBe( 'Max: 1,900' );
	} );

	test( 'a statistic that could not be computed is left out rather than shown blank', () => {
		const chart = distributionChart( 'violin' );

		expect( statsLabel( chart, { ...STATS, q1: undefined, q3: NaN } ) ).toEqual( [
			'Heights',
			'Min: 150',
			'Median: 165.5',
			'Max: 1,900',
		] );
	} );

	test( 'falls back to the parsed statistics when the library did not supply its object', () => {
		const chart = distributionChart( 'boxplot' );

		expect( tooltipLabel( chart, 0, 0, { formattedValue: '150 / 165.5 / 1900', parsed: STATS } ) ).toContain( 'Median: 165.5' );
	} );
} );

describe( 'MChartHelper.beforeUpdate treemap tooltips', () => {
	function treemapChart( dataset ) {
		const chart = mChart( 'treemap', { data: { datasets: [ dataset ] } } );

		window.MChartHelper.beforeUpdate( chart );

		return chart;
	}

	// chartjs-chart-treemap keeps the original tree entry on raw._data
	function flatLabel( chart, entry ) {
		return chart.options.plugins.tooltip.callbacks.label( { chart, raw: { _data: entry } } );
	}

	test( 'a flat treemap tooltip reads "Label: value" with the cell\'s prefix and suffix and has no title', () => {
		const chart = treemapChart( { tree: [], mChartColors: [ '#111', '#222' ] } );

		expect( flatLabel( chart, { label: 'Apples', value: 1200, prefix: '$', suffix: ' k' } ) ).toBe( 'Apples: $1,200 k' );
		expect( chart.options.plugins.tooltip.callbacks.title() ).toBe( '' );
	} );

	test( 'a text cell is shown as typed', () => {
		const chart = treemapChart( { tree: [] } );

		expect( flatLabel( chart, { label: 'Apples', value: null, text: 'n/a' } ) ).toBe( 'Apples: n/a' );
	} );

	test( 'a rectangle with no value shows just its label', () => {
		const chart = treemapChart( { tree: [] } );

		expect( flatLabel( chart, { label: 'Apples', value: null } ) ).toBe( 'Apples' );
	} );

	test( 'a flat treemap colors each rectangle from its palette', () => {
		const chart   = treemapChart( { tree: [], mChartColors: [ '#111', '#222' ] } );
		const dataset = chart.data.datasets[ 0 ];

		expect( dataset.backgroundColor( { type: 'data', dataIndex: 1 } ) ).toBe( '#222' );
		expect( dataset.backgroundColor( { type: 'data', dataIndex: 7 } ) ).toBe( '#111' );
		expect( dataset.backgroundColor( { type: 'dataset' } ) ).toBe( 'transparent' );
	} );

	describe( 'grouped', () => {
		function groupedChart( extra = {} ) {
			return treemapChart( {
				mChartTreemapHierarchical: true,
				mChartTopGroupField:       'category',
				mChartTopGroupRgb:         { Fruit: { red: 200, green: 30, blue: 30 } },
				mChartDatasetPrefix:       '$',
				groups:                    [ 'category', 'item' ],
				key:                       'value',
				tree:                      [
					{ category: 'Fruit', item: 'Apples', value: 1200 },
					{ category: 'Fruit', item: 'Pears', value: 300 },
				],
				...extra,
			} );
		}

		function label( chart, raw ) {
			return chart.options.plugins.tooltip.callbacks.label( { chart, raw } );
		}

		test( 'a group tooltip shows the group total with the series prefix', () => {
			const chart = groupedChart();

			expect( label( chart, { g: 'Fruit', v: 1500, l: 0 } ) ).toBe( 'Fruit: $1,500' );
		} );

		test( 'a leaf tooltip prefers the affixes of its own cell', () => {
			const chart = groupedChart();

			expect( label( chart, { g: 'Apples', v: 1200, l: 1, _data: { category: 'Fruit', item: 'Apples', prefix: '€', suffix: ' net' } } ) )
				.toBe( 'Apples: €1,200 net' );
		} );

		test( 'a leaf without affixes of its own uses the series ones', () => {
			const chart = groupedChart();

			expect( label( chart, { g: 'Pears', v: 300, l: 1, _data: { category: 'Fruit', item: 'Pears' } } ) ).toBe( 'Pears: $300' );
		} );

		test( 'group captions carry the total and leaves are labelled with their name only', () => {
			const chart   = groupedChart();
			const dataset = chart.data.datasets[ 0 ];

			expect( dataset.captions.formatter( { type: 'data', raw: { g: 'Fruit', v: 1500, l: 0 } } ) ).toBe( 'Fruit: $1,500' );
			expect( dataset.captions.formatter( { type: 'data', raw: { g: 'Apples', v: 1200, l: 1 } } ) ).toBe( '' );
			expect( dataset.labels.formatter( { type: 'data', raw: { g: 'Apples', v: 1200, l: 1 } } ) ).toBe( 'Apples' );
			expect( dataset.labels.formatter( { type: 'data', raw: { g: 'Fruit', v: 1500, l: 0 } } ) ).toBe( '' );
		} );
	} );
} );

describe( 'MChartHelper.beforeUpdate venn and euler tooltips', () => {
	function vennChart( type, dataset = {} ) {
		const chart = mChart( type, { data: { datasets: [ { mChartIsVenn: true, data: [], ...dataset } ] } } );

		window.MChartHelper.beforeUpdate( chart );

		return chart;
	}

	function label( chart, raw, dataIndex = 0 ) {
		return chart.options.plugins.tooltip.callbacks.label( { chart, raw, dataIndex } );
	}

	test.each( [ 'venn', 'euler' ] )( 'a %s tooltip names the sets and shows the value with the series affixes', ( type ) => {
		const chart = vennChart( type, { mChartDatasetSuffix: ' users' } );

		expect( label( chart, { sets: [ 'Web' ], value: 1200 } ) ).toEqual( [ 'Web: 1,200 users' ] );
		expect( label( chart, { sets: [ 'Web', 'Mobile' ], value: 340 } ) ).toEqual( [ 'Web ∩ Mobile: 340 users' ] );
		expect( chart.options.plugins.tooltip.callbacks.title() ).toBe( '' );
	} );

	test( 'a region that knows its members lists up to five of them', () => {
		const chart = vennChart( 'venn', { mChartVennMeta: [
			{ members: [ 'Ann', 'Bo' ] },
			{ members: [ 'Ann', 'Bo', 'Cy', 'Di', 'Ed', 'Flo', 'Gus' ] },
		] } );

		expect( label( chart, { sets: [ 'A' ], value: 2 }, 0 ) ).toEqual( [ 'A: 2', 'Ann, Bo' ] );
		expect( label( chart, { sets: [ 'B' ], value: 7 }, 1 ) ).toEqual( [ 'B: 7', 'Ann, Bo, Cy, Di, Ed, …' ] );
	} );

	test( 'empty regions get no tooltip', () => {
		const chart  = vennChart( 'venn' );
		const filter = chart.options.plugins.tooltip.filter;

		expect( filter( { raw: { sets: [ 'A', 'B' ], value: 0 } } ) ).toBe( false );
		expect( filter( { raw: { sets: [ 'A', 'B' ], value: 3 } } ) ).toBe( true );
		expect( filter( { raw: undefined } ) ).toBe( false );
	} );

	test( 'the in-region value labels use the locale and affixes and skip zeros', () => {
		const chart = vennChart( 'venn', { mChartDatasetPrefix: '$' } );
		const tick  = chart.config.options.scales.x.ticks.callback;

		expect( tick( 1200 ) ).toBe( '$1,200' );
		expect( tick( 0 ) ).toBe( '' );
		expect( tick( 'n/a' ) ).toBe( '' );
	} );

	test( 'a venn typed chart whose data is not a venn dataset is left alone', () => {
		const chart = vennChart( 'venn', { mChartIsVenn: false } );

		expect( chart.options.plugins.tooltip.callbacks ).toBeUndefined();
	} );
} );

describe( 'MChartHelper.afterDataLimits boxplot and violin y bounds', () => {
	function limitsChart( type, datasets, { constrain = true } = {} ) {
		return mChart( type, {
			data:    { labels: [], datasets },
			plugins: { mchart: { constrain_y_axis: constrain } },
		} );
	}

	// The scale as Chart.js left it after its own auto-fit
	function scale( axis = 'y' ) {
		return { axis, min: 0, max: 500 };
	}

	function limitsFor( type, datasets, options, axis ) {
		const args = { scale: scale( axis ) };

		window.MChartHelper.afterDataLimits( limitsChart( type, datasets, options ), args );

		return [ args.scale.min, args.scale.max ];
	}

	test.each( [ 'boxplot', 'violin' ] )( 'a constrained %s hugs the data with 5%% of the range to spare either side', ( type ) => {
		// Observations run from 100 to 300, a range of 200
		const limits = limitsFor( type, [ { data: [ [ 100, 150, 200 ], [ 180, 300 ] ] } ] );

		expect( limits ).toEqual( [ 90, 310 ] );
	} );

	test( 'the bounds cover every series', () => {
		const limits = limitsFor( 'boxplot', [
			{ data: [ [ 100, 150 ] ] },
			{ data: [ [ 40, 120 ], [ 500, 440 ] ] },
		] );

		expect( limits ).toEqual( [ 17, 523 ] );
	} );

	test( 'negative observations are handled', () => {
		const limits = limitsFor( 'violin', [ { data: [ [ -50, -10, 30 ], [ 50, 0 ] ] } ] );

		expect( limits ).toEqual( [ -55, 55 ] );
	} );

	test( 'numbers that arrive as strings count, text does not', () => {
		const limits = limitsFor( 'boxplot', [ { data: [ [ '100', 'n/a', 150 ], [ '300', 'pending' ] ] } ] );

		expect( limits ).toEqual( [ 90, 310 ] );
	} );

	test( 'rows that are not lists of observations are skipped', () => {
		const limits = limitsFor( 'boxplot', [ { data: [ [ 100, 300 ], 9999, null, { min: -5000 } ] } ] );

		expect( limits ).toEqual( [ 90, 310 ] );
	} );

	test( 'only the y axis is touched', () => {
		expect( limitsFor( 'boxplot', [ { data: [ [ 100, 300 ] ] } ], undefined, 'x' ) ).toEqual( [ 0, 500 ] );
	} );

	test( 'the scale is left to Chart.js when the option is off', () => {
		expect( limitsFor( 'boxplot', [ { data: [ [ 100, 300 ] ] } ], { constrain: false } ) ).toEqual( [ 0, 500 ] );
	} );

	test( 'the scale is left to Chart.js when the option block is missing', () => {
		const chart = limitsChart( 'boxplot', [ { data: [ [ 100, 300 ] ] } ] );
		const args  = { scale: scale() };

		delete chart.options.plugins.mchart;

		window.MChartHelper.afterDataLimits( chart, args );

		expect( [ args.scale.min, args.scale.max ] ).toEqual( [ 0, 500 ] );
	} );

	test.each( [ 'line', 'bar', 'scatter', 'bubble' ] )( 'a %s chart is never constrained, even with the option on', ( type ) => {
		expect( limitsFor( type, [ { data: [ [ 100, 300 ] ] } ] ) ).toEqual( [ 0, 500 ] );
	} );

	test.each( [
		[ 'every observation is the same', [ { data: [ [ 42, 42 ], [ 42 ] ] } ] ],
		[ 'there is a single observation', [ { data: [ [ 42 ] ] } ] ],
		[ 'there are no observations', [ { data: [ [], [] ] } ] ],
		[ 'nothing is numeric', [ { data: [ [ 'n/a', 'pending' ] ] } ] ],
		[ 'there are no series', [] ],
		[ 'a series has no data', [ {} ] ],
	] )( 'the scale is left to Chart.js when %s', ( description, datasets ) => {
		expect( limitsFor( 'boxplot', datasets ) ).toEqual( [ 0, 500 ] );
	} );

	test( 'a chart that is not M Chart\'s is left alone', () => {
		const chart = limitsChart( 'boxplot', [ { data: [ [ 100, 300 ] ] } ] );
		const args  = { scale: scale() };

		delete chart.options.plugins[ 'm-chart-helper' ];

		window.MChartHelper.afterDataLimits( chart, args );

		expect( [ args.scale.min, args.scale.max ] ).toEqual( [ 0, 500 ] );
	} );
} );

describe( 'MChartHelper.afterDatasetsDraw treemap group captions', () => {
	/**
	 * A grouped treemap that has been through beforeUpdate, with one laid out group rectangle
	 * Characters measure 10px, so the caption "Northern and central Europe: 10" needs 310px
	 *
	 * @param {Object}  setup
	 * @param {number}  setup.chartWidth Chart width, which decides whether captions get a second line
	 * @param {Object}  setup.rect       Geometry of the group rectangle
	 * @param {Object}  setup.captions   The dataset's captions options
	 * @param {boolean} setup.active     Whether the rectangle is hovered
	 * @return {Object} The chart
	 */
	function captionChart( { chartWidth = 400, rect = { x: 20, y: 40, width: 150, height: 200 }, captions = {}, active = false } = {} ) {
		const dataset = {
			mChartTreemapHierarchical: true,
			mChartTopGroupField:       'region',
			groups:                    [ 'region', 'country' ],
			key:                       'value',
			captions,
			tree:                      [
				{ region: 'Northern and central Europe', country: 'Sweden', value: 10 },
				{ region: 'Asia', country: 'Japan', value: 30 },
			],
		};

		const chart = mChart( 'treemap', { data: { datasets: [ dataset ] } } );

		chart.ctx   = fakeContext();
		chart.width = chartWidth;

		const element = {
			active,
			$context: { raw: { g: 'Northern and central Europe', v: 10, l: 0 } },
			getProps: () => rect,
		};

		const leaf = {
			$context: { raw: { g: 'Sweden', v: 10, l: 1 } },
			getProps: () => ( { x: 20, y: 80, width: 150, height: 160 } ),
		};

		chart.getDatasetMeta = () => ( { data: [ element, leaf ] } );

		window.MChartHelper.beforeUpdate( chart );

		return chart;
	}

	function painted( chart ) {
		return chart.ctx.fillText.mock.calls.map( ( [ text ] ) => text );
	}

	test( 'a group name too long for its rectangle is painted on two lines', () => {
		const chart = captionChart();

		window.MChartHelper.afterDatasetsDraw( chart );

		expect( painted( chart ) ).toHaveLength( 2 );
		expect( painted( chart )[ 0 ] ).toBe( 'Northern and' );
	} );

	test( 'a second line that still does not fit is cut short with an ellipsis', () => {
		const chart = captionChart();

		window.MChartHelper.afterDatasetsDraw( chart );

		const [ , second ] = painted( chart );

		// The rest of the caption is "central Europe: 10", there is 144px of room inside the 150px rectangle
		expect( second.endsWith( '…' ) ).toBe( true );
		expect( 'central Europe: 10'.startsWith( second.slice( 0, -1 ) ) ).toBe( true );
		expect( second.length ).toBeGreaterThan( 'central'.length );
		expect( second.length * 10 ).toBeLessThanOrEqual( 144 );
	} );

	test( 'the second line sits one line height under the first, inside the rectangle', () => {
		const chart = captionChart();

		window.MChartHelper.afterDatasetsDraw( chart );

		const [ first, second ] = chart.ctx.fillText.mock.calls;

		// 12px font at Chart.js's 1.2 line height
		expect( second[ 2 ] - first[ 2 ] ).toBeCloseTo( 14.4 );
		expect( first[ 1 ] ).toBe( second[ 1 ] );
		expect( first[ 1 ] ).toBeGreaterThanOrEqual( 20 );
		expect( first[ 2 ] ).toBeGreaterThanOrEqual( 40 );
	} );

	test( 'the library\'s own single-line caption is blanked so the text is not painted twice', () => {
		const chart = captionChart();

		expect( chart.data.datasets[ 0 ].captions.formatter( { type: 'data', raw: { g: 'Asia', v: 30, l: 0 } } ).trim() ).toBe( '' );
	} );

	test( 'leaf rectangles get no caption', () => {
		const chart = captionChart();

		window.MChartHelper.afterDatasetsDraw( chart );

		expect( painted( chart ).some( ( text ) => text.includes( 'Sweden' ) ) ).toBe( false );
	} );

	test( 'a rectangle too small for a two-line band gets no caption', () => {
		const chart = captionChart( { rect: { x: 0, y: 0, width: 150, height: 30 } } );

		window.MChartHelper.afterDatasetsDraw( chart );

		expect( painted( chart ) ).toHaveLength( 0 );
	} );

	test( 'a hovered group uses the hover color', () => {
		const resting = captionChart( { captions: { color: '#111111', hoverColor: '#ff0000' } } );
		const hovered = captionChart( { captions: { color: '#111111', hoverColor: '#ff0000' }, active: true } );

		const fillAtPaint = ( chart ) => {
			let style;

			chart.ctx.fillText.mockImplementation( () => {
				style = chart.ctx.fillStyle;
			} );

			window.MChartHelper.afterDatasetsDraw( chart );

			return style;
		};

		expect( fillAtPaint( resting ) ).toBe( '#111111' );
		expect( fillAtPaint( hovered ) ).toBe( '#ff0000' );
	} );

	test( 'nothing is painted when the captions fit on one line, the library paints those itself', () => {
		const chart = captionChart( { chartWidth: 4000 } );

		window.MChartHelper.afterDatasetsDraw( chart );

		expect( painted( chart ) ).toHaveLength( 0 );
		expect( chart.data.datasets[ 0 ].captions.formatter( { type: 'data', raw: { g: 'Asia', v: 30, l: 0 } } ) ).toBe( 'Asia: 30' );
	} );

	test( 'the canvas state is restored after painting', () => {
		const chart = captionChart();

		chart.ctx.save.mockClear();
		chart.ctx.restore.mockClear();

		window.MChartHelper.afterDatasetsDraw( chart );

		expect( chart.ctx.restore ).toHaveBeenCalledTimes( chart.ctx.save.mock.calls.length );
	} );

	test( 'nothing is painted for a chart of another type', () => {
		const chart = captionChart();

		chart.config.type = 'bar';

		window.MChartHelper.afterDatasetsDraw( chart );

		expect( painted( chart ) ).toHaveLength( 0 );
	} );

	test( 'a chart that is not M Chart\'s is left alone', () => {
		const chart = captionChart();

		delete chart.options.plugins[ 'm-chart-helper' ];

		window.MChartHelper.afterDatasetsDraw( chart );

		expect( painted( chart ) ).toHaveLength( 0 );
	} );
} );
