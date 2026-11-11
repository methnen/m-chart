import { useEffect, useRef, useCallback } from '@wordpress/element';
import { useChartAdmin } from '../context/ChartAdminContext';
import JspreadsheetWrapper, { spreadsheetAutoWidth } from './JspreadsheetWrapper';
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
	const { postId, sheetIds, spreadsheetData, activeSheet, formEnabled, pendingSubmit, sheetEditingDisabled } = state;

	// Map of stable sheetId → worksheet instance (Jspreadsheet worksheet object)
	const worksheetInstances = useRef( {} );

	// Refs so event handlers always see the latest values without needing to be recreated
	const formEnabledRef     = useRef( formEnabled );
	const sheetIdsRef        = useRef( sheetIds );
	const spreadsheetDataRef = useRef( spreadsheetData );
	const postIdRef          = useRef( postId );

	// The submit button whose click was held back while the chart was refreshing
	const heldButtonRef = useRef( null );

	formEnabledRef.current     = formEnabled;
	sheetIdsRef.current        = sheetIds;
	spreadsheetDataRef.current = spreadsheetData;
	postIdRef.current          = postId;

	// Called by JspreadsheetWrapper after it initialises its jspreadsheet instance
	// Fires m_chart.spreadsheet_mounted so extensions can decorate the grid, also on the initial mount and on every remount
	const handleMounted = useCallback( ( sheetId, worksheet ) => {
		worksheetInstances.current[ sheetId ] = worksheet;

		if ( window.wp?.hooks ) {
			window.wp.hooks.doAction( 'm_chart.spreadsheet_mounted', postIdRef.current, sheetIdsRef.current.indexOf( sheetId ), worksheet );
		}
	}, [] );

	// Called by JspreadsheetWrapper just before it unmounts
	const handleUnmounted = useCallback( ( sheetId ) => {
		delete worksheetInstances.current[ sheetId ];

		if ( window.wp?.hooks ) {
			window.wp.hooks.doAction( 'm_chart.spreadsheet_unmounted', postIdRef.current, sheetIdsRef.current.indexOf( sheetId ) );
		}
	}, [] );

	// Called by extensions (e.g. Google Sheets) to update a sheet's data imperatively
	// Bypasses the jspreadsheet data-prop limitation (instance is created once on mount)
	const setSheetDataOnWorksheet = useCallback( ( index, newData ) => {
		const id        = sheetIds[ index ];
		const worksheet = worksheetInstances.current[ id ];

		if ( worksheet && newData ) {
			worksheet.setData( newData );
			spreadsheetAutoWidth( worksheet );
		}
	}, [ sheetIds ] );

	// Returns the worksheet instance for the currently active sheet
	const getActiveWorksheet = useCallback( () => {
		const activeId = sheetIdsRef.current[ state.activeSheet ];
		return worksheetInstances.current[ activeId ] ?? null;
	}, [ state.activeSheet ] );

	// Writes all sheet data to the hidden textarea so the form POST includes it
	// Runs on every submit path, so m_chart.before_submit is the one place extensions can write their own hidden inputs
	// It can fire more than once per submission (click, then the submit event) so listeners must be idempotent
	const writeDataToForm = useCallback( () => {
		const form = document.getElementById( 'post' );

		if ( ! form ) {
			return;
		}

		// A worksheet that hasn't mounted yet (e.g. right after REPLACE_SHEETS) still has its data in state
		const allData = sheetIdsRef.current.map(
			( id, index ) => worksheetInstances.current[ id ]?.getData() ?? spreadsheetDataRef.current[ index ] ?? [ [ '' ] ]
		);

		const dataTextarea = form.querySelector( 'textarea[name="m-chart[data]"]' );

		if ( dataTextarea ) {
			dataTextarea.value = JSON.stringify( allData );
		}

		if ( window.wp?.hooks ) {
			window.wp.hooks.doAction( 'm_chart.before_submit', postIdRef.current, form );
		}
	}, [] );

	// When formEnabled becomes true while a submit is pending, finish what the user asked for
	// That means clicking the button they clicked again, not calling form.submit()
	// form.submit() sends the form without any button, so WordPress never hears "publish" and saves a draft,
	// and it skips the submit event, which is where WordPress stands down its "Leave site?" warning
	useEffect( () => {
		if ( ! formEnabled || ! pendingSubmit ) {
			return;
		}

		dispatch( { type: 'SET_PENDING_SUBMIT', payload: false } );

		const button = heldButtonRef.current;

		heldButtonRef.current = null;

		// After this round of effects, so the buttons have had their disabled class taken off first
		// WordPress ignores a click on a submit button that still has it
		queueMicrotask( () => {
			if ( button && button.isConnected ) {
				// The click handler below writes the data and lets this one through
				button.click();
				return;
			}

			// The button is gone, sending the form as it stands is the best that can be done
			writeDataToForm();

			const form = document.getElementById( 'post' );

			if ( form ) {
				form.submit();
			}
		} );
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

				// Remembered so the same button can be clicked for them once the chart is ready
				heldButtonRef.current = e.currentTarget;

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
			// If chart is still refreshing, block this submit
			// The click handler already set pendingSubmit so it will auto-submit when ready
			if ( ! formEnabledRef.current ) {
				e.preventDefault();
				return;
			}

			// Write data in case the submit wasn't triggered via our click handler
			writeDataToForm();
		}

		form.addEventListener( 'submit', handleSubmit );
		
		return () => {
			form.removeEventListener( 'submit', handleSubmit );
		};
	}, [ writeDataToForm ] );

	// Allow external plugins to inject content above the sheet tabs and spreadsheet
	// The filter receives null as the default and the current { state, dispatch } as context
	const metaboxExtension = window.wp?.hooks
		? window.wp.hooks.applyFilters(
			'm_chart.spreadsheet_metabox_extension',
			null,
			{ state, dispatch, getActiveWorksheet, setSheetDataOnWorksheet }
		)
		: null;

	// Deterministic signal for E2E tests
	// pending: the submit gate engaged and form.submit() is deferred until chart refresh + image capture complete
	const submitState = pendingSubmit ? 'pending' : 'idle';

	return (
		<>
			{ metaboxExtension }
			<SheetTabs />
			<div
				id="spreadsheets"
				className={ sheetEditingDisabled ? 'editing-disabled' : '' }
				data-submit-state={ submitState }
			>
				{ sheetIds.map( ( id, index ) => (
					<JspreadsheetWrapper
						key={ `${ id }-${ sheetEditingDisabled ? 'ro' : 'rw' }` }
						sheetId={ id }
						sheetIndex={ index }
						isActive={ index === activeSheet }
						data={ spreadsheetData[ index ] }
						readOnly={ sheetEditingDisabled }
						onMounted={ handleMounted }
						onUnmounted={ handleUnmounted }
					/>
				) ) }
			</div>
			{ ! sheetEditingDisabled && <CsvControls getActiveWorksheet={ getActiveWorksheet } /> }
		</>
	);
}
