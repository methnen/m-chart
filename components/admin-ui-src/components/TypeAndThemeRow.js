import { CheckboxControl, SelectControl, TextControl } from '@wordpress/components';
import { useState, useCallback } from '@wordpress/element';
import { __ } from '@wordpress/i18n';
import { useChartAdmin } from '../context/ChartAdminContext';
import { measureTextWidth } from '../utils/measureTextWidth';

// Chart types that support cycling palette colors per data point
const DATA_POINT_COLOR_TYPES = new Set( [
	'column',
	'bar',
	'treemap',
	'boxplot',
	'violin',
] );

// Chart types where the per-point color toggle requires single-series (simple 2D) data
// Treemap is in this set because hierarchical (3+ column) data uses parent-group coloring rather than per-leaf cycling, so the toggle wouldn't apply
// Boxplot/Violin are in this set because per-box cycling only makes sense with one dataset
const TYPES_REQUIRING_SIMPLE_2D = new Set( [
	'column',
	'bar',
	'treemap',
	'boxplot',
	'violin',
] );

/**
 * Returns the index past the last non-empty cell in a row.
 * Empty = "" or null or undefined. 0 is non-empty (valid numeric value).
 * Used so trailing Jspreadsheet padding cells don't inflate the column count.
 *
 * @param {Array} row One row from a 2D data array
 * @return {number} Effective length (rightmost non-empty index + 1, or 0)
 */
function effectiveLength( row ) {
	if ( ! Array.isArray( row ) ) {
		return 0;
	}

	for ( let i = row.length - 1; i >= 0; i-- ) {
		const cell = row[ i ];
	
		if ( cell !== '' && cell !== null && cell !== undefined ) {
			return i + 1;
		}
	}

	return 0;
}

/**
 * Detect whether the active sheet looks like simple 2D single-series data
 * — at most 2 effective columns in rows mode, or at most 2 effective rows in columns mode
 *
 * "Effective" trims trailing empty cells/rows so Jspreadsheet's minDimensions padding
 * (37 cols × 17 rows by default) doesn't push otherwise-simple data over the threshold
 *
 * @param {Array<Array>} sheet   The 2D data array (Jspreadsheet getData() shape)
 * @param {string}       parseIn 'rows' or 'columns'
 * @return {boolean} True when the sheet has only one series in the active orientation
 */
export function isSimple2DSeries( sheet, parseIn ) {
	if ( ! Array.isArray( sheet ) || 0 === sheet.length ) {
		return false;
	}

	if ( 'columns' === parseIn ) {
		// "simple" means ≤ 2 effective rows (rows that have any non-empty cell)
		let lastNonEmptyRow = -1;
		for ( let i = sheet.length - 1; i >= 0; i-- ) {
			if ( effectiveLength( sheet[ i ] ) > 0 ) {
				lastNonEmptyRow = i;
				break;
			}
		}
		return ( lastNonEmptyRow + 1 ) <= 2;
	}

	// rows mode — "simple" means ≤ 2 effective columns across any row
	const maxCols = sheet.reduce( ( max, row ) => Math.max( max, effectiveLength( row ) ), 0 );
	return maxCols <= 2;
}

export default function TypeAndThemeRow() {
	const { state, dispatch } = useChartAdmin();
	const { postMeta, typeOptions, typeOptionNames, themes, spreadsheetData } = state;

	const [ heightEl, setHeightEl ] = useState( null );
	const heightRef                 = useCallback( node => setHeightEl( node ), [] );
	const heightValue               = String( postMeta.height ?? '' );
	const heightWidth               = heightEl
		? ( measureTextWidth( heightValue, heightEl ) + 20 ) + 'px'
		: '73px';

	let showDataPointColors = DATA_POINT_COLOR_TYPES.has( postMeta.type );

	if ( showDataPointColors && TYPES_REQUIRING_SIMPLE_2D.has( postMeta.type ) ) {
		// Boxplot/violin treat each sheet as a separate dataset, so "single-dataset" means
		// exactly one sheet (the per-box-color toggle is meaningful only there)
		if ( 'boxplot' === postMeta.type || 'violin' === postMeta.type ) {
			showDataPointColors = Array.isArray( spreadsheetData ) && 1 === spreadsheetData.length;
		} else {
			const activeSheet = Array.isArray( spreadsheetData ) ? spreadsheetData[0] : null;
			showDataPointColors = isSimple2DSeries( activeSheet, postMeta.parse_in );
		}
	}

	function handleChange( field, value ) {
		dispatch( { type: 'SET_POST_META', payload: { [ field ]: value } } );
	}

	function handleCheckbox( field, checked ) {
		dispatch( { type: 'SET_POST_META', payload: { [ field ]: checked } } );
	}

	return (
		<div className="row one">
			<div className="column">
				<div>
					<SelectControl
						__next40pxDefaultSize
						label={ __( 'Type', 'm-chart' ) }
						name="m-chart[type]"
						value={ postMeta.type }
						onChange={ ( value ) => handleChange( 'type', value ) }
					>
						{ typeOptions.map( ( type ) => (
							<option key={ type } value={ type }>
								{ typeOptionNames[ type ] || type }
							</option>
						) ) }
					</SelectControl>
				</div>
			</div>
			<div className="column">
				<div>
					<SelectControl
						__next40pxDefaultSize
						label={ __( 'Theme', 'm-chart' ) }
						name="m-chart[theme]"
						value={ postMeta.theme }
						onChange={ ( value ) => handleChange( 'theme', value ) }
					>
						{ themes.map( ( theme ) => (
							<option key={ theme.slug } value={ theme.slug }>
								{ theme.name }
							</option>
						) ) }
					</SelectControl>
				</div>
			</div>
			{ /* Always render in DOM so its value survives type switches on save */ }
			<div className="column data-point-colors" style={ { display: showDataPointColors ? '' : 'none' } }>
				{ ' ' }<br />
				<div>
					<CheckboxControl
						name="m-chart[data_point_colors]"
						label={ __( 'Color per data point', 'm-chart' ) }
						checked={ !! postMeta.data_point_colors }
						onChange={ ( checked ) => handleCheckbox( 'data_point_colors', checked ) }
					/>
				</div>
			</div>
			<div className="column">
				<div>
					<TextControl
						__next40pxDefaultSize
						type="number"
						label={ __( 'Height', 'm-chart' ) }
						name="m-chart[height]"
						ref={ heightRef }
						value={ postMeta.height }
						min="300"
						max="1500"
						onChange={ ( value ) => handleChange( 'height', value ) }
						style={ { width: heightWidth, minWidth: 0 } }
					/>
				</div>
			</div>
		</div>
	);
}
