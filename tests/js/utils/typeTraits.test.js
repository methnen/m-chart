/**
 * Unit tests for the hasTrait() helper the settings rows use
 */
import { hasTrait } from '../../../components/admin-ui-src/utils/typeTraits';

describe( 'hasTrait', () => {
	test( 'reads an explicit trait from the PHP supplied table', () => {
		const traits = { custom: { axes: false, legend: false, shared_tooltip: true } };

		expect( hasTrait( traits, 'custom', 'axes' ) ).toBe( false );
		expect( hasTrait( traits, 'custom', 'legend' ) ).toBe( false );
		expect( hasTrait( traits, 'custom', 'shared_tooltip' ) ).toBe( true );
	} );

	test( 'falls back to the pre-2.4 lists for a type the table does not know', () => {
		expect( hasTrait( {}, 'line', 'shared_tooltip' ) ).toBe( true );
		expect( hasTrait( {}, 'pie', 'shared_tooltip' ) ).toBe( false );
		expect( hasTrait( {}, 'treemap', 'legend' ) ).toBe( false );
		expect( hasTrait( {}, 'bar', 'legend' ) ).toBe( true );
		expect( hasTrait( {}, 'boxplot', 'labels' ) ).toBe( false );
		expect( hasTrait( {}, 'violin', 'constrain_y' ) ).toBe( true );
		expect( hasTrait( {}, 'radar', 'axes' ) ).toBe( false );
		expect( hasTrait( {}, 'scatter', 'axes' ) ).toBe( true );
		expect( hasTrait( null, 'line', 'y_min' ) ).toBe( true );
	} );

	test( 'a trait missing from a known type row still falls back', () => {
		expect( hasTrait( { line: { axes: true } }, 'line', 'shared_tooltip' ) ).toBe( true );
	} );

	test( 'an unknown trait name is false', () => {
		expect( hasTrait( {}, 'line', 'nope' ) ).toBe( false );
	} );
} );
