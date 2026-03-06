import { useEffect } from '@wordpress/element';
import { useChartAdmin } from '../context/ChartAdminContext';

/**
 * Call jQuery's handle_chart_type directly given a select element.
 * In Phase 2, the type select is React-rendered so jQuery's event binding
 * runs before the element exists. We call the function directly instead of
 * relying on jQuery's event listener being attached.
 */
function triggerJqueryTypeHandler( selectEl ) {
	if ( selectEl && window.m_chart_chartjs_admin ) {
		window.m_chart_chartjs_admin.handle_chart_type.call( selectEl );
	}
}

export default function TypeAndThemeRow() {
	const { state, dispatch } = useChartAdmin();
	const { postMeta, typeOptions, typeOptionNames, themes } = state;

	// After mount, fire jQuery's visibility handler with the initial chart type.
	useEffect( () => {
		triggerJqueryTypeHandler( document.getElementById( 'm-chart-type' ) );
	}, [] );

	function handleChange( field, value ) {
		dispatch( { type: 'SET_POST_META', payload: { [ field ]: value } } );
	}

	function handleTypeChange( e ) {
		handleChange( 'type', e.target.value );
		// Keep jQuery's tab/field visibility in sync for Phase 2 coexistence.
		triggerJqueryTypeHandler( e.target );
	}

	return (
		<div className="row one">
			<p>
				<label htmlFor="m-chart-type">{ 'Type' }</label><br />
				<select
					name="m-chart[type]"
					id="m-chart-type"
					className="select"
					value={ postMeta.type }
					onChange={ handleTypeChange }
				>
					{ typeOptions.map( ( type ) => (
						<option key={ type } value={ type }>
							{ typeOptionNames[ type ] || type }
						</option>
					) ) }
				</select>
			</p>
			<p>
				<label htmlFor="m-chart-theme">{ 'Theme' }</label><br />
				<select
					name="m-chart[theme]"
					id="m-chart-theme"
					value={ postMeta.theme }
					onChange={ ( e ) => handleChange( 'theme', e.target.value ) }
				>
					{ themes.map( ( theme ) => (
						<option key={ theme.slug } value={ theme.slug }>
							{ theme.name }
						</option>
					) ) }
				</select>
			</p>
			<p>
				<label htmlFor="m-chart-height">{ 'Height' }</label><br />
				<input
					type="number"
					name="m-chart[height]"
					id="m-chart-height"
					value={ postMeta.height }
					min="300"
					max="1500"
					onChange={ ( e ) => handleChange( 'height', e.target.value ) }
				/>
			</p>
		</div>
	);
}
