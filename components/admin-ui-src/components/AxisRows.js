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
] );

export default function AxisRows() {
	const { state, dispatch } = useChartAdmin();
	const { postMeta, unitTerms } = state;

	const showAxis  = AXIS_TYPES.has( postMeta.type );
	const showYMin  = YMIN_TYPES.has( postMeta.type );

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

	// Always render axis rows so field values survive type switches on form save.
	// Only hide them visually when the chart type doesn't need them.
	const axisStyle = showAxis ? {} : { display: 'none' };
	const yMinStyle = showAxis && showYMin ? {} : { display: 'none' };

	const unitOptions = (
		<>
			<option value="">{ __( 'N/A', 'm-chart' ) }</option>
			{ unitTerms.map( ( { group, units } ) => (
				<Fragment key={ group }>
					<option value="" disabled>{ group }</option>
					{ units.map( ( unit ) => (
						<option key={ unit.name } value={ unit.name }>{ unit.name }</option>
					) ) }
				</Fragment>
			) ) }
		</>
	);

	return (
		<>
			<div className="row three vertical-axis" style={ axisStyle }>
				<p>
					<label htmlFor="m-chart-y-title">{ __( 'Vertical axis title', 'm-chart' ) }</label><br />
					<input
						className="input"
						type="text"
						name="m-chart[y_title]"
						id="m-chart-y-title"
						value={ postMeta.y_title }
						style={ { width: '100%' } }
						onChange={ ( e ) => handleChange( 'y_title', e.target.value ) }
					/>
				</p>
				<p className="units">
					<label htmlFor="m-chart-y-units">{ __( 'Units', 'm-chart' ) }</label><br />
					<select
						name="m-chart[y_units]"
						id="m-chart-y-units"
						className="select"
						value={ postMeta.y_units }
						onChange={ ( e ) => handleChange( 'y_units', e.target.value ) }
					>
						{ unitOptions }
					</select>
				</p>
			</div>
			<div className="row four y-min" style={ yMinStyle }>
				<p>
					<label htmlFor="m-chart-y-min">
						<input
							type="checkbox"
							name="m-chart[y_min]"
							id="m-chart-y-min"
							value="1"
							checked={ !! postMeta.y_min }
							onChange={ ( e ) => handleYMinCheck( e.target.checked ) }
						/>
						{ __( ' Force vertical axis minimum: ', 'm-chart' ) }
					</label>
					<input
						type="number"
						name="m-chart[y_min_value]"
						id="m-chart-y-min-value"
						ref={ yMinRef }
						value={ postMeta.y_min_value }
						disabled={ ! postMeta.y_min }
						onChange={ ( e ) => handleChange( 'y_min_value', e.target.value ) }
						style={ { width: yMinWidth, minWidth: 0 } }
					/>
				</p>
			</div>
			<div className="row five horizontal-axis" style={ axisStyle }>
				<p>
					<label htmlFor="m-chart-x-title">{ __( 'Horizontal axis title', 'm-chart' ) }</label><br />
					<input
						className="input"
						type="text"
						name="m-chart[x_title]"
						id="m-chart-x-title"
						value={ postMeta.x_title }
						style={ { width: '100%' } }
						onChange={ ( e ) => handleChange( 'x_title', e.target.value ) }
					/>
				</p>
				<p className="units">
					<label htmlFor="m-chart-x-units">{ __( 'Units', 'm-chart' ) }</label><br />
					<select
						name="m-chart[x_units]"
						id="m-chart-x-units"
						className="select"
						value={ postMeta.x_units }
						onChange={ ( e ) => handleChange( 'x_units', e.target.value ) }
					>
						{ unitOptions }
					</select>
				</p>
			</div>
		</>
	);
}
