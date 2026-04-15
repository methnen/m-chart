import { SelectControl, TextControl } from '@wordpress/components';
import { useState, useCallback } from '@wordpress/element';
import { __ } from '@wordpress/i18n';
import { useChartAdmin } from '../context/ChartAdminContext';
import { measureTextWidth } from '../utils/measureTextWidth';

export default function TypeAndThemeRow() {
	const { state, dispatch } = useChartAdmin();
	const { postMeta, typeOptions, typeOptionNames, themes } = state;

	const [ heightEl, setHeightEl ] = useState( null );
	const heightRef                 = useCallback( node => setHeightEl( node ), [] );
	const heightValue               = String( postMeta.height ?? '' );
	const heightWidth               = heightEl
		? ( measureTextWidth( heightValue, heightEl ) + 20 ) + 'px'
		: '73px';

	function handleChange( field, value ) {
		dispatch( { type: 'SET_POST_META', payload: { [ field ]: value } } );
	}

	return (
		<div className="row one">
			<div className="column">
				<div>
					<SelectControl
						__next40pxDefaultSize
						label={ __( 'Type', 'm-chart' ) }
						name="m-chart[type]"
						value={ postMeta.type }
						onChange={ ( value ) => handleChange( 'type', value ) }
					>
						{ typeOptions.map( ( type ) => (
							<option key={ type } value={ type }>
								{ typeOptionNames[ type ] || type }
							</option>
						) ) }
					</SelectControl>
				</div>
			</div>
			<div className="column">
				<div>
					<SelectControl
						__next40pxDefaultSize
						label={ __( 'Theme', 'm-chart' ) }
						name="m-chart[theme]"
						value={ postMeta.theme }
						onChange={ ( value ) => handleChange( 'theme', value ) }
					>
						{ themes.map( ( theme ) => (
							<option key={ theme.slug } value={ theme.slug }>
								{ theme.name }
							</option>
						) ) }
					</SelectControl>
				</div>
			</div>
			<div className="column">
				<div>
					<TextControl
						__next40pxDefaultSize
						type="number"
						label={ __( 'Height', 'm-chart' ) }
						name="m-chart[height]"
						ref={ heightRef }
						value={ postMeta.height }
						min="300"
						max="1500"
						onChange={ ( value ) => handleChange( 'height', value ) }
						style={ { width: heightWidth, minWidth: 0 } }
					/>
				</div>
			</div>
		</div>
	);
}
