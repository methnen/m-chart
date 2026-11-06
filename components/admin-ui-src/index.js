import { createRoot, createPortal } from '@wordpress/element';
import { ChartAdminProvider, useChartAdmin, useChartDispatch, setFormEnabled } from './context/ChartAdminContext';
import ChartMetaBox         from './components/ChartMetaBox';
import SpreadsheetMetaBox   from './components/SpreadsheetMetaBox';
import SubtitleField        from './components/SubtitleField';
import TypeAndThemeRow, { isSimple2DSeries } from './components/TypeAndThemeRow';
import { spreadsheetAutoWidth } from './components/JspreadsheetWrapper';
import { measureTextWidth } from './utils/measureTextWidth';
import { hasTrait } from './utils/typeTraits';
import { deepClone } from './utils/deepClone';
import ParseAndFlagsRow     from './components/ParseAndFlagsRow';
import AxisRows             from './components/AxisRows';
import SourceRow            from './components/SourceRow';
import ShortcodeAndImageRow from './components/ShortcodeAndImageRow';
import { defaultChartjsRender } from './components/ChartPreview';

// Expose shared context hooks, settings row components and the small utilities the rows are built from, for library plugins
// that implement the m_chart.settings_component filter without a build step
// defaultChartjsRender lets a plugin render Chart.js itself, e.g. when its m_chart.render_chart filter wants to own the instance
window.m_chart = {
	useChartAdmin,
	useChartDispatch,
	TypeAndThemeRow,
	ParseAndFlagsRow,
	AxisRows,
	SourceRow,
	ShortcodeAndImageRow,
	defaultChartjsRender,
	setFormEnabled,
	isSimple2DSeries,
	spreadsheetAutoWidth,
	measureTextWidth,
	hasTrait,
	deepClone,
};

/**
 * The admin UI spans multiple meta boxes and the title area
 * We use a single React root (in a hidden container) with portals to render into each mount point
 * This ensures all components share a single ChartAdminContext instance
 */

// Register Chart.js plugins before any chart instances are created
// PHP lists the window globals (core's plus anything added through m_chart_chartjs_plugins), the names are a fallback for an old localize payload
if ( window.Chart ) {
	const pluginGlobals = window.m_chart_admin?.chartjs_plugin_globals || [ 'MChartHelper', 'ChartDataLabels' ];

	pluginGlobals.forEach( ( name ) => {
		if ( window[ name ] ) {
			window.Chart.register( window[ name ] );
		}
	} );
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
