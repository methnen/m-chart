import { Button } from '@wordpress/components';
import { useMemo } from '@wordpress/element';
import { __, sprintf } from '@wordpress/i18n';
import { useChartAdmin } from '../context/ChartAdminContext';
import { circlePlus } from '../icons';
import SheetTab from './SheetTab';

/**
 * The spreadsheet tab bar
 * Renders one SheetTab per sheet and an Add Sheet button
 * The entire bar is hidden when the current chart type only supports a single data set
 *
 * The authoritative list of multi-sheet types comes from PHP via window.m_chart_admin.multi_sheet_types
 * (see M_Chart::get_multi_sheet_types() and the 'm_chart_multi_sheet_types' PHP filter).
 */
export default function SheetTabs() {
	const { state, dispatch } = useChartAdmin();
	const { postMeta, sheetIds, setNames, activeSheet, newSheetId, sheetEditingDisabled } = state;

	// Read the PHP-authoritative multi-sheet type list, memoised for stable reference
	const multiSheetTypes = useMemo(
		() => new Set( m_chart_admin.multi_sheet_types || [] ),
		[]
	);

	const showTabs = multiSheetTypes.has( postMeta.type );

	function handleAddSheet( e ) {
		e.preventDefault();

		dispatch( { type: 'ADD_SHEET', payload: {} } );
	}

	return (
		<div
			id="spreadsheet-tabs"
			className={ `components-tab-panel__tabs m-chart-sheet-tabs${ showTabs ? '' : ' m-chart-hide' }${ sheetEditingDisabled ? ' editing-disabled' : '' }` }
			role="tablist"
		>
			{ ! sheetEditingDisabled && (
				<Button
					className="m-chart-add-sheet"
					icon={ circlePlus }
					label={ __( 'Add Sheet', 'm-chart' ) }
					onClick={ handleAddSheet }
				/>
			) }
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
		</div>
	);
}
