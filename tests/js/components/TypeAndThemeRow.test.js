/**
 * Unit tests for isSimple2DSeries (used to gate the "Color per data point"
 * checkbox in TypeAndThemeRow). Trailing empty cells from Jspreadsheet's
 * minDimensions padding must not inflate the apparent column count.
 *
 * Followed by rendered tests of the row itself: the type, theme and height fields
 * and when the "Color per data point" checkbox is offered
 */
import { isSimple2DSeries } from '../../../components/admin-ui-src/components/TypeAndThemeRow';

// The height field sizes itself by drawing on a canvas, which jsdom doesn't implement
jest.mock( '../../../components/admin-ui-src/utils/measureTextWidth', () => ( {
	measureTextWidth: () => 40,
} ) );

const PAD = ( row, target = 37 ) => {
	const out = row.slice();
	while ( out.length < target ) {
		out.push( '' );
	}
	return out;
};

describe( 'isSimple2DSeries', () => {
	test( 'compact 10×2 in rows mode → true', () => {
		const sheet = [
			[ 'China', 77260000 ],
			[ 'Turkey', 1940000 ],
			[ 'Russia', 1640000 ],
			[ 'Mexico', 1080000 ],
			[ 'Uzbekistan', 900000 ],
			[ 'Ukraine', 830000 ],
			[ 'Spain', 770000 ],
			[ 'United States', 600000 ],
			[ 'Kazakhstan', 570000 ],
			[ 'Japan', 550000 ],
		];
		expect( isSimple2DSeries( sheet, 'rows' ) ).toBe( true );
	} );

	test( 'same data padded to 10×37 (rest empty strings) → true (the bug being fixed)', () => {
		const sheet = [
			PAD( [ 'China', 77260000 ] ),
			PAD( [ 'Turkey', 1940000 ] ),
			PAD( [ 'Russia', 1640000 ] ),
			PAD( [ 'Mexico', 1080000 ] ),
			PAD( [ 'Uzbekistan', 900000 ] ),
			PAD( [ 'Ukraine', 830000 ] ),
			PAD( [ 'Spain', 770000 ] ),
			PAD( [ 'United States', 600000 ] ),
			PAD( [ 'Kazakhstan', 570000 ] ),
			PAD( [ 'Japan', 550000 ] ),
		];
		expect( isSimple2DSeries( sheet, 'rows' ) ).toBe( true );
	} );

	test( '5×3 with real 3rd column in rows mode → false (genuinely multi-series)', () => {
		const sheet = [
			[ '', 'Series A', 'Series B' ],
			[ 'Q1', 10, 15 ],
			[ 'Q2', 20, 25 ],
			[ 'Q3', 30, 35 ],
			[ 'Q4', 40, 45 ],
		];
		expect( isSimple2DSeries( sheet, 'rows' ) ).toBe( false );
	} );

	test( '5×3 padded to 5×37 → false (still genuinely multi-series)', () => {
		const sheet = [
			PAD( [ '', 'Series A', 'Series B' ] ),
			PAD( [ 'Q1', 10, 15 ] ),
			PAD( [ 'Q2', 20, 25 ] ),
			PAD( [ 'Q3', 30, 35 ] ),
			PAD( [ 'Q4', 40, 45 ] ),
		];
		expect( isSimple2DSeries( sheet, 'rows' ) ).toBe( false );
	} );

	test( '0 in a cell counts as non-empty', () => {
		// A row [ "Foo", 0, "" ] has 2 effective columns (the 0 is real data)
		// A row [ "Foo", "", 0 ] has 3 effective columns (the 0 at index 2 is real data)
		const sheetWith2Cols = [
			[ 'Foo', 0, '', '' ],
			[ 'Bar', 0, '', '' ],
		];
		expect( isSimple2DSeries( sheetWith2Cols, 'rows' ) ).toBe( true );

		const sheetWith3Cols = [
			[ 'Foo', '', 0 ],
			[ 'Bar', '', 0 ],
		];
		expect( isSimple2DSeries( sheetWith3Cols, 'rows' ) ).toBe( false );
	} );

	test( 'columns mode: 2 effective rows → true, 3 effective rows → false', () => {
		const twoRows = [
			[ 'Jan', 'Feb', 'Mar' ],
			[ 10, 20, 30 ],
			// trailing empty rows from padding
			[ '', '', '' ],
			[ '', '', '' ],
		];
		expect( isSimple2DSeries( twoRows, 'columns' ) ).toBe( true );

		const threeRows = [
			[ '', 'Jan', 'Feb', 'Mar' ],
			[ 'Dogs', 10, 14, 12 ],
			[ 'Cats', 8, 11, 15 ],
		];
		expect( isSimple2DSeries( threeRows, 'columns' ) ).toBe( false );
	} );

	test( 'empty / non-array sheet → false', () => {
		expect( isSimple2DSeries( [], 'rows' ) ).toBe( false );
		expect( isSimple2DSeries( null, 'rows' ) ).toBe( false );
		expect( isSimple2DSeries( undefined, 'rows' ) ).toBe( false );
		expect( isSimple2DSeries( 'not an array', 'rows' ) ).toBe( false );
	} );

	test( 'all-empty padded sheet → true (treated as 0 effective cols, which is ≤ 2)', () => {
		// A brand-new chart with empty data: Jspreadsheet still hands back a padded
		// grid of empty strings. We want the checkbox to show in this case too,
		// because the user has no data yet but is creating a column/bar chart
		const sheet = [
			PAD( [] ),
			PAD( [] ),
		];
		expect( isSimple2DSeries( sheet, 'rows' ) ).toBe( true );
	} );
} );

