import { useEffect } from '@wordpress/element';
import { useChartAdmin } from '../context/ChartAdminContext';

const BUTTON_IDS = [ 'save-post', 'wp-preview', 'post-preview', 'publish' ];

/**
 * Keeps the WordPress Save/Publish buttons and form submission gated on
 * state.formEnabled — replacing the jQuery m_chart_admin.form_submission bridge.
 *
 * When formEnabled is false:
 *   - Adds the 'disabled' class to the WP submit buttons.
 *   - Blocks form submission via a submit event listener.
 *
 * When formEnabled is true:
 *   - Removes the 'disabled' class from those buttons.
 *   - Allows form submission through normally.
 */
export function useFormSubmissionGuard() {
	const { state } = useChartAdmin();
	const { formEnabled } = state;

	// Toggle disabled class on WP buttons.
	useEffect( () => {
		BUTTON_IDS.forEach( ( id ) => {
			const el = document.getElementById( id );
			
			if ( el ) {
				el.classList.toggle( 'disabled', ! formEnabled );
			}
		} );
	}, [ formEnabled ] );

	// Block form submission when not ready.
	useEffect( () => {
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
