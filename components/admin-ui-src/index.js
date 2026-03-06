import { createRoot, createPortal } from '@wordpress/element';
import { ChartAdminProvider } from './context/ChartAdminContext';
import ChartMetaBox from './components/ChartMetaBox';
import SpreadsheetMetaBox from './components/SpreadsheetMetaBox';
import SubtitleField from './components/SubtitleField';

/**
 * The admin UI spans multiple meta boxes and the title area, so we use a single
 * React root (in a hidden container) with portals to render into each mount point.
 * This ensures all components share a single ChartAdminContext instance.
 */

// Register Chart.js plugins before any chart instances are created.
if ( window.Chart && window.ChartDataLabels ) {
	window.Chart.register( window.ChartDataLabels );
}

const subtitleRoot    = document.getElementById( 'm-chart-subtitle-root' );
const spreadsheetRoot = document.getElementById( 'm-chart-spreadsheet-root' );
const chartRoot       = document.getElementById( 'm-chart-chart-root' );

if ( subtitleRoot || spreadsheetRoot || chartRoot ) {
	const App = () => (
		<ChartAdminProvider>
			{ subtitleRoot    && createPortal( <SubtitleField />,       subtitleRoot    ) }
			{ spreadsheetRoot && createPortal( <SpreadsheetMetaBox />,  spreadsheetRoot ) }
			{ chartRoot       && createPortal( <ChartMetaBox />,        chartRoot       ) }
		</ChartAdminProvider>
	);

	// Mount the app into a hidden container appended to the post form.
	// All visible content is rendered via portals into the actual meta box divs.
	const postForm = document.getElementById( 'post' );

	if ( postForm ) {
		const container = document.createElement( 'div' );
		container.id = 'm-chart-admin-app';
		container.hidden = true;
		postForm.appendChild( container );
		createRoot( container ).render( <App /> );
	}
}
