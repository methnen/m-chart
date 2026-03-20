import { useCallback, useRef } from '@wordpress/element';

const LONG_PRESS_DELAY = 500;

/**
 * Returns pointer-event handlers that fire `callback` after a sustained press
 * Spread the returned object onto any element: <div {...longPress} />
 *
 * Replaces jQuery Mobile's `taphold` event for tab-rename triggering
 */
export function useLongPress( callback ) {
	const timerRef = useRef( null );

	const cancel = useCallback( () => {
		if ( timerRef.current ) {
			clearTimeout( timerRef.current );
			timerRef.current = null;
		}
	}, [] );

	const start = useCallback( ( e ) => {
		// Only respond to primary pointer (left-click / first touch)
		if ( e.button !== undefined && e.button !== 0 ) {
			return;
		}
		cancel();
		timerRef.current = setTimeout( () => {
			timerRef.current = null;
			callback( e );
		}, LONG_PRESS_DELAY );
	}, [ callback, cancel ] );

	return {
		onPointerDown:   start,
		onPointerUp:     cancel,
		onPointerLeave:  cancel,
		onPointerCancel: cancel,
	};
}
