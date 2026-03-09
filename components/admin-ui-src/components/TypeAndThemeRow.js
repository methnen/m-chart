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
			<p>
				<label htmlFor="m-chart-type">{ __( 'Type', 'm-chart' ) }</label><br />
				<select
					name="m-chart[type]"
					id="m-chart-type"
					className="select"
					value={ postMeta.type }
					onChange={ ( e ) => handleChange( 'type', e.target.value ) }
				>
					{ typeOptions.map( ( type ) => (
						<option key={ type } value={ type }>
							{ typeOptionNames[ type ] || type }
						</option>
					) ) }
				</select>
			</p>
			<p>
				<label htmlFor="m-chart-theme">{ __( 'Theme', 'm-chart' ) }</label><br />
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
				<label htmlFor="m-chart-height">{ __( 'Height', 'm-chart' ) }</label><br />
				<input
					type="number"
					name="m-chart[height]"
					id="m-chart-height"
					ref={ heightRef }
					value={ postMeta.height }
					min="300"
					max="1500"
					onChange={ ( e ) => handleChange( 'height', e.target.value ) }
					style={ { width: heightWidth, minWidth: 0 } }
				/>
			</p>
		</div>
	);
}
