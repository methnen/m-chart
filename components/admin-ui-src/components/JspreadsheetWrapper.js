import { useEffect, useRef } from '@wordpress/element';
import { __ } from '@wordpress/i18n';
import { useChartDispatch } from '../context/ChartAdminContext';

// Jspreadsheet CE has a bunch of default menu items this is the list of the ones we actually want
const CONTEXT_MENU_ITEMS = [
	'Insert a new row before',
	'Insert a new row after',
	'Delete selected rows',
	'Insert a new column before',
	'Insert a new column after',
	'Delete selected columns',
];

/**
 * Resizes columns to fit their content using canvas-based text measurement
 *
 * @param {Object} worksheet Jspreadsheet CE worksheet instance
 * @param {Array}  [records] Subset of changed records; omit for a full refresh
 */
export function spreadsheetAutoWidth( worksheet, records = false ) {
	// If no records to refresh were passed we'll just do all of them
	if ( ! records ) {
		records = worksheet.records[ 0 ];
	}

	// If there are no records even after the above we stop here
	if ( ! records || ! records.length ) {
		return;
	}

	const columns = [ ...new Set( records.map( ( r ) => r.x ) ) ];
	const canvas  = document.createElement( 'canvas' );
	const context = canvas.getContext( '2d' );

	columns.forEach( ( column ) => {
		let maxWidth      = 0;
		const padding     = 13;
		const minWidth    = 100 - padding;

		for ( let i = 0; i < worksheet.records.length; i++ ) {
			const cell = worksheet.records[ i ]?.[ column ]?.element;

			if ( cell ) {
				context.font  = window.getComputedStyle( cell ).font;
				const metrics = context.measureText( cell.innerText );

				if ( metrics.width > maxWidth ) {
					maxWidth = metrics.width;
				}
			}
		}

		maxWidth = minWidth > maxWidth ? minWidth : maxWidth;

		worksheet.setWidth( column, maxWidth + padding );
	} );
}

/**
 * Thin React wrapper around a Jspreadsheet CE worksheet
 *
 * The Jspreadsheet instance is created once on mount and never recreated on re-render
 * Show/hide between active/inactive sheets is done via CSS so that DOM state and undo history are preserved
 *
 * Props:
 *   sheetId       {number}   Stable identity key (used for registration)
 *   sheetIndex    {number}   Current position in the sheets array (may change after deletes)
 *   isActive      {boolean}  Whether this sheet is currently displayed
 *   data          {Array}    Initial 2-D array of cell values
 *   readOnly      {boolean}  When true, the spreadsheet is rendered in read-only mode
 *   onMounted     {Function} Called with (sheetId, worksheetInstance) after init
 *   onUnmounted   {Function} Called with (sheetId) before unmount
 */
export default function JspreadsheetWrapper( {
	sheetId,
	sheetIndex,
	isActive,
	data,
	readOnly = false,
	onMounted,
	onUnmounted,
} ) {
	const dispatch = useChartDispatch();
	const containerRef  = useRef( null );
	const worksheetRef  = useRef( null );

	// Keep a ref so the onafterchanges closure always dispatches the current index
	const sheetIndexRef = useRef( sheetIndex );
	sheetIndexRef.current = sheetIndex;

	useEffect( () => {
		if ( ! containerRef.current || worksheetRef.current ) {
			return;
		}

		// Need to load an empty data array if there's none to start already
		const initialData = data && data.length ? data : [ [ '' ] ];

		// Create the sheet instance
		const instance = window.jspreadsheet( containerRef.current, {
			worksheets: [ {
				data:          initialData,
				allowComments: false,
				minDimensions: [ 37, 17 ],
				...( readOnly ? { editable: false } : {} ),
			} ],
			// Filter out all of the contextual menu items we don't want
			contextMenu( obj, x, y, e, items ) {
				if ( readOnly ) {
					return false;
				}

				return items.filter( ( item ) =>
					CONTEXT_MENU_ITEMS.includes( item.title )
				);
			},
			// Run spreadsheetAutoWidth on the intiial load
			onload( spreadsheet ) {
				const ws = spreadsheet.worksheets[ spreadsheet.getWorksheetActive() ];
				spreadsheetAutoWidth( ws );
			},
			// Run spreadsheetAutoWidth on changed recrds and also push any changes to the chart
			// Skipped entirely in read-only mode since the data cannot change
			...( ! readOnly ? {
				onafterchanges( worksheet, records ) {
					spreadsheetAutoWidth( worksheet, records );
					dispatch( {
						type:    'SET_SHEET_DATA',
						payload: { index: sheetIndexRef.current, data: worksheet.getData() },
					} );
				},
			} : {} ),
		} );

		worksheetRef.current = instance[ 0 ];
		onMounted( sheetId, worksheetRef.current );

		// jsuites marks its tab-panel wrapper role="region" but leaves it unfocusable,
		// so keyboard users can't scroll the grid viewport (axe: scrollable-region-focusable)
		const tabsContent = containerRef.current.querySelector( '.jtabs-content' );

		if ( tabsContent ) {
			tabsContent.setAttribute( 'tabindex', '0' );
		}

		return () => {
			onUnmounted( sheetId );
			worksheetRef.current = null;
		};
	}, [] ); // eslint-disable-line react-hooks/exhaustive-deps

	// The CSV Import control only renders when editing is allowed 
	// So the read-only hint must not point at it
	// Hidden tracks the active tab like the panel itself
	// aria-describedby still resolves on the active sheet
	const hint = readOnly
		? __( 'The spreadsheet grid has limited screen reader support. This spreadsheet is read only.', 'm-chart' )
		: __( 'The spreadsheet grid has limited screen reader support. Use the CSV Import control to load data.', 'm-chart' );

	return (
		<>
			<p id={ `spreadsheet-hint-${ sheetId }` } className="screen-reader-text" hidden={ ! isActive }>
				{ hint }
			</p>
			<div
				ref={ containerRef }
				className="spreadsheet"
				role="tabpanel"
				id={ `spreadsheet-panel-${ sheetId }` }
				aria-labelledby={ `spreadsheet-tab-${ sheetId }` }
				aria-describedby={ `spreadsheet-hint-${ sheetId }` }
				tabIndex={ isActive ? 0 : -1 }
				hidden={ ! isActive }
			/>
		</>
	);
}
