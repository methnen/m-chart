import { createRoot, createPortal } from '@wordpress/element';
import { ChartAdminProvider, useChartAdmin } from './context/ChartAdminContext';
import ChartMetaBox         from './components/ChartMetaBox';
import SpreadsheetMetaBox   from './components/SpreadsheetMetaBox';
import SubtitleField        from './components/SubtitleField';
import TypeAndThemeRow      from './components/TypeAndThemeRow';
import ParseAndFlagsRow     from './components/ParseAndFlagsRow';
import AxisRows             from './components/AxisRows';
import ShortcodeAndImageRow from './components/ShortcodeAndImageRow';

// Expose shared context hook and settings row components for library plugins
// that implement the m_chart.settings_component filter without a build step
window.m_chart = {
	useChartAdmin,
	TypeAndThemeRow,
	ParseAndFlagsRow,
	AxisRows,
	ShortcodeAndImageRow,
};

/**
 * The admin UI spans multiple meta boxes and the title area, so we use a single
 * React root (in a hidden container) with portals to render into each mount point
 * This ensures all components share a single ChartAdminContext instance
 */

// Register Chart.js plugins before any chart instances are created
if ( window.Chart && window.ChartDataLabels ) {
	window.Chart.register( window.ChartDataLabels );
}

if ( window.Chart && window.MChartHelper ) {
	window.Chart.register( window.MChartHelper );
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

	// Mount the app into a hidden container appended to the post form
	// All visible content is rendered via portals into the actual meta box divs
	const postForm = document.getElementById( 'post' );

	if ( postForm ) {
		const container = document.createElement( 'div' );
		container.id = 'm-chart-admin-ui';
		container.hidden = true;
		postForm.appendChild( container );
		createRoot( container ).render( <App /> );
	}
}