/*
 * Rendered tests
 */
const THEMES = [
	{ slug: '_default', name: 'Default' },
	{ slug: 'color-blind-safe', name: 'Color Blind Safe' },
	{ slug: 'highcharts-v4', name: 'Highcharts 4' },
];

let createElement;
let render;
let screen;
let fireEvent;
let act;
let TypeAndThemeRow;
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
	post_meta: {
		type:              'line',
		theme:             'color-blind-safe',
		height:            400,
		parse_in:          'rows',
		data_point_colors: false,
	},
	// "sankey" has no display name, the way a type added by a filter might not
	type_options:      [ 'line', 'bar', 'pie', 'boxplot', 'sankey' ],
	type_option_names: { line: 'Line', bar: 'Bar', pie: 'Pie', boxplot: 'Box Plot' },
	type_traits:       {
		...window.m_chart_admin.type_traits,
		boxplot: { ...window.m_chart_admin.type_traits.bar, native: 'boxplot', simple_2d_required: false, single_sheet_required: true },
	},
	themes:            THEMES,
	height_range:      { min: 300, max: 1500 },
	spreadsheet_data:  [ [ [ 'Region', 'Total' ], [ 'North', 10 ], [ 'South', 12 ] ] ],
} );

jest.isolateModules( () => {
	( { createElement } = require( '@wordpress/element' ) );
	( { render, screen, fireEvent, act } = require( '@testing-library/react' ) );
	TypeAndThemeRow = require( '../../../components/admin-ui-src/components/TypeAndThemeRow' ).default;
	( { ChartAdminProvider, useChartAdmin } = require( '../../../components/admin-ui-src/context/ChartAdminContext' ) );
} );

afterAll( () => {
	Object.assign( window.m_chart_admin, originalAdmin );
} );

/**
 * Render the row, optionally with different chart meta and sheets than the saved chart above
 *
 * @param {Object} setup
 * @param {Object} setup.meta   Post meta fields to change
 * @param {Array}  setup.sheets Replacement sheets, one 2D array per sheet
 * @return {Object} The testing library render result
 */
function renderRow( { meta, sheets } = {} ) {
	const utils = render(
		createElement( ChartAdminProvider, null, createElement( Capture ), createElement( TypeAndThemeRow ) )
	);

	act( () => {
		if ( meta ) {
			dispatchRef( { type: 'SET_POST_META', payload: meta } );
		}

		if ( sheets ) {
			dispatchRef( { type: 'REPLACE_SHEETS', payload: { sets: sheets } } );
		}
	} );

	return utils;
}

function optionsOf( select ) {
	return Array.from( select.options ).map( ( option ) => [ option.value, option.textContent ] );
}

function typeSelect() {
	return screen.getByRole( 'combobox', { name: 'Type' } );
}

function themeSelect() {
	return screen.getByRole( 'combobox', { name: 'Theme' } );
}

function heightField() {
	return screen.getByRole( 'spinbutton', { name: 'Height' } );
}

// The checkbox stays in the DOM so its value survives a type switch, whether it is offered is its column's inline display
function colorCheckbox( container ) {
	return container.querySelector( 'input[name="m-chart[data_point_colors]"]' );
}

function colorOptionOffered( container ) {
	return 'none' !== colorCheckbox( container ).closest( '.column' ).style.display;
}

const SINGLE_SERIES = [ [ 'Region', 'Total' ], [ 'North', 10 ], [ 'South', 12 ] ];
const MULTI_SERIES  = [ [ '', '2025', '2026' ], [ 'North', 10, 14 ], [ 'South', 12, 9 ] ];

