/**
 * Unit tests for isSimple2DSeries (used to gate the "Color per data point"
 * checkbox in TypeAndThemeRow). Trailing empty cells from Jspreadsheet's
 * minDimensions padding must not inflate the apparent column count.
 */
import { isSimple2DSeries } from '../../../components/admin-ui-src/components/TypeAndThemeRow';

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
