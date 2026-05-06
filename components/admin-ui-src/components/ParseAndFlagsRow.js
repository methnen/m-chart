import { CheckboxControl, SelectControl } from '@wordpress/components';
import { __ } from '@wordpress/i18n';
import { useChartAdmin } from '../context/ChartAdminContext';

const PARSE_OPTION_NAMES = {
	columns: __( 'Columns', 'm-chart' ),
	rows:    __( 'Rows', 'm-chart' ),
};

// Chart types that support the shared tooltip option
const SHARED_TYPES = new Set( [
	'line',
	'spline',
	'area',
	'radar',
	'radar-area'
] );

// Chart types where the legend toggle has no meaningful effect
const NO_LEGEND_TYPES = new Set( [
	'treemap',
] );

// Chart types where the data labels toggle has no meaningful effect
// Treemap is intentionally NOT here - it uses the same checkbox to control its native labels
const NO_LABELS_TYPES = new Set( [
	'boxplot',
	'violin',
] );

// Chart types that get the mean / point distribution toggles
const BOXPLOT_POINT_TYPES = new Set( [
	'boxplot',
	'violin',
] );

export default function ParseAndFlagsRow() {
	const { state, dispatch } = useChartAdmin();
	const { postMeta } = state;

	const showShared        = SHARED_TYPES.has( postMeta.type );
	const showLegend        = ! NO_LEGEND_TYPES.has( postMeta.type );
	const showLabels        = ! NO_LABELS_TYPES.has( postMeta.type );
	const showBoxplotPoints = BOXPLOT_POINT_TYPES.has( postMeta.type );

	function handleChange( field, value ) {
		dispatch( { type: 'SET_POST_META', payload: { [ field ]: value } } );
	}

	function handleCheckbox( field, checked ) {
		dispatch( { type: 'SET_POST_META', payload: { [ field ]: checked } } );
	}

	return (
		<div className={ `row two${ showShared ? ' show-shared' : '' }` }>
			<div className="column">
				<div>
					<SelectControl
						__next40pxDefaultSize
						label={ __( 'Parse data in', 'm-chart' ) }
						name="m-chart[parse_in]"
						value={ postMeta.parse_in }
						onChange={ ( value ) => handleChange( 'parse_in', value ) }
					>
						{ Object.entries( PARSE_OPTION_NAMES ).map( ( [ value, label ] ) => (
							<option key={ value } value={ value }>{ label }</option>
						) ) }
					</SelectControl>
				</div>
			</div>
			{ /* Always render labels in DOM so its value survives type switches on save */ }
			<div className="column labels" style={ { display: showLabels ? '' : 'none' } }>
				{ '\u00a0' }<br />
				<div>
					<CheckboxControl
						name="m-chart[labels]"
						label={ __( 'Show labels', 'm-chart' ) }
						checked={ !! postMeta.labels }
						onChange={ ( checked ) => handleCheckbox( 'labels', checked ) }
					/>
				</div>
			</div>
			{ /* Always render legend in DOM so its value survives type switches on save */ }
			<div className="column legend" style={ { display: showLegend ? '' : 'none' } }>
				{ '\u00a0' }<br />
				<div>
					<CheckboxControl
						name="m-chart[legend]"
						label={ __( 'Show legend', 'm-chart' ) }
						checked={ !! postMeta.legend }
						onChange={ ( checked ) => handleCheckbox( 'legend', checked ) }
					/>
				</div>
			</div>
			{ /* Always render in DOM so values survive type switches on save */ }
			<div className="column mean-point" style={ { display: showBoxplotPoints ? '' : 'none' } }>
				{ '\u00a0' }<br />
				<div>
					<CheckboxControl
						name="m-chart[mean_point]"
						label={ __( 'Show mean point', 'm-chart' ) }
						checked={ !! postMeta.mean_point }
						onChange={ ( checked ) => handleCheckbox( 'mean_point', checked ) }
					/>
				</div>
			</div>
			<div className="column sample-points" style={ { display: showBoxplotPoints ? '' : 'none' } }>
				{ '\u00a0' }<br />
				<div>
					<CheckboxControl
						name="m-chart[sample_points]"
						label={ __( 'Show sample points', 'm-chart' ) }
						checked={ !! postMeta.sample_points }
						onChange={ ( checked ) => handleCheckbox( 'sample_points', checked ) }
					/>
				</div>
			</div>
			{ /* Always render shared in DOM so its value survives type switches on save */ }
			<div className="column shared">
				{ '\u00a0' }<br />
				<div>
					<CheckboxControl
						name="m-chart[shared]"
						label={ __( 'Shared tooltip', 'm-chart' ) }
						checked={ !! postMeta.shared }
						onChange={ ( checked ) => handleCheckbox( 'shared', checked ) }
					/>
				</div>
			</div>
		</div>
	);
}
