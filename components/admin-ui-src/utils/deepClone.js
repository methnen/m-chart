/**
 * Deep copy of plain objects and arrays
 *
 * Anything else (functions, class instances such as a Date or a Chart.js instance) is kept by reference,
 * so a filter can be handed a copy of the chart args without losing callbacks a plugin put in them
 *
 * @param {*} value The value to copy
 * @return {*} The copy
 */
export function deepClone( value ) {
	if ( Array.isArray( value ) ) {
		return value.map( deepClone );
	}

	if ( value && 'object' === typeof value ) {
		const proto = Object.getPrototypeOf( value );

		if ( null === proto || Object.prototype === proto ) {
			const copy = {};

			for ( const key of Object.keys( value ) ) {
				copy[ key ] = deepClone( value[ key ] );
			}

			return copy;
		}
	}

	return value;
}
