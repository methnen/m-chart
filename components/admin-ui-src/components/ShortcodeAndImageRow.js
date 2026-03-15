import { useState } from '@wordpress/element';
import { __ } from '@wordpress/i18n';
import { useChartAdmin } from '../context/ChartAdminContext';

export default function ShortcodeAndImageRow() {
	const { state } = useChartAdmin();
	const { postId, postMeta, imageUrl, performance, imageSupport } = state;

	const shortcode = `[chart id="${ postId }"]`;

	const showImageField = 'default' === performance && 'yes' === imageSupport;
	const imageDisabled  = ! showImageField;

	const [ copied, setCopied ] = useState( false );

	function handleCopy() {
		navigator.clipboard.writeText( shortcode ).then( () => {
			setCopied( true );
			setTimeout( () => setCopied( false ), 2000 );
		} );
	}

	return (
		<div className="row seven">
			<p className="shortcode">
				<label htmlFor="m-chart-shortcode">{ __( 'Shortcode', 'm-chart' ) }</label><br />
				<input
					className="input"
					type="text"
					name="m-chart[shortcode]"
					id="m-chart-shortcode"
					value={ shortcode }
					style={ { width: '100%' } }
					onClick={ ( e ) => e.target.select() }
					readOnly
				/>
				<button type="button" className="button" onClick={ handleCopy }>
					{ copied ? __( 'Copied!', 'm-chart' ) : __( 'Copy', 'm-chart' ) }
				</button>
			</p>
			<p className="image">
				<label htmlFor="m-chart-image">{ __( 'Image', 'm-chart' ) }</label><br />
				{ imageUrl ? (
					<>
						<input
							className="input"
							type="text"
							name="m-chart[image]"
							id="m-chart-image"
							value={ imageUrl }
							style={ { width: '100%' } }
							onClick={ ( e ) => e.target.select() }
							readOnly
						/>
						<a href={ imageUrl } className="button" target="_blank" rel="noreferrer">
							{ __( 'View', 'm-chart' ) }
						</a>
					</>
				) : imageDisabled ? (
					<em>{ __( 'Image generation is disabled', 'm-chart' ) }</em>
				) : (
					<em>{ __( 'Save/Update this post to generate the image version', 'm-chart' ) }</em>
				) }
			</p>
			<input
				type="hidden"
				name="m-chart[library]"
				id="m-chart-library"
				value={ postMeta.library }
			/>
		</div>
	);
}
