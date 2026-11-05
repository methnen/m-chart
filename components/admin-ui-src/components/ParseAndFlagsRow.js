import { CheckboxControl, SelectControl } from '@wordpress/components';
import { __ } from '@wordpress/i18n';
import { useChartAdmin } from '../context/ChartAdminContext';
import { hasTrait } from '../utils/typeTraits';

const PARSE_OPTION_NAMES = {
	columns: __( 'Columns', 'm-chart' ),
	rows:    __( 'Rows', 'm-chart' ),
};

export default function ParseAndFlagsRow() {
	const { state, dispatch } = useChartAdmin();
	const { postMeta, typeTraits } = state;

	// Which toggles make sense for the current type comes from the PHP type traits (see M_Chart_Chartjs::get_type_traits())
	// Treemap and venn/euler keep the labels toggle, it controls their native labels
	const showShared        = hasTrait( typeTraits, postMeta.type, 'shared_tooltip' );
	const showLegend        = hasTrait( typeTraits, postMeta.type, 'legend' );
	const showLabels        = hasTrait( typeTraits, postMeta.type, 'labels' );
	const showBoxplotPoints = hasTrait( typeTraits, postMeta.type, 'boxplot_points' );

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
