import { useEffect, useRef } from '@wordpress/element';
import { useChartAdmin } from '../context/ChartAdminContext';

const CONTEXT_MENU_ITEMS = [
	'Insert a new row before',
	'Insert a new row after',
	'Delete selected rows',
	'Insert a new column before',
	'Insert a new column after',
	'Delete selected columns',
];

/**
 * Resizes columns to fit their content using canvas-based text measurement.
 * Mirrors m_chart_admin.spreadsheet_auto_width() from m-chart-admin.js.
 *
 * @param {object} worksheet  Jspreadsheet worksheet instance.
 * @param {Array}  [records]  Subset of changed records; omit for a full refresh.
 */
export function spreadsheetAutoWidth( worksheet, records = false ) {
	if ( ! records ) {
		records = worksheet.records[ 0 ];
	}

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
 * Thin React wrapper around a Jspreadsheet CE worksheet.
 *
 * The Jspreadsheet instance is created once on mount and never recreated on
 * re-render.  Show/hide between active/inactive sheets is done via CSS so
 * that DOM state and undo history are preserved.
 *
 * Props:
 *   sheetId       {number}   Stable identity key (used for registration).
 *   sheetIndex    {number}   Current position in the sheets array (may change after deletes).
 *   isActive      {boolean}  Whether this sheet is currently displayed.
 *   data          {Array}    Initial 2-D array of cell values.
 *   onMounted     {Function} Called with (sheetId, worksheetInstance) after init.
 *   onUnmounted   {Function} Called with (sheetId) before unmount.
 */
export default function JspreadsheetWrapper( {
	sheetId,
	sheetIndex,
	isActive,
	data,
	onMounted,
	onUnmounted,
} ) {
	const { dispatch } = useChartAdmin();
	const containerRef  = useRef( null );
	const worksheetRef  = useRef( null );

	// Keep a ref so the onafterchanges closure always dispatches the current index.
	const sheetIndexRef = useRef( sheetIndex );
	sheetIndexRef.current = sheetIndex;

	useEffect( () => {
		if ( ! containerRef.current || worksheetRef.current ) {
			return;
		}

		const initialData = data && data.length ? data : [ [ '' ] ];

		const instance = window.jspreadsheet( containerRef.current, {
			worksheets: [ {
				data:          initialData,
				allowComments: false,
				minDimensions: [ 37, 17 ],
			} ],
			contextMenu( obj, x, y, e, items ) {
				return items.filter( ( item ) =>
					CONTEXT_MENU_ITEMS.includes( item.title )
				);
			},
			onload( spreadsheet ) {
				const ws = spreadsheet.worksheets[ spreadsheet.getWorksheetActive() ];
				spreadsheetAutoWidth( ws );
			},
			onafterchanges( worksheet, records ) {
				spreadsheetAutoWidth( worksheet, records );
				dispatch( {
					type:    'SET_SHEET_DATA',
					payload: { index: sheetIndexRef.current, data: worksheet.getData() },
				} );
			},
		} );

		worksheetRef.current = instance[ 0 ];
		onMounted( sheetId, worksheetRef.current );

		return () => {
			onUnmounted( sheetId );
			worksheetRef.current = null;
		};
	}, [] ); // eslint-disable-line react-hooks/exhaustive-deps

	return (
		<div
			ref={ containerRef }
			className="spreadsheet"
			style={ { display: isActive ? '' : 'none' } }
		/>
	);
}