describe( 'TypeAndThemeRow type', () => {
	test( 'lists the chart types PHP supplied, in order, under their display names', () => {
		renderRow();

		expect( optionsOf( typeSelect() ).slice( 0, 4 ) ).toEqual( [
			[ 'line', 'Line' ],
			[ 'bar', 'Bar' ],
			[ 'pie', 'Pie' ],
			[ 'boxplot', 'Box Plot' ],
		] );

		// wp.components warns about its pre-6.7 margin styles the first time these controls render in this file
		// @wordpress/deprecated logs each message once per process, so only this first test sees it
		expect( console ).toHaveWarned();
	} );

	test( 'a type without a display name is listed by its slug', () => {
		renderRow();

		expect( optionsOf( typeSelect() ).pop() ).toEqual( [ 'sankey', 'sankey' ] );
	} );

	test( 'starts on the saved type', () => {
		renderRow();

		expect( typeSelect() ).toHaveValue( 'line' );
	} );

	test( 'is posted with the form as m-chart[type]', () => {
		renderRow();

		expect( typeSelect() ).toHaveAttribute( 'name', 'm-chart[type]' );
	} );

	test.each( [ 'bar', 'pie', 'boxplot' ] )( 'choosing %s makes it the chart type', ( type ) => {
		renderRow();

		fireEvent.change( typeSelect(), { target: { value: type } } );

		expect( latestState.postMeta.type ).toBe( type );
		expect( typeSelect() ).toHaveValue( type );
	} );

	test( 'changing the type leaves the theme and height alone', () => {
		renderRow();

		fireEvent.change( typeSelect(), { target: { value: 'pie' } } );

		expect( latestState.postMeta.theme ).toBe( 'color-blind-safe' );
		expect( latestState.postMeta.height ).toBe( 400 );
		expect( themeSelect() ).toHaveValue( 'color-blind-safe' );
		expect( heightField() ).toHaveValue( 400 );
	} );

	test( 'follows a type change made elsewhere', () => {
		renderRow();

		act( () => dispatchRef( { type: 'SET_POST_META', payload: { type: 'pie' } } ) );

		expect( typeSelect() ).toHaveValue( 'pie' );
	} );
} );

describe( 'TypeAndThemeRow theme', () => {
	test( 'lists the themes PHP supplied, in order, by name', () => {
		renderRow();

		expect( optionsOf( themeSelect() ) ).toEqual( [
			[ '_default', 'Default' ],
			[ 'color-blind-safe', 'Color Blind Safe' ],
			[ 'highcharts-v4', 'Highcharts 4' ],
		] );
	} );

	test( 'starts on the saved theme', () => {
		renderRow();

		expect( themeSelect() ).toHaveValue( 'color-blind-safe' );
	} );

	test( 'is posted with the form as m-chart[theme]', () => {
		renderRow();

		expect( themeSelect() ).toHaveAttribute( 'name', 'm-chart[theme]' );
	} );

	test( 'choosing a theme makes it the chart theme and leaves the type alone', () => {
		renderRow();

		fireEvent.change( themeSelect(), { target: { value: 'highcharts-v4' } } );

		expect( latestState.postMeta.theme ).toBe( 'highcharts-v4' );
		expect( themeSelect() ).toHaveValue( 'highcharts-v4' );
		expect( latestState.postMeta.type ).toBe( 'line' );
	} );

	test( 'the same themes are offered whatever the chart type', () => {
		renderRow( { meta: { type: 'pie' } } );

		expect( optionsOf( themeSelect() ) ).toHaveLength( THEMES.length );
	} );
} );

describe( 'TypeAndThemeRow height', () => {
	test( 'shows the saved height in a number field limited to the allowed range', () => {
		renderRow();

		expect( heightField() ).toHaveValue( 400 );
		expect( heightField() ).toHaveAttribute( 'min', '300' );
		expect( heightField() ).toHaveAttribute( 'max', '1500' );
	} );

	test( 'is posted with the form as m-chart[height]', () => {
		renderRow();

		expect( heightField() ).toHaveAttribute( 'name', 'm-chart[height]' );
	} );

	test( 'typing a height stores it on the chart', () => {
		renderRow();

		fireEvent.change( heightField(), { target: { value: '650' } } );

		expect( String( latestState.postMeta.height ) ).toBe( '650' );
		expect( heightField() ).toHaveValue( 650 );
	} );
} );

