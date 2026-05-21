import { CheckboxControl, TextControl } from '@wordpress/components';
import { __ } from '@wordpress/i18n';
import { useChartAdmin } from '../context/ChartAdminContext';

export default function SourceRow() {
	const { state, dispatch } = useChartAdmin();
	const { postMeta } = state;

	function handleChange( field, value ) {
		dispatch( { type: 'SET_POST_META', payload: { [ field ]: value } } );
	}

	function handleCheckbox( field, checked ) {
		dispatch( { type: 'SET_POST_META', payload: { [ field ]: checked } } );
	}

	return (
		<>
			<div className="row six">
				<div className="column source">
					<div>
						<TextControl
							__next40pxDefaultSize
							label={ __( 'Source', 'm-chart' ) }
							name="m-chart[source]"
							value={ postMeta.source }
							onChange={ ( value ) => handleChange( 'source', value ) }
						/>
					</div>
				</div>
				<div className="column source-url">
					<div>
						<TextControl
							__next40pxDefaultSize
							type="url"
							label={ __( 'Source URL', 'm-chart' ) }
							name="m-chart[source_url]"
							value={ postMeta.source_url }
							onChange={ ( value ) => handleChange( 'source_url', value ) }
						/>
					</div>
				</div>
			</div>
			<div className="row eight include-source">
				<CheckboxControl
					name="m-chart[include_source]"
					label={ __( 'Include source in chart', 'm-chart' ) }
					checked={ !! postMeta.include_source }
					onChange={ ( checked ) => handleCheckbox( 'include_source', checked ) }
				/>
			</div>
		</>
	);
}
