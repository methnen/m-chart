import { useState, useRef } from '@wordpress/element';
import { __, sprintf } from '@wordpress/i18n';
import { useChartAdmin } from '../context/ChartAdminContext';
import { spreadsheetAutoWidth } from './JspreadsheetWrapper';

/**
 * CSV import and export controls for the active spreadsheet sheet.
 *
 * Import uses fetch + FormData (replaces the hidden #m-chart-csv-import-form).
 * Export uses a dynamically-created temporary form POST to trigger a file
 * download (replaces the hidden #m-chart-csv-export-form).
 *
 * Props:
 *   getActiveWorksheet {Function}  Returns the active Jspreadsheet worksheet instance.
 */
export default function CsvControls( { getActiveWorksheet } ) {
	const { state, dispatch } = useChartAdmin();
	const {
		postId, nonce, ajaxUrl,
		setNames, activeSheet,
		csvDelimiters, defaultDelimiter,
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
		if ( ! file || ! /\.csv$/i.test( file.name ) ) {
			setFileError( true );
			setSelectedFile( null );
			return;
		}
		setFileError( false );
		setSelectedFile( file );
	}

	function handleCancel( e ) {
		e.preventDefault();
		setSelectedFile( null );
		if ( fileInputRef.current ) {
			fileInputRef.current.value = '';
		}
	}

	async function handleImport( e ) {
		e.preventDefault();
		if ( ! selectedFile ) {
			return;
		}

		const file = selectedFile;
		setSelectedFile( null );
		setIsImporting( true );
		setImportError( '' );

		if ( fileInputRef.current ) {
			fileInputRef.current.value = '';
		}

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
				setImportError( json.data || __( 'Import failed', 'm-chart' ) );
				return;
			}

			const worksheet = getActiveWorksheet();

			if ( worksheet ) {
				worksheet.setData( json.data );

				// setData() does not trigger onafterchanges, so manually sync.
				spreadsheetAutoWidth( worksheet );
				dispatch( {
					type:    'SET_SHEET_DATA',
					payload: { index: activeSheet, data: worksheet.getData() },
				} );
			}
		} catch ( err ) {
			setImportError( sprintf( __( 'Import error: %s', 'm-chart' ), err.message ) );
		} finally {
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

		// Create a temporary form and submit it to trigger a file download.
		const form    = document.createElement( 'form' );
		form.action   = `${ ajaxUrl }?action=m_chart_export_csv`;
		form.method   = 'post';
		form.style.display = 'none';

		[
			[ 'post_id',  postId ],
			[ 'data',     JSON.stringify( data ) ],
			[ 'title',    title ],
			[ 'set_name', setName ],
		].forEach( ( [ name, value ] ) => {
			const input   = document.createElement( 'input' );
			input.type    = 'hidden';
			input.name    = name;
			input.value   = value;
			form.appendChild( input );
		} );

		document.body.appendChild( form );
		form.submit();
		document.body.removeChild( form );
	}

	const showConfirmation = selectedFile && ! isImporting;

	return (
		<div id="m-chart-csv">
			<div className="export">
				<br />
				<a
					href="#export-csv"
					title={ __( 'Export CSV', 'm-chart' ) }
					className="button"
					onClick={ handleExport }
				>
					{ __( 'Export', 'm-chart' ) }
				</a>
			</div>

			<div className="import">
				{ __( 'CSV Import/Export', 'm-chart' ) }<br />
				<div className="controls">

					{ /* Hidden native file input — triggered programmatically */ }
					<input
						ref={ fileInputRef }
						type="file"
						accept=".csv"
						style={ { display: 'none' } }
						onChange={ handleFileChange }
					/>

					{ /* Select File button — shown when no file is selected */ }
					{ ! showConfirmation && ! isImporting && (
						<a
							href="#select-csv"
							title={ __( 'Select CSV File', 'm-chart' ) }
							className="button select"
							onClick={ handleSelectFile }
						>
							{ __( 'Select File', 'm-chart' ) }
						</a>
					) }

					{ /* Confirmation row: Import button + delimiter select */ }
					{ showConfirmation && (
						<div className="confirmation">
							<a
								href="#import-csv"
								title={ __( 'Import', 'm-chart' ) }
								className="button"
								onClick={ handleImport }
							>
								{ __( 'Import', 'm-chart' ) }
							</a>
							<select
								name="m-chart[csv_delimiter]"
								value={ csvDelimiter }
								onChange={ ( e ) => setCsvDelimiter( e.target.value ) }
							>
								{ Object.entries( csvDelimiters ).map( ( [ val, label ] ) => (
									<option key={ val } value={ val }>
										{ sprintf( __( '%s Delimited', 'm-chart' ), label ) }
									</option>
								) ) }
							</select>
						</div>
					) }

					{ fileError && (
						<p className="file error">{ __( 'You can only import CSV files', 'm-chart' ) }</p>
					) }

					{ importError && (
						<p className="import error">{ importError }</p>
					) }

					{ isImporting && (
						<p className="import in-progress">{ __( 'Importing file', 'm-chart' ) }</p>
					) }

					{ /* File info + cancel — shown while a file is selected */ }
					{ showConfirmation && (
						<div className="file-info">
							<a
								href="#cancel"
								title={ __( 'Cancel Import', 'm-chart' ) }
								className="dashicons dashicons-dismiss"
								onClick={ handleCancel }
							/>
							{ sprintf( __( 'File: %s', 'm-chart' ), selectedFile.name ) }<br />
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