describe( 'TypeAndThemeRow color per data point', () => {
	test( 'is not offered for a type that cannot color its points, like line', () => {
		const { container } = renderRow( { meta: { type: 'line' }, sheets: [ SINGLE_SERIES ] } );

		expect( colorOptionOffered( container ) ).toBe( false );
	} );

	test( 'is offered for a bar chart with a single series', () => {
		const { container } = renderRow( { meta: { type: 'bar' }, sheets: [ SINGLE_SERIES ] } );

		expect( colorOptionOffered( container ) ).toBe( true );
		expect( screen.getByRole( 'checkbox', { name: 'Color per data point' } ) ).toBeInTheDocument();
	} );

	test( 'is not offered for a bar chart with several series', () => {
		const { container } = renderRow( { meta: { type: 'bar' }, sheets: [ MULTI_SERIES ] } );

		expect( colorOptionOffered( container ) ).toBe( false );
	} );

	test( 'appears when switching from line to bar and goes again when switching back', () => {
		const { container } = renderRow( { sheets: [ SINGLE_SERIES ] } );

		expect( colorOptionOffered( container ) ).toBe( false );

		fireEvent.change( typeSelect(), { target: { value: 'bar' } } );

		expect( colorOptionOffered( container ) ).toBe( true );

		fireEvent.change( typeSelect(), { target: { value: 'line' } } );

		expect( colorOptionOffered( container ) ).toBe( false );
	} );

	test( 'goes away when a second series is added to the sheet and comes back when it is removed', () => {
		const { container } = renderRow( { meta: { type: 'bar' }, sheets: [ SINGLE_SERIES ] } );

		act( () => dispatchRef( { type: 'SET_SHEET_DATA', payload: { index: 0, data: MULTI_SERIES } } ) );

		expect( colorOptionOffered( container ) ).toBe( false );

		act( () => dispatchRef( { type: 'SET_SHEET_DATA', payload: { index: 0, data: SINGLE_SERIES } } ) );

		expect( colorOptionOffered( container ) ).toBe( true );
	} );

	test( 'reads the series count along the direction the data is parsed in', () => {
		// Two rows of many values: one series when the data runs in columns, many when it runs in rows
		const wide = [ [ 'North', 'South', 'East', 'West' ], [ 10, 12, 9, 14 ] ];

		const { container } = renderRow( { meta: { type: 'bar', parse_in: 'columns' }, sheets: [ wide ] } );

		expect( colorOptionOffered( container ) ).toBe( true );

		act( () => dispatchRef( { type: 'SET_POST_META', payload: { parse_in: 'rows' } } ) );

		expect( colorOptionOffered( container ) ).toBe( false );
	} );

	test( 'is offered for a box plot with one sheet, however many columns it has', () => {
		const { container } = renderRow( { meta: { type: 'boxplot' }, sheets: [ MULTI_SERIES ] } );

		expect( colorOptionOffered( container ) ).toBe( true );
	} );

	test( 'is not offered for a box plot with more than one sheet', () => {
		const { container } = renderRow( { meta: { type: 'boxplot' }, sheets: [ SINGLE_SERIES, SINGLE_SERIES ] } );

		expect( colorOptionOffered( container ) ).toBe( false );
	} );

	test( 'ticking it turns per point colors on, unticking turns them off', () => {
		renderRow( { meta: { type: 'bar' }, sheets: [ SINGLE_SERIES ] } );

		const checkbox = screen.getByRole( 'checkbox', { name: 'Color per data point' } );

		expect( checkbox ).not.toBeChecked();

		fireEvent.click( checkbox );

		expect( latestState.postMeta.data_point_colors ).toBe( true );
		expect( checkbox ).toBeChecked();

		fireEvent.click( checkbox );

		expect( latestState.postMeta.data_point_colors ).toBe( false );
		expect( checkbox ).not.toBeChecked();
	} );

	test( 'shows a saved choice as ticked', () => {
		renderRow( { meta: { type: 'bar', data_point_colors: true }, sheets: [ SINGLE_SERIES ] } );

		expect( screen.getByRole( 'checkbox', { name: 'Color per data point' } ) ).toBeChecked();
	} );

	test( 'stays in the form with its value while hidden, so a type switch does not lose the choice on save', () => {
		const { container } = renderRow( { meta: { type: 'bar', data_point_colors: true }, sheets: [ SINGLE_SERIES ] } );

		fireEvent.change( typeSelect(), { target: { value: 'line' } } );

		expect( colorOptionOffered( container ) ).toBe( false );
		expect( colorCheckbox( container ) ).toBeInTheDocument();
		expect( colorCheckbox( container ).checked ).toBe( true );
		expect( latestState.postMeta.data_point_colors ).toBe( true );
	} );
} );
