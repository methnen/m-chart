/**
 * AxisRows renders the unit terms as real optgroups so groups read as groups and only units are selectable
 */
// The y-min width measurement draws on a canvas, which jsdom doesn't implement
jest.mock( '../../../components/admin-ui-src/utils/measureTextWidth', () => ( {
	measureTextWidth: () => 40,
} ) );

const UNIT_TERMS = [
	{ group: 'Money', units: [ { name: 'EUR', slug: 'eur' }, { name: 'USD', slug: 'usd' } ] },
	{ group: 'Weight', units: [ { name: 'Tonnes', slug: 'tonnes' } ] },
];

let createElement;
let render;
let fireEvent;
let act;
let AxisRows;
let ChartAdminProvider;
let useChartAdmin;
let latestState;

function Capture() {
	latestState = useChartAdmin().state;
	return null;
}

// The context reads window.m_chart_admin at module load so the modules are loaded fresh with the terms in place
// React and the testing library load inside the same sandbox so the components and the renderer share one React
// This runs at file level because the testing library registers its cleanup hook when it loads
window.m_chart_admin.unit_terms = UNIT_TERMS;

jest.isolateModules( () => {
	( { createElement } = require( '@wordpress/element' ) );
	( { render, fireEvent, act } = require( '@testing-library/react' ) );
	AxisRows = require( '../../../components/admin-ui-src/components/AxisRows' ).default;
	( { ChartAdminProvider, useChartAdmin } = require( '../../../components/admin-ui-src/context/ChartAdminContext' ) );
} );

afterAll( () => {
	window.m_chart_admin.unit_terms = [];
} );

function renderRows() {
	return render(
		createElement( ChartAdminProvider, null, createElement( Capture ), createElement( AxisRows ) )
	);
}

function optionTexts( parent ) {
	return Array.from( parent.querySelectorAll( ':scope > option' ) ).map( ( option ) => option.textContent );
}

function expectGroupedUnits( select ) {
	const groups = Array.from( select.querySelectorAll( 'optgroup' ) );

	expect( groups.map( ( group ) => group.label ) ).toEqual( [ 'Money', 'Weight' ] );
	expect( optionTexts( groups[ 0 ] ) ).toEqual( [ 'EUR', 'USD' ] );
	expect( optionTexts( groups[ 1 ] ) ).toEqual( [ 'Tonnes' ] );

	// N/A is the only option outside a group and nothing is disabled, group names are labels rather than choices
	expect( optionTexts( select ) ).toEqual( [ 'N/A' ] );
	expect( select.querySelector( ':scope > option' ).value ).toBe( '' );
	expect( select.querySelectorAll( 'option[disabled]' ) ).toHaveLength( 0 );
}

describe( 'AxisRows units dropdown', () => {
	test( 'the vertical axis lists the units under their group', () => {
		const { container } = renderRows();

		expectGroupedUnits( container.querySelector( 'select[name="m-chart[y_units]"]' ) );

		// wp.components warns about its pre-6.7 margin styles the first time these controls render in this file
		// @wordpress/deprecated logs each message once per process, so only this first test sees it
		expect( console ).toHaveWarned();
	} );

	test( 'the horizontal axis offers the same grouped list', () => {
		const { container } = renderRows();
		const ySelect       = container.querySelector( 'select[name="m-chart[y_units]"]' );
		const xSelect       = container.querySelector( 'select[name="m-chart[x_units]"]' );

		expect( xSelect.querySelectorAll( 'optgroup' ) ).toHaveLength( 2 );
		expect( xSelect.innerHTML ).toBe( ySelect.innerHTML );
	} );

	test( 'choosing a unit stores its slug in the post meta', () => {
		const { container } = renderRows();
		const select        = container.querySelector( 'select[name="m-chart[y_units]"]' );

		act( () => {
			fireEvent.change( select, { target: { value: 'usd' } } );
		} );

		expect( latestState.postMeta.y_units ).toBe( 'usd' );
		expect( select.value ).toBe( 'usd' );
	} );
} );
