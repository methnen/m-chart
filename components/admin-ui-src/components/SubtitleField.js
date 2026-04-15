import { TextControl } from '@wordpress/components';
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
		<TextControl
			__next40pxDefaultSize
			name="m-chart[subtitle]"
			value={ value }
			placeholder={ __( 'Enter subtitle here', 'm-chart' ) }
			onChange={ ( newValue ) =>
				dispatch( { type: 'SET_SUBTITLE', payload: newValue } )
			}
		/>
	);
}
