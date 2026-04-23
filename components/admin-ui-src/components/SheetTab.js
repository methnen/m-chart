import { Button, Modal, TextControl } from '@wordpress/components';
import { useState, useEffect, useRef } from '@wordpress/element';
import { __ } from '@wordpress/i18n';
import { useChartAdmin } from '../context/ChartAdminContext';
import { useLongPress } from '../hooks/useLongPress';
import { circleX } from '../icons';
import { measureTextWidth } from '../utils/measureTextWidth';

/**
 * A single sheet tab in the spreadsheet tab bar
 *
 * Supports:
 *   - Click to activate
 *   - Double-click or long-press (500ms) to enter rename mode
 *   - Enter / blur to commit rename
 *   - Dismiss icon to delete (guarded by window.confirm)
 */
export default function SheetTab( {
	sheetId,
	sheetIndex,
	name,
	isActive,
	isSingle,
	isNew,
} ) {
	const { state, dispatch } = useChartAdmin();
	const { sheetEditingDisabled } = state;
	const [ isRenaming, setIsRenaming ] = useState( () => !! isNew );
	const [ inputValue, setInputValue ] = useState( name );
	const [ showDeleteModal, setShowDeleteModal ] = useState( false );
	const inputRef = useRef( null );

	const longPress = useLongPress( () => { if ( ! sheetEditingDisabled ) { setIsRenaming( true ); } } );

	// Clear the newSheetId flag once this tab has consumed it
	useEffect( () => {
		if ( isNew ) {
			dispatch( { type: 'CLEAR_NEW_SHEET_ID' } );
		}
	}, [] ); // eslint-disable-line react-hooks/exhaustive-deps

	// Exit rename mode if editing becomes disabled while the input is open
	useEffect( () => {
		if ( sheetEditingDisabled && isRenaming ) {
			setIsRenaming( false );
		}
	}, [ sheetEditingDisabled ] ); // eslint-disable-line react-hooks/exhaustive-deps

	// Keep the hidden input in sync when name changes externally (e.g. via RENAME_SHEET dispatch)
	useEffect( () => {
		if ( ! isRenaming ) {
			setInputValue( name );
		}
	}, [ name ] ); // eslint-disable-line react-hooks/exhaustive-deps

	// Sync local input value and focus when entering rename mode
	useEffect( () => {
		if ( isRenaming ) {
			setInputValue( name );

			if ( inputRef.current ) {
				inputRef.current.focus();
				inputRef.current.select();
			}
		}
	}, [ isRenaming ] ); // eslint-disable-line react-hooks/exhaustive-deps

	function handleClick( e ) {
		e.preventDefault();

		if ( ! isActive ) {
			dispatch( { type: 'SET_ACTIVE_SHEET', payload: sheetIndex } );
		}
	}

	function handleDoubleClick( e ) {
		e.preventDefault();

		if ( ! sheetEditingDisabled ) {
			setIsRenaming( true );
		}
	}

	function handleDelete( e ) {
		e.preventDefault();
		e.stopPropagation();

		// If there's only one tab we don't let the user delete it
		if ( isSingle ) {
			return;
		}

		setShowDeleteModal( true );
	}

	function confirmDelete() {
		// Activate a neighbouring sheet before deleting so the active index stays valid
		if ( isActive ) {
			const newActive = sheetIndex > 0 ? sheetIndex - 1 : 1;

			dispatch( { type: 'SET_ACTIVE_SHEET', payload: newActive } );
		}

		dispatch( { type: 'DELETE_SHEET', payload: { index: sheetIndex } } );
		setShowDeleteModal( false );
	}

	function commitRename() {
		dispatch( {
			type:    'RENAME_SHEET',
			payload: { index: sheetIndex, name: inputValue },
		} );

		setIsRenaming( false );
	}

	function handleKeyDown( e ) {
		if ( e.key === 'Enter' ) {
			e.preventDefault();
			commitRename();
		}
	}

	const inputWidth = inputRef.current
		? measureTextWidth( inputValue, inputRef.current ) + 'px'
		: Math.max( 40, inputValue.length * 8 + 16 ) + 'px';

	const className = [
		'components-tab-panel__tabs-item',
		'm-chart-sheet-tab',
		isActive ? 'is-active' : '',
	].filter( Boolean ).join( ' ' );

	return (
		<button
			type="button"
			role="tab"
			aria-selected={ isActive }
			className={ className }
			id={ `spreadsheet-tab-${ sheetId }` }
			onClick={ handleClick }
			onDoubleClick={ handleDoubleClick }
			{ ...longPress }
		>
			{ ! isSingle && ! sheetEditingDisabled && (
				<Button
					className="m-chart-sheet-tab-delete"
					icon={ circleX }
					size="small"
					label="Delete"
					onClick={ handleDelete }
				/>
			) }
			<span
				className="m-chart-sheet-tab-title"
				style={ { display: isRenaming ? 'none' : '' } }
			>
				{ name }
			</span>
			<TextControl
				__next40pxDefaultSize
				ref={ inputRef }
				name={ `m-chart[set_names][${ sheetIndex }]` }
				value={ inputValue }
				style={ {
					display: isRenaming ? '' : 'none',
					width:   inputWidth,
				} }
				onChange={ ( value ) => setInputValue( value ) }
				onBlur={ commitRename }
				onKeyDown={ handleKeyDown }
			/>
			{ showDeleteModal && (
				<Modal
					className="m-chart-modal"
					title={ __( 'Delete Sheet', 'm-chart' ) }
					size="small"
					onRequestClose={ () => setShowDeleteModal( false ) }
				>
					<p>{ __( 'Are you sure you want to delete this sheet?', 'm-chart' ) }</p>
					<div className="buttons">
						<Button
							variant="primary"
							isDestructive
							onClick={ confirmDelete }
						>
							{ __( 'Delete', 'm-chart' ) }
						</Button>
						<Button
							variant="secondary"
							onClick={ () => setShowDeleteModal( false ) }
						>
							{ __( 'Cancel', 'm-chart' ) }
						</Button>
					</div>
				</Modal>
			) }
		</button>
	);
}
