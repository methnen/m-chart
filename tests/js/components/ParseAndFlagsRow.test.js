/**
 * ParseAndFlagsRow reads which toggles apply to a type from state.typeTraits
 */
import { render, act } from '@testing-library/react';
import ParseAndFlagsRow from '../../../components/admin-ui-src/components/ParseAndFlagsRow';
import { ChartAdminProvider, useChartAdmin } from '../../../components/admin-ui-src/context/ChartAdminContext';

let dispatchRef;

function Capture() {
	dispatchRef = useChartAdmin().dispatch;
	return null;
}

function renderRow( type ) {
	const utils = render(
		<ChartAdminProvider>
			<Capture />
			<ParseAndFlagsRow />
		</ChartAdminProvider>
	);

	act( () => dispatchRef( { type: 'SET_POST_META', payload: { type, parse_in: 'rows' } } ) );

	return utils;
}

// Toggles stay in the DOM so their values survive a type switch, visibility is the wrapper column's inline display
function legendColumnDisplay( container ) {
	return container.querySelector( 'input[name="m-chart[legend]"]' ).closest( '.column' ).style.display;
}

describe( 'ParseAndFlagsRow type traits', () => {
	test( 'a line chart shows the shared tooltip option', () => {
		const { container } = renderRow( 'line' );

		expect( container.querySelector( '.row.two' ).classList.contains( 'show-shared' ) ).toBe( true );

		// wp.components warns about its pre-6.7 margin styles the first time these controls render in this file
		// @wordpress/deprecated logs each message once per process, so only this first test sees it
		expect( console ).toHaveWarned();
	} );

	test( 'a venn chart hides the legend toggle and the shared tooltip', () => {
		const { container } = renderRow( 'venn' );

		expect( container.querySelector( '.row.two' ).classList.contains( 'show-shared' ) ).toBe( false );
		expect( legendColumnDisplay( container ) ).toBe( 'none' );
	} );

	test( 'a bar chart keeps the legend toggle', () => {
		const { container } = renderRow( 'bar' );

		expect( legendColumnDisplay( container ) ).toBe( '' );
	} );
} );
