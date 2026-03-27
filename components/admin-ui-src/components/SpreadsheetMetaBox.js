import { useEffect, useRef, useCallback } from '@wordpress/element';
import { useChartAdmin } from '../context/ChartAdminContext';
import JspreadsheetWrapper from './JspreadsheetWrapper';
import SheetTabs from './SheetTabs';
import CsvControls from './CsvControls';

// WordPress submit button IDs that should trigger save behavior
const SUBMIT_BUTTON_IDS = [ 'publish', 'save-post' ];

/**
 * Container for the spreadsheet meta box
 *
 * Manages Jspreadsheet worksheet instances via a ref map keyed by stable sheet ID
 * Handles form submission: writes all sheet data to the hidden textarea[name="m-chart[data]"] before the post form is submitted
 */
export default function SpreadsheetMetaBox() {
	const { state, dispatch } = useChartAdmin();
	const { sheetIds, spreadsheetData, activeSheet, formEnabled, pendingSubmit } = state;

	// Map of stable sheetId → worksheet instance (Jspreadsheet worksheet object)
	const worksheetInstances = useRef( {} );

	// Refs so event handlers always see the latest values without needing to be recreated
	const formEnabledRef = useRef( formEnabled );
	const sheetIdsRef    = useRef( sheetIds );

	formEnabledRef.current = formEnabled;
	sheetIdsRef.current    = sheetIds;

	// Called by JspreadsheetWrapper after it initialises its jspreadsheet instance
	const handleMounted = useCallback( ( sheetId, worksheet ) => {
		worksheetInstances.current[ sheetId ] = worksheet;
	}, [] );

	// Called by JspreadsheetWrapper just before it unmounts
	const handleUnmounted = useCallback( ( sheetId ) => {
		delete worksheetInstances.current[ sheetId ];
	}, [] );

	// Returns the worksheet instance for the currently active sheet
	const getActiveWorksheet = useCallback( () => {
		const activeId = sheetIdsRef.current[ state.activeSheet ];
		return worksheetInstances.current[ activeId ] ?? null;
	}, [ state.activeSheet ] );

	// Writes all sheet data to the hidden textarea so the form POST includes it
	const writeDataToForm = useCallback( () => {
		const form = document.getElementById( 'post' );

		if ( ! form ) {
			return;
		}

		const allData = sheetIdsRef.current.map(
			( id ) => worksheetInstances.current[ id ]?.getData() ?? [ [ '' ] ]
		);

		const dataTextarea = form.querySelector( 'textarea[name="m-chart[data]"]' );

		if ( dataTextarea ) {
			dataTextarea.value = JSON.stringify( allData );
		}
	}, [] );

	// When formEnabled becomes true while a submit is pending, submit the form
	// Uses form.submit() to bypass event handlers since the data textarea is already written
	useEffect( () => {
		if ( formEnabled && pendingSubmit ) {
			dispatch( { type: 'SET_PENDING_SUBMIT', payload: false } );

			// Write latest data right before submitting
			writeDataToForm();

			const form = document.getElementById( 'post' );

			if ( form ) {
				form.submit();
			}
		}
	}, [ formEnabled, pendingSubmit, dispatch, writeDataToForm ] );

	// Detect submit intent at the click event on WP submit buttons
	// Click fires AFTER blur but BEFORE the form's submit event
	// This is the earliest reliable detection point
	useEffect( () => {
		function handleClick( e ) {
			// If the chart is still refreshing, intercept the click to defer submission
			// The form submit event hasn't fired yet so we prevent the default click behavior
			if ( ! formEnabledRef.current ) {
				e.preventDefault();
				writeDataToForm();
				dispatch( { type: 'SET_PENDING_SUBMIT', payload: true } );
				return;
			}

			// Form is ready — write data and let the normal submit flow proceed
			writeDataToForm();
		}

		const buttons = SUBMIT_BUTTON_IDS
			.map( ( id ) => document.getElementById( id ) )
			.filter( Boolean );

		buttons.forEach( ( btn ) => btn.addEventListener( 'click', handleClick ) );

		return () => {
			buttons.forEach( ( btn ) => btn.removeEventListener( 'click', handleClick ) );
		};
	}, [ dispatch, writeDataToForm ] );

	// Intercept the form submit event as a fallback
	// Ensures the data textarea is always written before submission regardless of how
	// the submit was triggered (keyboard, other plugins, etc)
	useEffect( () => {
		const form = document.getElementById( 'post' );

		if ( ! form ) {
			return;
		}

		function handleSubmit( e ) {
			// If chart is still refreshing, block this submit — the click handler
			// already set pendingSubmit so it will auto-submit when ready
			if ( ! formEnabledRef.current ) {
				e.preventDefault();
				return;
			}

			// Write data in case the submit wasn't triggered via our click handler
			writeDataToForm();
		}

		form.addEventListener( 'submit', handleSubmit );
		return () => form.removeEventListener( 'submit', handleSubmit );
	}, [ writeDataToForm ] );

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
