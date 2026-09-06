import { Button, SelectControl, Spinner } from '@wordpress/components';
import { useState, useRef } from '@wordpress/element';
import { speak } from '@wordpress/a11y';
import { __, sprintf } from '@wordpress/i18n';
import { useChartAdmin } from '../context/ChartAdminContext';
import { circleX } from '../icons';
import { spreadsheetAutoWidth } from './JspreadsheetWrapper';

/**
 * CSV import and export controls for the active spreadsheet sheet
 *
 * Import uses fetch + FormData (replaces the hidden #m-chart-csv-import-form)
 * Export uses a dynamically-created temporary form POST to trigger a file download (replaces the hidden #m-chart-csv-export-form)
 *
 * Props:
 *   getActiveWorksheet {Function}  Returns the active Jspreadsheet worksheet instance
 */
export default function CsvControls( { getActiveWorksheet } ) {
	const { state, dispatch } = useChartAdmin();
	const {
		postId,
		nonce,
		ajaxUrl,
		setNames,
		activeSheet,
		csvDelimiters,
		defaultDelimiter,
	} = state;

	const [ selectedFile,  setSelectedFile  ] = useState( null );
	const [ csvDelimiter,  setCsvDelimiter  ] = useState( defaultDelimiter );
	const [ fileError,     setFileError     ] = useState( false );
	const [ importError,   setImportError   ] = useState( '' );
	const [ isImporting,   setIsImporting   ] = useState( false );

	const fileInputRef = useRef( null );

	function handleSelectFile( e ) {
		e.preventDefault();

		setFileError( false );
		setImportError( '' );

		fileInputRef.current?.click();
	}

	function handleFileChange( e ) {
		const file = e.target.files[ 0 ];

		// Make sure it's a CSV file
		if ( ! file || ! /\.csv$/i.test( file.name ) ) {
			setFileError( true );
			setSelectedFile( null );
			speak( __( 'You can only import CSV files', 'm-chart' ), 'assertive' );
			return;
		}

		setFileError( false );
		setSelectedFile( file );
	}

	function handleCancel( e ) {
		e.preventDefault();

		setSelectedFile( null );

		// We're hiding the actual file input so we need to reset it for the user
		if ( fileInputRef.current ) {
			fileInputRef.current.value = '';
		}
	}

	async function handleImport( e ) {
		e.preventDefault();

		if ( ! selectedFile ) {
			return;
		}

		// Save the file value so we can reset the input
		const file = selectedFile;

		// Set the UI to show we're importing the file
		setSelectedFile( null );
		setIsImporting( true );
		setImportError( '' );
		speak( __( 'Importing CSV file', 'm-chart' ) );

		// Reset the actual file input back to empty
		if ( fileInputRef.current ) {
			fileInputRef.current.value = '';
		}

		// Create a form data object so we can submit it to the endpoint
		const formData = new FormData();

		formData.append( 'import_csv_file', file );
		formData.append( 'post_id',         postId );
		formData.append( 'csv_delimiter',   csvDelimiter );
		formData.append( 'nonce',           nonce );

		try {
			const response = await fetch( `${ ajaxUrl }?action=m_chart_import_csv`, {
				method: 'POST',
				body:   formData,
			} );

			const json = await response.json();

			if ( ! json.success ) {
				const msg = json.data || __( 'Import failed', 'm-chart' );
				setImportError( msg );
				speak( msg, 'assertive' );
				return;
			}

			const worksheet = getActiveWorksheet();

			if ( worksheet ) {
				worksheet.setData( json.data );

				// setData() does not trigger onafterchanges so we need to run spreadsheetAutoWidth ourselves
				spreadsheetAutoWidth( worksheet );

				dispatch( {
					type:    'SET_SHEET_DATA',
					payload: { index: activeSheet, data: worksheet.getData() },
				} );
			}

			speak( __( 'CSV file imported', 'm-chart' ) );
		} catch ( err ) {
			/* translators: %s: the underlying error message */
			const msg = sprintf( __( 'Import error: %s', 'm-chart' ), err.message );
			setImportError( msg );
			speak( msg, 'assertive' );
		} finally {
			// When we're done reset everything in the CSV ui back to default
			setIsImporting( false );
		}
	}

	function handleExport( e ) {
		e.preventDefault();

		const worksheet = getActiveWorksheet();

		if ( ! worksheet ) {
			return;
		}

		const data    = worksheet.getData();
		const title   = document.getElementById( 'title' )?.value || '';
		const setName = setNames[ activeSheet ] || '';

		// Build a FormData object so we can submit it to the endpoint
		const formData = new FormData();

		formData.append( 'post_id',  postId );
		formData.append( 'data',     JSON.stringify( data ) );
		formData.append( 'title',    title );
		formData.append( 'set_name', setName );
		formData.append( 'nonce',    nonce );

		// Create a temporary form and submit it
		// We have to do it this way to trigger a download
		const form    = document.createElement( 'form' );
		form.action   = `${ ajaxUrl }?action=m_chart_export_csv`;
		form.method   = 'post';
		form.style.display = 'none';

		for ( const [ name, value ] of formData.entries() ) {
			const input   = document.createElement( 'input' );
			input.type    = 'hidden';
			input.name    = name;
			input.value   = value;
			form.appendChild( input );
		}

		document.body.appendChild( form );
		form.submit();
		document.body.removeChild( form );
	}

	const showConfirmation = selectedFile && ! isImporting;

	return (
		<div id="m-chart-csv">
			<div className="import" role="group" aria-labelledby="m-chart-csv-heading">
				<h4 id="m-chart-csv-heading" className="m-chart-csv-heading">
					{ __( 'CSV Import/Export', 'm-chart' ) }
				</h4>
				<div className="controls">
					{ /* Visually-hidden native file input — triggered programmatically */ }
					<input
						ref={ fileInputRef }
						type="file"
						accept=".csv"
						aria-label={ __( 'CSV file to import', 'm-chart' ) }
						className="screen-reader-text"
						onChange={ handleFileChange }
					/>
					<div className="actions">
						<div className="actions-left">
							{ /* Select File button — shown when no file is selected */ }
							{ ! showConfirmation && ! isImporting && (
								<Button
									variant="secondary"
									className="select"
									onClick={ handleSelectFile }
								>
									{ __( 'Select File', 'm-chart' ) }
								</Button>
							) }
							{ /* Confirmation row: Import button + delimiter select */ }
							{ showConfirmation && (
								<div className="confirmation">
									<Button
										variant="primary"
										onClick={ handleImport }
									>
										{ __( 'Import', 'm-chart' ) }
									</Button>
									<SelectControl
										__next40pxDefaultSize
										label={ __( 'CSV delimiter', 'm-chart' ) }
										hideLabelFromVision
										name="m-chart[csv_delimiter]"
										value={ csvDelimiter }
										onChange={ ( value ) => setCsvDelimiter( value ) }
									>
										{ Object.entries( csvDelimiters ).map( ( [ val, label ] ) => (
											<option key={ val } value={ val }>
												{
													/* translators: %s: the delimiter character name (e.g. Comma, Tab, Semicolon) */
													sprintf( __( '%s Delimited', 'm-chart' ), label )
												}
											</option>
										) ) }
									</SelectControl>
								</div>
							) }
						</div>
						{ /* Export hidden while a file is queued or being imported */ }
						{ ! showConfirmation && ! isImporting && (
							<Button
								variant="secondary"
								className="export"
								onClick={ handleExport }
							>
								{ __( 'Export', 'm-chart' ) }
							</Button>
						) }
					</div>
					<div role="status" aria-live="polite" aria-atomic="true" aria-busy={ isImporting }>
						{ fileError && (
							<p className="file error" role="alert">{ __( 'You can only import CSV files', 'm-chart' ) }</p>
						) }
						{ importError && (
							<p className="import error" role="alert">{ importError }</p>
						) }
						{ isImporting && (
							<p className="import in-progress">
								<Spinner />
								{ ' ' }
								{ __( 'Importing file', 'm-chart' ) }
							</p>
						) }
					</div>
					{ /* File info + cancel — shown while a file is selected */ }
					{ showConfirmation && (
						<div className="file-info">
							<Button
								className="m-chart-csv-cancel"
								icon={ circleX }
								size="small"
								label={ __( 'Cancel Import', 'm-chart' ) }
								onClick={ handleCancel }
							/>
							{
								/* translators: %s: the selected file's name */
								sprintf( __( 'File: %s', 'm-chart' ), selectedFile.name )
							}<br />
							<span className="warning">
								{ __( 'Importing this file will replace all existing data in this sheet', 'm-chart' ) }
							</span>
						</div>
					) }
				</div>
			</div>
		</div>
	);
}
