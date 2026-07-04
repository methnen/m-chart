import { CheckboxControl, SelectControl, TextControl } from '@wordpress/components';
import { Fragment, useState, useCallback } from '@wordpress/element';
import { __ } from '@wordpress/i18n';
import { useChartAdmin } from '../context/ChartAdminContext';
import { measureTextWidth } from '../utils/measureTextWidth';

// Chart types that show y-min controls (line, spline, area only)
const YMIN_TYPES = new Set( [
	'line',
	'spline',
	'area',
] );

// Chart types that show the constrain-y-axis checkbox in the same slot as y-min
const CONSTRAIN_Y_TYPES = new Set( [
	'boxplot',
	'violin',
] );

// Chart types that show axis title/unit rows
const AXIS_TYPES = new Set( [
	'line',
	'spline',
	'area',
	'column',
	'stacked-column',
	'bar',
	'stacked-bar',
	'scatter',
	'bubble',
	'boxplot',
	'violin',
] );

export default function AxisRows() {
	const { state, dispatch } = useChartAdmin();
	const { postMeta, unitTerms } = state;

	const showAxis        = AXIS_TYPES.has( postMeta.type );
	const showYMin        = YMIN_TYPES.has( postMeta.type );
	const showConstrainY  = CONSTRAIN_Y_TYPES.has( postMeta.type );

	// Callback ref triggers a re-render when the input mounts, so the canvas measurement runs with the real element instead of the fallback
	const [ yMinEl, setYMinEl ] = useState( null );
	const yMinRef               = useCallback( node => setYMinEl( node ), [] );
	const yMinValue             = String( postMeta.y_min_value ?? 0 );
	const yMinWidth             = yMinEl ? ( measureTextWidth( yMinValue, yMinEl ) + 20 ) + 'px' : '73px';

	function handleChange( field, value ) {
		dispatch( { type: 'SET_POST_META', payload: { [ field ]: value } } );
	}

	function handleYMinCheck( checked ) {
		dispatch( { type: 'SET_POST_META', payload: { y_min: checked } } );
	}

	function handleConstrainYCheck( checked ) {
		dispatch( { type: 'SET_POST_META', payload: { constrain_y_axis: checked } } );
	}

	// Always render axis rows so field values survive type switches on form save
	// Only hide them visually when the chart type doesn't need them
	const axisStyle       = showAxis ? {} : { display: 'none' };
	const yMinStyle       = showAxis && showYMin ? {} : { display: 'none' };
	const constrainYStyle = showAxis && showConstrainY ? {} : { display: 'none' };

	const unitOptions = (
		<>
			<option value="">{ __( 'N/A', 'm-chart' ) }</option>
			{ unitTerms.map( ( { group, units } ) => (
				<Fragment key={ group }>
					<option value="" disabled>{ group }</option>
					{ units.map( ( unit ) => (
						<option key={ unit.slug } value={ unit.slug }>{ unit.name }</option>
					) ) }
				</Fragment>
			) ) }
		</>
	);

	return (
		<>
			<div className="row three vertical-axis" style={ axisStyle }>
				<div className="column">
					<div>
						<TextControl
							__next40pxDefaultSize
							label={ __( 'Vertical axis title', 'm-chart' ) }
							name="m-chart[y_title]"
							value={ postMeta.y_title }
							onChange={ ( value ) => handleChange( 'y_title', value ) }
						/>
					</div>
				</div>
				<div className="column units">
					<div>
						<SelectControl
							__next40pxDefaultSize
							label={ __( 'Units', 'm-chart' ) }
							name="m-chart[y_units]"
							value={ postMeta.y_units }
							onChange={ ( value ) => handleChange( 'y_units', value ) }
						>
							{ unitOptions }
						</SelectControl>
					</div>
				</div>
			</div>
			<div className="row four y-min" style={ yMinStyle }>
				<CheckboxControl
					name="m-chart[y_min]"
					label={ __( 'Force vertical axis minimum:', 'm-chart' ) }
					checked={ !! postMeta.y_min }
					onChange={ ( checked ) => handleYMinCheck( checked ) }
				/>
				<TextControl
					__next40pxDefaultSize
					type="number"
					label={ __( 'Vertical axis minimum value', 'm-chart' ) }
					hideLabelFromVision
					name="m-chart[y_min_value]"
					ref={ yMinRef }
					value={ postMeta.y_min_value }
					disabled={ ! postMeta.y_min }
					onChange={ ( value ) => handleChange( 'y_min_value', value ) }
					style={ { width: yMinWidth, minWidth: 0 } }
				/>
			</div>
			{ /* Always render so the value survives type switches on save; same row slot as y-min, mutually exclusive by type */ }
			<div className="row four constrain-y-axis" style={ constrainYStyle }>
				<CheckboxControl
					name="m-chart[constrain_y_axis]"
					label={ __( 'Constrain vertical axis', 'm-chart' ) }
					checked={ !! postMeta.constrain_y_axis }
					onChange={ ( checked ) => handleConstrainYCheck( checked ) }
				/>
			</div>
			<div className="row five horizontal-axis" style={ axisStyle }>
				<div className="column">
					<div>
						<TextControl
							__next40pxDefaultSize
							label={ __( 'Horizontal axis title', 'm-chart' ) }
							name="m-chart[x_title]"
							value={ postMeta.x_title }
							onChange={ ( value ) => handleChange( 'x_title', value ) }
						/>
					</div>
				</div>
				<div className="column units">
					<div>
						<SelectControl
							__next40pxDefaultSize
							label={ __( 'Units', 'm-chart' ) }
							name="m-chart[x_units]"
							value={ postMeta.x_units }
							onChange={ ( value ) => handleChange( 'x_units', value ) }
						>
							{ unitOptions }
						</SelectControl>
					</div>
				</div>
			</div>
		</>
	);
}
