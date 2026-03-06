import { useChartAdmin } from '../context/ChartAdminContext';

/**
 * Controlled subtitle input — replaces the PHP-rendered subtitle-field.php
 * template for Chart.js charts.
 *
 * Renders with the same name/id attributes so the value is submitted with the
 * native WordPress post form and the existing PHP save logic still works.
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
			placeholder="Enter subtitle here"
			style={ { width: '100%' } }
			onChange={ ( e ) =>
				dispatch( { type: 'SET_SUBTITLE', payload: e.target.value } )
			}
		/>
	);
}
