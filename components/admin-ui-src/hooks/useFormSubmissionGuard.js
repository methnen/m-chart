import { useLayoutEffect } from '@wordpress/element';
import { useChartAdmin } from '../context/ChartAdminContext';

const BUTTON_IDS = [ 'save-post', 'wp-preview', 'post-preview', 'publish' ];

/**
 * Keeps the WordPress Save/Publish buttons and form submission gated on state.formEnabled
 *
 * When formEnabled is false:
 *   - Adds the 'disabled' class to the WP submit buttons
 *   - Blocks form submission via a submit event listener
 *
 * When formEnabled is true:
 *   - Removes the 'disabled' class from those buttons
 *   - Allows form submission through normally
 */
export function useFormSubmissionGuard() {
	const { state } = useChartAdmin();
	const { formEnabled } = state;

	// Both of these are layout effects, so the buttons and the form change in the same breath as formEnabled does
	// A plain effect runs a moment later, and a click made while the preview was finishing is handled in that moment:
	// the click handlers in SpreadsheetMetaBox already saw the form as ready and let it through,
	// while WordPress still saw the disabled class and ignored it, or this hook's own submit listener still refused it
	// Either way nothing was saved, and the second way WordPress had already disabled its buttons for the save

	// Toggle disabled class on WP buttons
	useLayoutEffect( () => {
		BUTTON_IDS.forEach( ( id ) => {
			const el = document.getElementById( id );

			if ( el ) {
				el.classList.toggle( 'disabled', ! formEnabled );
			}
		} );
	}, [ formEnabled ] );

	// Block form submission when not ready
	useLayoutEffect( () => {
		const form = document.getElementById( 'post' );

		if ( ! form ) {
			return;
		}

		function handleSubmit( e ) {
			if ( ! formEnabled ) {
				e.preventDefault();
			}
		}

		form.addEventListener( 'submit', handleSubmit );

		return () => form.removeEventListener( 'submit', handleSubmit );
	}, [ formEnabled ] );
}
