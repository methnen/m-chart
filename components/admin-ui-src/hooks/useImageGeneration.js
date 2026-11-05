import { useCallback, useRef } from '@wordpress/element';
import { speak } from '@wordpress/a11y';
import { __ } from '@wordpress/i18n';
import { useChartAdmin } from '../context/ChartAdminContext';

/**
 * Returns a stable `generateImage` callback that captures the current chart instance as a PNG, writes it to the hidden img textarea, then re-enables the form
 *
 * Three kinds of instance are handled, in this order:
 * - one with a captureImage( { width, multiplier } ) method, which resolves to a PNG data URL (or null to skip the image) and is awaited
 * - a Chart.js instance, captured from its canvas
 * - anything else (e.g. Highcharts), which handles image generation through the m_chart.render_done action instead
 *
 * @param {Object} chartRef React ref (`useRef`) holding the chart instance
 */
export function useImageGeneration( chartRef ) {
	const { state, dispatch } = useChartAdmin();

	// Keep a ref so the callback always sees the latest state without being recreated
	const stateRef = useRef( state );
	stateRef.current = state;

	const generateImage = useCallback( () => {
		const chart = chartRef.current;

		// Writes the image (when there is one), announces it and re-enables the form
		function finishCapture( img ) {
			if ( 'string' === typeof img && img ) {
				const imgEl = document.getElementById( 'm-chart-img' );

				if ( imgEl ) {
					imgEl.value = img;
				}

				if ( window.wp?.hooks ) {
					window.wp.hooks.doAction( 'm_chart.image_capture_done', stateRef.current.postId, chart, img );
				}

				speak( __( 'Chart image generated', 'm-chart' ) );
			}

			// Re-enable form submission, the provider fires m_chart.form_enabled
			dispatch( { type: 'SET_FORM_ENABLED', payload: true } );
		}

		// Nothing rendered yet, there's no capture coming so don't leave Save blocked
		if ( ! chart ) {
			dispatch( { type: 'SET_FORM_ENABLED', payload: true } );

			return;
		}

		if ( 'function' === typeof chart.captureImage ) {
			const { imageWidth, imageMultiplier } = stateRef.current;

			Promise.resolve( chart.captureImage( {
				width:      parseInt( imageWidth, 10 ),
				multiplier: parseFloat( imageMultiplier ) || 1,
			} ) ).then( finishCapture, ( err ) => {
				// eslint-disable-next-line no-console
				console.error( 'm-chart: image capture failed', err );
				finishCapture( null );
			} );

			return;
		}

		// Non-canvas libraries (e.g. Highcharts) handle image generation via the m_chart.render_done action hook instead
		if ( ! chart.canvas ) {
			dispatch( { type: 'SET_FORM_ENABLED', payload: true } );

			return;
		}

		const { imageWidth, postMeta } = stateRef.current;
		const chartWidth  = parseInt( imageWidth, 10 );
		const chartHeight = parseInt( postMeta.height, 10 );

		const canvas    = chart.canvas;
		const container = canvas.parentElement;

		// Resize container to image dimensions so chart fills the right area
		container.style.width  = chartWidth + 'px';
		container.style.height = chartHeight + 'px';
		chart.resize();

		// Fill solid white background (canvas is transparent by default)
		const ctx = canvas.getContext( '2d' );
		ctx.save();
		ctx.globalCompositeOperation = 'destination-over';
		ctx.fillStyle = 'white';
		ctx.fillRect( 0, 0, chart.width, chart.height );
		ctx.restore();

		// Capture PNG
		const img = chart.toBase64Image( 'image/png', 1 );

		// Restore container to natural dimensions
		container.style.width  = '';
		container.style.height = '';
		chart.resize();

		finishCapture( img );
	}, [ chartRef, dispatch ] );

	return generateImage;
}
