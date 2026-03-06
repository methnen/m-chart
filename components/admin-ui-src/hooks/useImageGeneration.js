import { useCallback, useRef } from '@wordpress/element';
import { useChartAdmin } from '../context/ChartAdminContext';

function bridgeFormSubmission( enable ) {
	if ( window.m_chart_admin && typeof window.m_chart_admin.form_submission === 'function' ) {
		window.m_chart_admin.form_submission( enable );
	}
}

/**
 * Returns a stable `generateImage` callback that captures the current Chart.js
 * instance as a PNG, writes it to the hidden img textarea, then re-enables the form.
 *
 * Mirrors m_chart_chartjs_admin.generate_image_from_chart.
 *
 * @param {React.MutableRefObject} chartRef  Ref holding the Chart.js instance.
 */
export function useImageGeneration( chartRef ) {
	const { state, dispatch } = useChartAdmin();

	// Keep a ref so the callback always sees the latest state without being recreated.
	const stateRef = useRef( state );
	stateRef.current = state;

	const generateImage = useCallback( () => {
		const chart = chartRef.current;
		if ( ! chart ) {
			return;
		}

		const { imageWidth, postMeta } = stateRef.current;
		const chartWidth  = parseInt( imageWidth, 10 );
		const chartHeight = parseInt( postMeta.height, 10 );

		const canvas    = chart.canvas;
		const container = canvas.parentElement;

		// Resize container to image dimensions so chart fills the right area.
		container.style.width  = chartWidth + 'px';
		container.style.height = chartHeight + 'px';
		chart.resize();

		// Fill solid white background (canvas is transparent by default).
		const ctx = canvas.getContext( '2d' );
		ctx.save();
		ctx.globalCompositeOperation = 'destination-over';
		ctx.fillStyle = 'white';
		ctx.fillRect( 0, 0, chart.width, chart.height );
		ctx.restore();

		// Capture PNG.
		const img = chart.toBase64Image( 'image/png', 1 );

		// Restore container to natural dimensions.
		container.style.width  = '';
		container.style.height = '';
		chart.resize();

		// Write base64 string to the hidden textarea for form POST.
		const imgEl = document.getElementById( 'm-chart-img' );
		if ( imgEl ) {
			imgEl.value = img;
		}

		// Re-enable form submission.
		dispatch( { type: 'SET_FORM_ENABLED', payload: true } );
		bridgeFormSubmission( true );
	}, [ chartRef, dispatch ] ); // eslint-disable-line react-hooks/exhaustive-deps

	return generateImage;
}
