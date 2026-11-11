import { Button, Modal, TextControl } from '@wordpress/components';
import { useState, useEffect, useRef } from '@wordpress/element';
import { speak } from '@wordpress/a11y';
import { __, sprintf } from '@wordpress/i18n';
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
 *   - Dismiss icon to delete (after a confirmation dialog)
 *
 * What looks like one tab is three siblings in a box: the tab itself (the sheet's name), its delete button and the rename field
 * A tab may not contain other controls, so the button and the field can't be inside it,
 * and the tab list may only contain tabs, so SheetTabs claims each tab with aria-owns instead of wrapping these boxes
 * The stylesheet stretches the tab over the whole box, which keeps the box clickable everywhere as it always was
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
		// The reducer works out which sheet is active afterwards
		dispatch( { type: 'DELETE_SHEET', payload: { index: sheetIndex } } );
		setShowDeleteModal( false );
		speak( __( 'Sheet deleted', 'm-chart' ) );

		// Move focus to the now-active tab after React commits — Modal can't restore focus to this component because it unmounts on delete
		setTimeout( () => {
			document.querySelector( '#spreadsheet-tabs [role="tab"][aria-selected="true"]' )?.focus();
		}, 0 );
	}

	function commitRename() {
		dispatch( {
			type:    'RENAME_SHEET',
			payload: { index: sheetIndex, name: inputValue },
		} );

		setIsRenaming( false );
		/* translators: %s: the sheet's new name */
		speak( sprintf( __( 'Sheet renamed to %s', 'm-chart' ), inputValue ) );
	}

	function handleKeyDown( e ) {
		if ( e.key === 'Enter' ) {
			e.preventDefault();
			commitRename();
		}
	}

	// measureTextWidth has its own estimate for when the input hasn't mounted yet
	const inputWidth = measureTextWidth( inputValue, inputRef.current ) + 'px';

	const className = [
		'components-tab-panel__tabs-item',
		'm-chart-sheet-tab',
		isActive ? 'is-active' : '',
	].filter( Boolean ).join( ' ' );

	function handleKeyActivate( e ) {
		// The shortcuts belong to the tab itself, nothing that bubbles up from inside it
		if ( e.target !== e.currentTarget ) {
			return;
		}

		if ( 'Enter' === e.key || ' ' === e.key ) {
			e.preventDefault();
			handleClick( e );
			return;
		}

		if ( 'F2' === e.key && ! sheetEditingDisabled ) {
			e.preventDefault();
			setIsRenaming( true );
			return;
		}

		if ( 'Delete' === e.key && ! isSingle && ! sheetEditingDisabled ) {
			e.preventDefault();
			setShowDeleteModal( true );
			return;
		}

		// Arrow keys / Home / End — let SheetTabs handle cross-tab navigation
		if ( [ 'ArrowLeft', 'ArrowRight', 'Home', 'End' ].includes( e.key ) ) {
			e.preventDefault();
			e.currentTarget.dispatchEvent( new CustomEvent( 'm-chart-tab-nav', {
				bubbles: true,
				detail: { key: e.key, fromIndex: sheetIndex },
			} ) );
		}
	}

	const tabId    = `spreadsheet-tab-${ sheetId }`;
	const deleteId = `spreadsheet-tab-delete-${ sheetId }`;

	return (
		<>
			<div className={ className }>
				{ /* First in the markup so the Tab key reaches the tab before its delete button, the stylesheet shows the button first */ }
				<span
					role="tab"
					tabIndex={ isActive ? 0 : -1 }
					aria-selected={ isActive }
					aria-controls={ `spreadsheet-panel-${ sheetId }` }
					className="m-chart-sheet-tab-title"
					id={ tabId }
					style={ { display: isRenaming ? 'none' : '' } }
					onClick={ handleClick }
					onDoubleClick={ handleDoubleClick }
					onKeyDown={ handleKeyActivate }
					{ ...longPress }
				>
					{ name }
				</span>
				{ ! isSingle && ! sheetEditingDisabled && (
					<Button
						className="m-chart-sheet-tab-delete"
						icon={ circleX }
						size="small"
						id={ deleteId }
						label={ __( 'Delete', 'm-chart' ) }
						// Named "Delete" plus the sheet's name, every sheet has one of these
						aria-labelledby={ `${ deleteId } ${ tabId }` }
						onClick={ handleDelete }
					/>
				) }
				<TextControl
					__next40pxDefaultSize
					// The whole control is hidden while idle, not only its field: the label would otherwise be read out on every tab
					// It stays in the page either way, its value is the sheet's name in the form
					className={ `m-chart-sheet-tab-rename${ isRenaming ? '' : ' is-idle' }` }
					label={ __( 'Rename sheet', 'm-chart' ) }
					hideLabelFromVision
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
			</div>
			{ /*
				Rendered outside the tab's box
				React bubbles events through portals, so inside the tab the modal's clicks and keys would reach the tab's own handlers
			*/ }
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
		</>
	);
}
