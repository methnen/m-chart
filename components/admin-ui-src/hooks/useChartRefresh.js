import { useEffect, useRef } from '@wordpress/element';
import { useChartAdmin } from '../context/ChartAdminContext';

const DEBOUNCE_MS = 300;

/**
 * Bridge helper — keeps React formEnabled state in sync with jQuery's
 * m_chart_admin.allow_form_submission so the PHP submit handler still works.
 */
function bridgeFormSubmission( enable ) {
	if ( window.m_chart_admin && typeof window.m_chart_admin.form_submission === 'function' ) {
		window.m_chart_admin.form_submission( enable );
	}
}

/**
 * Fires an AJAX request to get updated chart args whenever postMeta,
 * spreadsheetData, setNames, or title changes.
 *
 * @param {string} title The current post title (read from #title DOM input).
 */
export function useChartRefresh( title ) {
	const { state, dispatch } = useChartAdmin();
	const {
		postId, nonce, ajaxUrl, library,
		postMeta, spreadsheetData, setNames,
		performance, imageSupport,
	} = state;

	const timerRef   = useRef( null );
	const abortRef   = useRef( null );
	const isFirstRun = useRef( true );

	useEffect( () => {
		// Skip the initial mount — the chart is already rendered from the PHP-seeded args.
		if ( isFirstRun.current ) {
			isFirstRun.current = false;
			return;
		}

		// Cancel any pending debounce
		if ( timerRef.current ) {
			clearTimeout( timerRef.current );
		}

		timerRef.current = setTimeout( async () => {
			// Cancel any in-flight request
			if ( abortRef.current ) {
				abortRef.current.abort();
			}

			abortRef.current = new AbortController();

			dispatch( { type: 'SET_REFRESHING', payload: true } );
			dispatch( { type: 'SET_FORM_ENABLED', payload: false } );
			bridgeFormSubmission( false );

			try {
				const body = new URLSearchParams();
				body.append( 'post_id', postId );
				body.append( 'nonce', nonce );
				body.append( 'library', library );
				body.append( 'title', title || '' );

				// Build post_meta matching the format ajax_get_chart_args expects.
				// Exclude set_names — sent separately as indexed PHP array values.
				const meta = { ...postMeta };
				delete meta.set_names;
				meta.data = JSON.stringify( spreadsheetData );

				Object.entries( meta ).forEach( ( [ key, val ] ) => {
					let serialized;
					if ( typeof val === 'boolean' ) {
						// PHP's (bool) cast treats any non-empty string as true, including "false".
						// Use "1"/"0" so unchecked checkboxes are correctly read as falsy.
						serialized = val ? '1' : '0';
					} else if ( typeof val === 'object' && val !== null ) {
						serialized = JSON.stringify( val );
					} else {
						serialized = val ?? '';
					}
					body.append( `post_meta[${ key }]`, serialized );
				} );

				// set_names must arrive in PHP as an array, not a JSON string.
				// Sending post_meta[set_names][0], [1], … lets PHP parse it as an array.
				( setNames || [] ).forEach( ( name, i ) => {
					body.append( `post_meta[set_names][${ i }]`, name );
				} );

				const response = await fetch( ajaxUrl + '?action=m_chart_get_chart_args', {
					method: 'POST',
					body,
					signal: abortRef.current.signal,
				} );

				const json = await response.json();

				if ( json.success ) {
					dispatch( { type: 'SET_CHART_ARGS', payload: json.data } );

					if ( window.wp && window.wp.hooks ) {
						window.wp.hooks.doAction( 'm_chart.chart_args_success', json.data, postId );
					}

					// If no image generation is needed, enable the form now.
					// Otherwise ChartPreview's animation.onComplete enables it after capture.
					if ( 'default' !== performance || 'yes' !== imageSupport ) {
						dispatch( { type: 'SET_FORM_ENABLED', payload: true } );
						bridgeFormSubmission( true );
					}
				}
			} catch ( err ) {
				if ( err.name !== 'AbortError' ) {
					// eslint-disable-next-line no-console
					console.error( 'm-chart: chart refresh failed', err );
				}
			} finally {
				dispatch( { type: 'SET_REFRESHING', payload: false } );
			}
		}, DEBOUNCE_MS );

		return () => {
			if ( timerRef.current ) {
				clearTimeout( timerRef.current );
			}
		};
	}, [ postMeta, spreadsheetData, setNames, title ] ); // eslint-disable-line react-hooks/exhaustive-deps
}
