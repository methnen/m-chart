import { Button } from '@wordpress/components';
import { useEffect, useMemo } from '@wordpress/element';
import { speak } from '@wordpress/a11y';
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
 * See M_Chart::get_multi_sheet_types() and the 'm_chart_multi_sheet_types' PHP filter
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

	// Defensive: if activeSheet ever lands out of bounds (e.g. mid-delete), fall back to 0 so at least one tab is always in the tab order
	const validActive = sheetIds[ activeSheet ] !== undefined ? activeSheet : 0;

	function handleAddSheet( e ) {
		e.preventDefault();

		dispatch( { type: 'ADD_SHEET', payload: {} } );
		speak( __( 'New sheet added', 'm-chart' ) );
	}

	// ARIA tabs pattern: ArrowLeft/ArrowRight/Home/End move focus + activate the target tab
	// Each SheetTab dispatches a custom 'm-chart-tab-nav' event with the requested key
	useEffect( () => {
		const el = document.getElementById( 'spreadsheet-tabs' );

		if ( ! el ) {
			return;
		}

		function handler( e ) {
			const { key, fromIndex } = e.detail;
			const last = sheetIds.length - 1;
			let target = fromIndex;

			if ( 'ArrowLeft' === key ) {
				target = fromIndex > 0 ? fromIndex - 1 : last;
			}
			if ( 'ArrowRight' === key ) {
				target = fromIndex < last ? fromIndex + 1 : 0;
			}
			if ( 'Home' === key ) {
				target = 0;
			}
			if ( 'End' === key ) {
				target = last;
			}

			dispatch( { type: 'SET_ACTIVE_SHEET', payload: target } );

			// Move focus to the new active tab after React commits
			setTimeout( () => {
				document.getElementById( `spreadsheet-tab-${ sheetIds[ target ] }` )?.focus();
			}, 0 );
		}

		el.addEventListener( 'm-chart-tab-nav', handler );

		return () => el.removeEventListener( 'm-chart-tab-nav', handler );
	}, [ sheetIds, dispatch ] );

	return (
		<div
			id="spreadsheet-tabs"
			className={ `components-tab-panel__tabs m-chart-sheet-tabs${ showTabs ? '' : ' m-chart-hide' }${ sheetEditingDisabled ? ' editing-disabled' : '' }` }
			role="tablist"
			aria-label={ __( 'Spreadsheet sheets', 'm-chart' ) }
			aria-orientation="horizontal"
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
					name={
						setNames[ index ] ||
						/* translators: %d: the sheet's 1-based ordinal (e.g. "Sheet 2") */
						sprintf( __( 'Sheet %d', 'm-chart' ), index + 1 )
					}
					isActive={ index === validActive }
					isSingle={ sheetIds.length === 1 }
					isNew={ id === newSheetId }
				/>
			) ) }
		</div>
	);
}
