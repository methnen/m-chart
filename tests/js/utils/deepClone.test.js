import { deepClone } from '../../../components/admin-ui-src/utils/deepClone';

describe( 'deepClone', () => {
	test( 'copies nested plain objects and arrays', () => {
		const source = { a: [ 1, { b: 2 } ], c: { d: null } };
		const copy   = deepClone( source );

		expect( copy ).toEqual( source );
		expect( copy ).not.toBe( source );
		expect( copy.a ).not.toBe( source.a );
		expect( copy.a[ 1 ] ).not.toBe( source.a[ 1 ] );
		expect( copy.c ).not.toBe( source.c );
	} );

	test( 'keeps functions and class instances by reference', () => {
		const fn   = () => {};
		const date = new Date( 0 );
		const copy = deepClone( { fn, date, list: [ fn ] } );

		expect( copy.fn ).toBe( fn );
		expect( copy.date ).toBe( date );
		expect( copy.list[ 0 ] ).toBe( fn );
	} );

	test( 'passes primitives and null through', () => {
		expect( deepClone( 3 ) ).toBe( 3 );
		expect( deepClone( 'x' ) ).toBe( 'x' );
		expect( deepClone( null ) ).toBeNull();
		expect( deepClone( undefined ) ).toBeUndefined();
	} );
} );
