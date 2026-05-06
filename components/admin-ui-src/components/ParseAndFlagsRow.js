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

export default function ParseAndFlagsRow() {
	const { state, dispatch } = useChartAdmin();
	const { postMeta } = state;

	const showShared = SHARED_TYPES.has( postMeta.type );

	function handleChange( field, value ) {
		dispatch( { type: 'SET_POST_META', payload: { [ field ]: value } } );
	}

	function handleCheckbox( field, checked ) {
		dispatch( { type: 'SET_POST_META', payload: { [ field ]: checked } } );
	}

	return (
		<div className={ `row two${ showShared ? ' show-shared' : '' }` }>
			<p>
				<label htmlFor="m-chart-parse_in">{ __( 'Parse data in', 'm-chart' ) }</label><br />
				<select
					name="m-chart[parse_in]"
					id="m-chart-parse_in"
					className="select"
					value={ postMeta.parse_in }
					onChange={ ( e ) => handleChange( 'parse_in', e.target.value ) }
				>
					{ Object.entries( PARSE_OPTION_NAMES ).map( ( [ value, label ] ) => (
						<option key={ value } value={ value }>{ label }</option>
					) ) }
				</select>
			</p>
			<p className="labels">
				{ '\u00a0' }<br />
				<label htmlFor="m-chart-labels">
					<input
						type="checkbox"
						name="m-chart[labels]"
						id="m-chart-labels"
						value="1"
						checked={ !! postMeta.labels }
						onChange={ ( e ) => handleCheckbox( 'labels', e.target.checked ) }
					/>
					{ __( ' Show labels', 'm-chart' ) }
				</label>
			</p>
			<p className="legend">
				{ '\u00a0' }<br />
				<label htmlFor="m-chart-legend">
					<input
						type="checkbox"
						name="m-chart[legend]"
						id="m-chart-legend"
						value="1"
						checked={ !! postMeta.legend }
						onChange={ ( e ) => handleCheckbox( 'legend', e.target.checked ) }
					/>
					{ __( ' Show legend', 'm-chart' ) }
				</label>
			</p>
			{ /* Always render shared in DOM so its value survives type switches on save */ }
			<p className="shared">
				{ '\u00a0' }<br />
				<label htmlFor="m-chart-shared">
					<input
						type="checkbox"
						name="m-chart[shared]"
						id="m-chart-shared"
						value="1"
						checked={ !! postMeta.shared }
						onChange={ ( e ) => handleCheckbox( 'shared', e.target.checked ) }
					/>
					{ __( ' Shared tooltip', 'm-chart' ) }
				</label>
			</p>
		</div>
	);
}
