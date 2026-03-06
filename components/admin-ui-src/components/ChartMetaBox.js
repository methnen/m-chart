import { useState, useEffect } from '@wordpress/element';
import { useChartRefresh } from '../hooks/useChartRefresh';
import ChartPreview from './ChartPreview';
import ChartSettings from './ChartSettings';

/**
 * Root component for the chart meta box.
 *
 * Owns the title state (read from the classic WP #title input) and wires
 * useChartRefresh so chart args are re-fetched whenever settings or data change.
 * The subtitle input is now a React-controlled SubtitleField component mounted
 * via a separate portal — no DOM bridge needed here.
 */
export default function ChartMetaBox() {
	const [ title, setTitle ] = useState( () => {
		const el = document.getElementById( 'title' );
		return el ? el.value : '';
	} );

	// Keep the React title state in sync with the native WP title input.
	useEffect( () => {
		const el = document.getElementById( 'title' );
		if ( ! el ) {
			return;
		}
		const handler = ( e ) => setTitle( e.target.value );
		el.addEventListener( 'input', handler );
		return () => el.removeEventListener( 'input', handler );
	}, [] );

	useChartRefresh( title );

	return (
		<>
			<ChartPreview />
			<ChartSettings />
		</>
	);
}
