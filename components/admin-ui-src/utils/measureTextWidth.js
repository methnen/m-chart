/**
 * Measures the pixel width needed to display a string inside a given input element, using a canvas and the input's computed font style
 *
 * Falls back to a character-count estimate if the input element is not yet mounted (e.g. on the first render before refs are attached)
 *
 * @param {string}           text    The string to measure
 * @param {HTMLInputElement} inputEl The input element whose font to use
 * 
 * @return {number} Width in pixels
 */
export function measureTextWidth( text, inputEl ) {
	if ( ! inputEl ) {
		return Math.max( 40, text.length * 8 + 16 );
	}

	const style  = window.getComputedStyle( inputEl );
	const canvas = document.createElement( 'canvas' );
	const ctx    = canvas.getContext( '2d' );
	ctx.font     = style.font;

	const textWidth    = Math.ceil( ctx.measureText( text ).width ) + 1;
	const borderWidth  = parseFloat( style.borderWidth ) || 0;
	const paddingLeft  = parseFloat( style.paddingLeft ) || 0;
	const paddingRight = parseFloat( style.paddingRight ) || 0;

	return ( borderWidth * 2 ) + paddingLeft + textWidth + paddingRight;
}
