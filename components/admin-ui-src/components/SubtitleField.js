import { __ } from '@wordpress/i18n';
import { useChartAdmin } from '../context/ChartAdminContext';

/**
 * Reach controlled subtitle input
 *
 * Renders with the m-chart[subtitle] name attribute so the value is submitted with the native WordPress post form and the existing PHP save logic still works
 */
export default function SubtitleField() {
	const { state, dispatch } = useChartAdmin();
	const value = state.postMeta?.subtitle ?? '';

	return (
		<input
			className="input"
			type="text"
			name="m-chart[subtitle]"
			id="m-chart-subtitle"
			value={ value }
			placeholder={ __( 'Enter subtitle here', 'm-chart' ) }
			style={ { width: '100%' } }
			onChange={ ( e ) =>
				dispatch( { type: 'SET_SUBTITLE', payload: e.target.value } )
			}
		/>
	);
}
