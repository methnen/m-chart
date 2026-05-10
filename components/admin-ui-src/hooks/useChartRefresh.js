import { useEffect, useRef } from '@wordpress/element';
import { speak } from '@wordpress/a11y';
import { __ } from '@wordpress/i18n';
import { useChartAdmin } from '../context/ChartAdminContext';

/**
 * Fires an AJAX request to get updated chart args whenever postMeta, spreadsheetData, setNames, or title changes
 * We pass title as a parameter because it's core WP and not present in the React environment
 *
 * @param {string} title The current post title (read from #title DOM input).
 */
export function useChartRefresh( title ) {
	const { state, dispatch } = useChartAdmin();
	const {
		postId, nonce, ajaxUrl, library,
		postMeta, spreadsheetData, setNames,
		performance, imageSupport,
		chartArgs,
	} = state;

	const timerRef        = useRef( null );
	const abortRef        = useRef( null );
	const isFirstRun      = useRef( true );
	const isMountedRef    = useRef( true );
	const requestTokenRef = useRef( 0 );

	// Track unmount so we don't dispatch after the component is gone
	useEffect( () => () => { isMountedRef.current = false; }, [] );

	// Keep a ref to the values that aren't in the effect deps so the async callback
	// always reads the latest version without needing them in the deps array
	const latestRef = useRef( null );
	latestRef.current = { postId, nonce, ajaxUrl, library, performance, imageSupport };

	useEffect( () => {
		// On first run we want to skip rendering since the chart will already be rendered
		// But only if it's not a brand new chart (chartArgs being null indcates chart is new)
		if ( isFirstRun.current && null !== chartArgs ) {
			isFirstRun.current = false;

			return;
		}

		// Cancel any pending debounce
		if ( timerRef.current ) {
			clearTimeout( timerRef.current );
		}

		timerRef.current = setTimeout( async () => {
			// This should cancel any currently running requests so only the most recent request is run
			if ( abortRef.current ) {
				abortRef.current.abort();
			}

			abortRef.current = new AbortController();

			// Bump the token so any older in-flight request that resolves later can detect it's stale
			const myToken = ++requestTokenRef.current;

			// Read from the ref so the async body always has the latest values even if
			// the component re-rendered between when the timeout was scheduled and when it fires
			// eslint-disable-next-line no-shadow -- intentional: same names, fresh-via-ref values
			const { postId, nonce, ajaxUrl, library, performance, imageSupport } = latestRef.current;

			dispatch( { type: 'SET_REFRESHING', payload: true } );
			dispatch( { type: 'SET_FORM_ENABLED', payload: false } );

			try {
				// Start buidling the values we'll send to the m_chart_get_chart_args endpoint
				const body = new URLSearchParams();
				body.append( 'post_id', postId );
				body.append( 'nonce', nonce );
				body.append( 'library', library );
				body.append( 'title', title || '' );

				// Build post_meta matching the format the m_chart_get_chart_args expects
				// Exclude set_names since it is sent separately as indexed PHP array values
				const meta = { ...postMeta };
				delete meta.set_names;
				meta.data = JSON.stringify( spreadsheetData );

				Object.entries( meta ).forEach( ( [ key, val ] ) => {
					let serialized;

					if ( typeof val === 'boolean' ) {
						// PHP's (boolean) cast treats any non-empty string as true, including "false"
						// Use 1/0 so unchecked checkboxes are correctly read as false
						serialized = val ? '1' : '0';
					} else if ( typeof val === 'object' && val !== null ) {
						serialized = JSON.stringify( val );
					} else {
						serialized = val ?? '';
					}

					body.append( `post_meta[${ key }]`, serialized );
				} );

				// set_names must arrive in PHP as an array, not a JSON string
				// Sending post_meta[set_names][0], [1], … lets PHP parse it as an array
				( setNames || [] ).forEach( ( name, i ) => {
					body.append( `post_meta[set_names][${ i }]`, name );
				} );

				// Make the actual request to the endpoint
				const response = await fetch( ajaxUrl + '?action=m_chart_get_chart_args', {
					method: 'POST',
					body,
					signal: abortRef.current.signal,
				} );

				const json = await response.json();

				// Drop the response if the component has unmounted or a newer request was launched in the meantime
				if ( ! isMountedRef.current || myToken !== requestTokenRef.current ) {
					return;
				}

				// If the request succeeded we dispatch the returned data nd then trigger the m_chart.chart_args_success hook and pass it the new data and postId
				if ( json.success ) {
					dispatch( { type: 'SET_CHART_ARGS', payload: json.data } );
					speak( __( 'Chart refreshed', 'm-chart' ) );

					if ( window.wp && window.wp.hooks ) {
						window.wp.hooks.doAction( 'm_chart.chart_args_success', json.data, postId );
					}

					// If no image generation is needed, enable the form now
					// Otherwise ChartPreview's animation.onComplete enables it after capture
					if ( 'default' !== performance || 'yes' !== imageSupport ) {
						dispatch( { type: 'SET_FORM_ENABLED', payload: true } );
					}
				}
			} catch ( err ) {
				if ( err.name !== 'AbortError' ) {
					// eslint-disable-next-line no-console
					console.error( 'm-chart: chart refresh failed', err );
				}
			} finally {
				if ( isMountedRef.current && myToken === requestTokenRef.current ) {
					dispatch( { type: 'SET_REFRESHING', payload: false } );
				}
			}
		}, 300 );

		return () => {
			if ( timerRef.current ) {
				clearTimeout( timerRef.current );
			}
		};
		// chartArgs is intentionally excluded: it's read only on the first run via the
		// isFirstRun ref guard; including it would re-fire on every successful refresh
		// (since SET_CHART_ARGS updates chartArgs) and start an infinite fetch loop.
		// dispatch is React-stable per the docs but still listed for completeness.
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [ postMeta, spreadsheetData, setNames, title, dispatch ] );
}
