import { __, sprintf } from '@wordpress/i18n';
import { useChartAdmin } from '../context/ChartAdminContext';
import SheetTab from './SheetTab';

/**
 * Chart types that support multiple data sets (multiple spreadsheet sheets)
 * All other types use a single sheet and the tab bar is hidden
 */
const MULTI_SHEET_TYPES = new Set( [
	'scatter',
	'bubble',
	'radar',
	'radar-area',
] );

/**
 * The spreadsheet tab bar
 * Renders one SheetTab per sheet and an Add Sheet button
 * The entire bar is hidden when the current chart type only supports a single data set
 */
export default function SheetTabs() {
	const { state, dispatch } = useChartAdmin();
	const { postMeta, sheetIds, setNames, activeSheet, newSheetId } = state;

	// Allow library plugins to customize which chart types support multiple sheets
	const multiSheetTypes = window.wp?.hooks
		? wp.hooks.applyFilters( 'm_chart.multi_sheet_types', [ ...MULTI_SHEET_TYPES ] )
		: [ ...MULTI_SHEET_TYPES ];

	const showTabs = new Set( multiSheetTypes ).has( postMeta.type );

	function handleAddSheet( e ) {
		e.preventDefault();

		dispatch( { type: 'ADD_SHEET', payload: {} } );
	}

	return (
		<nav id="spreadsheet-tabs" className={ `nav-tab-wrapper${ showTabs ? '' : ' hide' }` }>
			{ sheetIds.map( ( id, index ) => (
				<SheetTab
					key={ id }
					sheetId={ id }
					sheetIndex={ index }
					name={ setNames[ index ] || sprintf( __( 'Sheet %d', 'm-chart' ), index + 1 ) }
					isActive={ index === activeSheet }
					isSingle={ sheetIds.length === 1 }
					isNew={ id === newSheetId }
				/>
			) ) }
			<a
				href="#add-sheet"
				className="add-sheet"
				title={ __( 'Add Sheet', 'm-chart' ) }
				onClick={ handleAddSheet }
			>
				<span className="dashicons dashicons-plus-alt" />
			</a>
		</nav>
	);
}
