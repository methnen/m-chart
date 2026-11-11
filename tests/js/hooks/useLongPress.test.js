/**
 * Tests for useLongPress
 *
 * The hook hands back pointer handlers to spread onto an element
 * Holding the primary pointer down for 500ms fires the callback once, anything that ends the press first cancels it
 */
import { fireEvent, render, screen } from '@testing-library/react';
import { useLongPress } from '../../../components/admin-ui-src/hooks/useLongPress';

const HOLD = 500;

function Target( { onLongPress } ) {
	const longPress = useLongPress( onLongPress );

	return <div data-testid="target" { ...longPress } />;
}

function renderTarget() {
	const onLongPress = jest.fn();

	render( <Target onLongPress={ onLongPress } /> );

	return { onLongPress, target: screen.getByTestId( 'target' ) };
}

// jsdom's pointer events carry no button, a mouse event of the same type does and React reads it the same way
function pointerDown( target, button = 0 ) {
	fireEvent( target, new MouseEvent( 'pointerdown', { bubbles: true, cancelable: true, button } ) );
}

describe( 'useLongPress', () => {
	beforeEach( () => {
		jest.useFakeTimers();
	} );

	afterEach( () => {
		jest.useRealTimers();
	} );

	test( 'fires the callback once the press has been held for 500ms and not before', () => {
		const { onLongPress, target } = renderTarget();

		pointerDown( target );

		jest.advanceTimersByTime( HOLD - 1 );

		expect( onLongPress ).not.toHaveBeenCalled();

		jest.advanceTimersByTime( 1 );

		expect( onLongPress ).toHaveBeenCalledTimes( 1 );
	} );

	test( 'hands the callback the event that started the press', () => {
		const { onLongPress, target } = renderTarget();

		pointerDown( target );
		jest.advanceTimersByTime( HOLD );

		expect( onLongPress.mock.calls[ 0 ][ 0 ].type ).toBe( 'pointerdown' );
		expect( onLongPress.mock.calls[ 0 ][ 0 ].target ).toBe( target );
	} );

	test( 'does not fire again while the same press is still held', () => {
		const { onLongPress, target } = renderTarget();

		pointerDown( target );
		jest.advanceTimersByTime( HOLD * 4 );

		expect( onLongPress ).toHaveBeenCalledTimes( 1 );
	} );

	test.each( [
		[ 'releasing the pointer', 'pointerUp' ],
		[ 'the pointer leaving the element', 'pointerLeave' ],
		[ 'the browser cancelling the pointer', 'pointerCancel' ],
	] )( '%s before 500ms cancels the press', ( description, endEvent ) => {
		const { onLongPress, target } = renderTarget();

		pointerDown( target );
		jest.advanceTimersByTime( HOLD - 100 );

		fireEvent[ endEvent ]( target );
		jest.advanceTimersByTime( HOLD * 2 );

		expect( onLongPress ).not.toHaveBeenCalled();
	} );

	test( 'a quick tap followed by a real long press fires once', () => {
		const { onLongPress, target } = renderTarget();

		pointerDown( target );
		jest.advanceTimersByTime( 100 );
		fireEvent.pointerUp( target );

		pointerDown( target );
		jest.advanceTimersByTime( HOLD );

		expect( onLongPress ).toHaveBeenCalledTimes( 1 );
	} );

	test( 'a second pointer down restarts the clock instead of stacking a second timer', () => {
		const { onLongPress, target } = renderTarget();

		pointerDown( target );
		jest.advanceTimersByTime( HOLD - 100 );

		pointerDown( target );
		jest.advanceTimersByTime( HOLD - 100 );

		// 800ms after the first press, but only 400ms after the second
		expect( onLongPress ).not.toHaveBeenCalled();

		jest.advanceTimersByTime( 100 );

		expect( onLongPress ).toHaveBeenCalledTimes( 1 );
	} );

	test.each( [
		[ 'middle', 1 ],
		[ 'right', 2 ],
	] )( 'ignores a press with the %s mouse button', ( name, button ) => {
		const { onLongPress, target } = renderTarget();

		pointerDown( target, button );
		jest.advanceTimersByTime( HOLD * 2 );

		expect( onLongPress ).not.toHaveBeenCalled();
	} );

	test( 'a secondary button press does not cancel a primary press already under way', () => {
		const { onLongPress, target } = renderTarget();

		pointerDown( target );
		jest.advanceTimersByTime( 200 );

		pointerDown( target, 2 );
		jest.advanceTimersByTime( 300 );

		expect( onLongPress ).toHaveBeenCalledTimes( 1 );
	} );

	test( 'a touch or pen press, which reports no button at all, counts as a press', () => {
		const { onLongPress, target } = renderTarget();

		fireEvent( target, new Event( 'pointerdown', { bubbles: true, cancelable: true } ) );
		jest.advanceTimersByTime( HOLD );

		expect( onLongPress ).toHaveBeenCalledTimes( 1 );
	} );

	test( 'releasing after the callback already fired is harmless', () => {
		const { onLongPress, target } = renderTarget();

		pointerDown( target );
		jest.advanceTimersByTime( HOLD );

		expect( () => fireEvent.pointerUp( target ) ).not.toThrow();

		jest.advanceTimersByTime( HOLD );

		expect( onLongPress ).toHaveBeenCalledTimes( 1 );
	} );
} );
