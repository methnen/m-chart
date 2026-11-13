import { Button } from '@wordpress/components';
import { useEffect } from '@wordpress/element';
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
 * The authoritative list of multi-sheet types comes from PHP (state.multiSheetTypes)
 * See M_Chart::get_multi_sheet_types() and the 'm_chart_multi_sheet_types' PHP filter
 */
export default function SheetTabs() {
	const { state, dispatch } = useChartAdmin();
	const { postMeta, sheetIds, setNames, activeSheet, newSheetId, sheetEditingDisabled, multiSheetTypes } = state;

	const showTabs = multiSheetTypes.includes( postMeta.type );

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

			// Focus moves with the selection, in the same key press
			// A tab can be focused from here whatever its tabindex, so there is no need to wait for React to commit
			// Waiting left a moment where the next key press still landed on the old tab and moved from there
			document.getElementById( `spreadsheet-tab-${ sheetIds[ target ] }` )?.focus();
		}

		el.addEventListener( 'm-chart-tab-nav', handler );

		return () => el.removeEventListener( 'm-chart-tab-nav', handler );
	}, [ sheetIds, dispatch ] );

	return (
		<div
			id="spreadsheet-tabs"
			className={ `components-tab-panel__tabs m-chart-sheet-tabs${ showTabs ? '' : ' m-chart-hide' }${ sheetEditingDisabled ? ' editing-disabled' : '' }` }
		>
			{ /*
				The tab list, as assistive technology sees it
				A tab list may hold nothing but tabs, and this bar also holds the Add Sheet button and each sheet's delete button
				So the list is an empty element that claims the tabs by id, wherever they sit in the bar, and the buttons stay outside it
			*/ }
			<div
				className="m-chart-sheet-tablist"
				role="tablist"
				aria-label={ __( 'Spreadsheet sheets', 'm-chart' ) }
				aria-orientation="horizontal"
				aria-owns={ sheetIds.map( ( id ) => `spreadsheet-tab-${ id }` ).join( ' ' ) }
			/>
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
