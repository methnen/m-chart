import { useState, useEffect, useRef } from '@wordpress/element';
import { useChartAdmin } from '../context/ChartAdminContext';
import { useLongPress } from '../hooks/useLongPress';
import { measureTextWidth } from '../utils/measureTextWidth';

/**
 * A single sheet tab in the spreadsheet tab bar.
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
	const [ isRenaming, setIsRenaming ] = useState( () => !! isNew );
	const [ inputValue, setInputValue ] = useState( name );
	const inputRef = useRef( null );

	const longPress = useLongPress( () => setIsRenaming( true ) );

	// Clear the newSheetId flag once this tab has consumed it.
	useEffect( () => {
		if ( isNew ) {
			dispatch( { type: 'CLEAR_NEW_SHEET_ID' } );
		}
	}, [] ); // eslint-disable-line react-hooks/exhaustive-deps

	// Sync local input value and focus when entering rename mode.
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
		setIsRenaming( true );
	}

	function handleDelete( e ) {
		e.preventDefault();
		e.stopPropagation();
		if ( isSingle ) {
			return;
		}
		if ( ! window.confirm( state.deleteConfirm ) ) {
			return;
		}
		// Activate a neighbouring sheet before deleting so the active index stays valid.
		if ( isActive ) {
			const newActive = sheetIndex > 0 ? sheetIndex - 1 : 1;
			dispatch( { type: 'SET_ACTIVE_SHEET', payload: newActive } );
		}
		dispatch( { type: 'DELETE_SHEET', payload: { index: sheetIndex } } );
	}

	function handleNameChange( e ) {
		setInputValue( e.target.value );
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
		'nav-tab',
		isActive ? 'nav-tab-active' : '',
		isSingle ? 'do-not-delete' : '',
	].filter( Boolean ).join( ' ' );

	return (
		<a
			href="#"
			className={ className }
			id={ `spreadsheet-tab-${ sheetId }` }
			onClick={ handleClick }
			onDoubleClick={ handleDoubleClick }
			{ ...longPress }
		>
			{ ! isSingle && (
				<span
					className="dashicons dashicons-dismiss"
					onClick={ handleDelete }
				/>
			) }
			<span
				className="tab-title"
				style={ { display: isRenaming ? 'none' : '' } }
			>
				{ name }
			</span>
			<input
				ref={ inputRef }
				type="text"
				name={ `m-chart[set_names][${ sheetIndex }]` }
				className="spreadsheet-tab-input"
				value={ inputValue }
				style={ {
					display: isRenaming ? '' : 'none',
					width:   inputWidth,
				} }
				onChange={ handleNameChange }
				onBlur={ commitRename }
				onKeyDown={ handleKeyDown }
			/>
		</a>
	);
}
