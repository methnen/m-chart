import { useEffect, useRef, useCallback } from '@wordpress/element';
import { useChartAdmin } from '../context/ChartAdminContext';
import JspreadsheetWrapper from './JspreadsheetWrapper';
import SheetTabs from './SheetTabs';
import CsvControls from './CsvControls';

/**
 * Container for the spreadsheet meta box.
 *
 * Manages Jspreadsheet worksheet instances via a ref map keyed by stable sheet
 * ID.  Handles form submission: writes all sheet data to the hidden
 * textarea[name="m-chart[data]"] before the post form is submitted.
 */
export default function SpreadsheetMetaBox() {
	const { state } = useChartAdmin();
	const { sheetIds, spreadsheetData, activeSheet, formEnabled } = state;

	// Map of stable sheetId → worksheet instance (Jspreadsheet worksheet object).
	const worksheetInstances = useRef( {} );

	// Refs so the form-submit handler always sees the latest values without
	// needing to be recreated on every state change.
	const formEnabledRef  = useRef( formEnabled );
	const sheetIdsRef     = useRef( sheetIds );
	formEnabledRef.current = formEnabled;
	sheetIdsRef.current    = sheetIds;

	// Called by JspreadsheetWrapper after it initialises its jspreadsheet instance.
	const handleMounted = useCallback( ( sheetId, worksheet ) => {
		worksheetInstances.current[ sheetId ] = worksheet;
	}, [] );

	// Called by JspreadsheetWrapper just before it unmounts.
	const handleUnmounted = useCallback( ( sheetId ) => {
		delete worksheetInstances.current[ sheetId ];
	}, [] );

	// Returns the worksheet instance for the currently active sheet.
	const getActiveWorksheet = useCallback( () => {
		const activeId = sheetIdsRef.current[ state.activeSheet ];
		return worksheetInstances.current[ activeId ] ?? null;
	}, [ state.activeSheet ] );

	// Intercept the WordPress post form submission.
	useEffect( () => {
		const form = document.getElementById( 'post' );
		if ( ! form ) {
			return;
		}

		function handleSubmit( e ) {
			if ( ! formEnabledRef.current ) {
				e.preventDefault();
				return;
			}

			// Collect current data from every jspreadsheet instance.
			const allData = sheetIdsRef.current.map(
				( id ) => worksheetInstances.current[ id ]?.getData() ?? [ [ '' ] ]
			);

			const dataTextarea = form.querySelector( 'textarea[name="m-chart[data]"]' );
			if ( dataTextarea ) {
				dataTextarea.value = JSON.stringify( allData );
			}
		}

		form.addEventListener( 'submit', handleSubmit );
		return () => form.removeEventListener( 'submit', handleSubmit );
	}, [] ); // Attached once — reads latest values through refs.

	return (
		<>
			<SheetTabs />
			<div id="spreadsheets">
				{ sheetIds.map( ( id, index ) => (
					<JspreadsheetWrapper
						key={ id }
						sheetId={ id }
						sheetIndex={ index }
						isActive={ index === activeSheet }
						data={ spreadsheetData[ index ] }
						onMounted={ handleMounted }
						onUnmounted={ handleUnmounted }
					/>
				) ) }
			</div>
			<CsvControls getActiveWorksheet={ getActiveWorksheet } />
		</>
	);
}
