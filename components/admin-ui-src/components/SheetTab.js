import { useState, useEffect, useRef } from '@wordpress/element';
import { useChartAdmin } from '../context/ChartAdminContext';
import { useLongPress } from '../hooks/useLongPress';

/**
 * Measures the pixel width of a string using a canvas, mirroring
 * m_chart_admin.resize_input() from m-chart-admin.js.
 */
function measureTextWidth( text, inputEl ) {
	if ( ! inputEl ) {
		return Math.max( 40, text.length * 8 + 16 );
	}

	const style         = window.getComputedStyle( inputEl );
	const canvas        = document.createElement( 'canvas' );
	const ctx           = canvas.getContext( '2d' );
	ctx.font            = style.font;
	const textWidth     = Math.ceil( ctx.measureText( text ).width ) + 1;
	const borderWidth   = parseFloat( style.borderWidth ) || 0;
	const paddingLeft   = parseFloat( style.paddingLeft ) || 0;
	const paddingRight  = parseFloat( style.paddingRight ) || 0;

	return ( borderWidth * 2 ) + paddingLeft + textWidth + paddingRight;
}

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
