import { createContext, useContext, useReducer } from '@wordpress/element';

const { m_chart_admin } = window;

/**
 * Initial state populated from the PHP-localised window.m_chart_admin object.
 *
 * post_meta contains all chart meta fields except 'data' (spreadsheetData holds that).
 * Fields mirror the PHP $chart_meta_fields defaults in class-m-chart.php.
 */

// Stable sheet IDs — never change once a sheet is created, survive deletion of siblings.
const initialSheetCount = ( m_chart_admin.spreadsheet_data || [ [] ] ).length;
const initialSheetIds   = Array.from( { length: initialSheetCount }, ( _, i ) => i );

const initialState = {
	slug:             m_chart_admin.slug,
	postId:           m_chart_admin.post_id,
	nonce:            m_chart_admin.nonce,
	ajaxUrl:          m_chart_admin.ajax_url,
	library:          m_chart_admin.library,
	performance:      m_chart_admin.performance,
	imageSupport:     m_chart_admin.image_support,
	instantPreview:   m_chart_admin.instant_preview_support,
	imageMultiplier:  m_chart_admin.image_multiplier,
	imageWidth:       m_chart_admin.image_width,
	deleteConfirm:    m_chart_admin.delete_confirm,
	csvDelimiters:    m_chart_admin.csv_delimiters || { ',': 'Comma' },
	defaultDelimiter: m_chart_admin.default_delimiter || ',',

	// Chart meta fields (type, theme, height, parse_in, labels, legend, etc.)
	postMeta: m_chart_admin.post_meta,

	// Array of 2D arrays, one per sheet (matches Jspreadsheet's getData() format)
	spreadsheetData: m_chart_admin.spreadsheet_data,

	// Array of human-readable names for each sheet tab
	setNames: m_chart_admin.set_names || [],

	// Stable IDs for each sheet — used as React keys to avoid spurious remounts
	sheetIds: initialSheetIds,

	// Counter for the next sheet ID to assign
	nextSheetId: initialSheetCount,

	// ID of the most recently added sheet — SheetTab uses this to auto-enter rename mode
	newSheetId: null,

	// Index of the currently active sheet tab
	activeSheet: 0,

	// Chart.js args object — seeded from PHP on load, updated by useChartRefresh
	chartArgs: m_chart_admin.chart_args || null,

	// True while waiting for ajax_get_chart_args to respond
	isRefreshing: false,

	// Controls whether the WordPress Save/Publish buttons are enabled
	formEnabled: false,

	// Static config from PHP — library-specific options for the settings form
	typeOptions:     m_chart_admin.type_options      || [],
	typeOptionNames: m_chart_admin.type_option_names  || {},
	themes:          m_chart_admin.themes             || [],
	unitTerms:       m_chart_admin.unit_terms         || [],
	imageUrl:        m_chart_admin.image_url          || '',
};

function reducer( state, action ) {
	switch ( action.type ) {
		case 'SET_POST_META':
			return {
				...state,
				postMeta: { ...state.postMeta, ...action.payload },
			};

		case 'SET_SHEET_DATA': {
			const spreadsheetData = [ ...state.spreadsheetData ];
			spreadsheetData[ action.payload.index ] = action.payload.data;
			return { ...state, spreadsheetData };
		}

		case 'ADD_SHEET': {
			const setNames        = [ ...state.setNames, action.payload.name || '' ];
			const spreadsheetData = [ ...state.spreadsheetData, [ [ '' ] ] ];
			const sheetIds        = [ ...state.sheetIds, state.nextSheetId ];
			return {
				...state,
				setNames,
				spreadsheetData,
				sheetIds,
				nextSheetId: state.nextSheetId + 1,
				activeSheet: spreadsheetData.length - 1,
				newSheetId:  state.nextSheetId,
			};
		}

		case 'CLEAR_NEW_SHEET_ID':
			return { ...state, newSheetId: null };

		case 'DELETE_SHEET': {
			if ( state.spreadsheetData.length <= 1 ) {
				return state;
			}
			const idx             = action.payload.index;
			const spreadsheetData = state.spreadsheetData.filter( ( _, i ) => i !== idx );
			const setNames        = state.setNames.filter( ( _, i ) => i !== idx );
			const sheetIds        = state.sheetIds.filter( ( _, i ) => i !== idx );
			const activeSheet     = Math.min( state.activeSheet, spreadsheetData.length - 1 );
			return { ...state, spreadsheetData, setNames, sheetIds, activeSheet };
		}

		case 'RENAME_SHEET': {
			const setNames = [ ...state.setNames ];
			setNames[ action.payload.index ] = action.payload.name;
			return { ...state, setNames };
		}

		case 'SET_ACTIVE_SHEET':
			return { ...state, activeSheet: action.payload };

		case 'SET_CHART_ARGS':
			return { ...state, chartArgs: action.payload };

		case 'SET_REFRESHING':
			return { ...state, isRefreshing: action.payload };

		case 'SET_FORM_ENABLED':
			return { ...state, formEnabled: action.payload };

		case 'SET_SUBTITLE':
			return {
				...state,
				postMeta: { ...state.postMeta, subtitle: action.payload },
			};

		default:
			return state;
	}
}

const ChartAdminContext = createContext( null );

export function ChartAdminProvider( { children } ) {
	const [ state, dispatch ] = useReducer( reducer, initialState );
	
	return (
		<ChartAdminContext.Provider value={ { state, dispatch } }>
			{ children }
		</ChartAdminContext.Provider>
	);
}

/**
 * Convenience hook — returns { state, dispatch } from the nearest provider.
 */
export function useChartAdmin() {
	const context = useContext( ChartAdminContext );
	
	if ( ! context ) {
		throw new Error( 'useChartAdmin must be used within a ChartAdminProvider' );
	}
	
	return context;
}
