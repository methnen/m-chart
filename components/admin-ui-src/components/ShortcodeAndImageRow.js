import { Button, TextControl } from '@wordpress/components';
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
			<div className="column shortcode">
				<div>
					<TextControl
						__next40pxDefaultSize
						label={ __( 'Shortcode', 'm-chart' ) }
						name="m-chart[shortcode]"
						value={ shortcode }
						readOnly
						onChange={ () => {} }
						onClick={ ( e ) => e.target.select() }
					/>
				</div>
				<Button variant="secondary" onClick={ handleCopy } className="m-chart-input-action-button">
					{ copied ? __( 'Copied!', 'm-chart' ) : __( 'Copy', 'm-chart' ) }
				</Button>
			</div>
			<div className="column image">
				{ imageUrl ? (
					<div>
						<TextControl
							__next40pxDefaultSize
							label={ __( 'Image', 'm-chart' ) }
							name="m-chart[image]"
							value={ imageUrl }
							readOnly
							onChange={ () => {} }
							onClick={ ( e ) => e.target.select() }
						/>
						<Button
							variant="secondary"
							type="button"
							href={ imageUrl }
							target="_blank"
							rel="noopener noreferrer"
							className="m-chart-input-action-button"
						>
							{ __( 'View', 'm-chart' ) }
						</Button>
					</div>
				) : (
					<div>
						<label htmlFor="m-chart-image">{ __( 'Image', 'm-chart' ) }</label><br />
						{ imageDisabled ? (
							<em>{ __( 'Image generation is disabled', 'm-chart' ) }</em>
						) : (
							<em>{ __( 'Save/Update this post to generate the image version', 'm-chart' ) }</em>
						) }
					</div>
				) }
			</div>
			<input
				type="hidden"
				name="m-chart[library]"
				id="m-chart-library"
				value={ postMeta.library }
			/>
		</div>
	);
}
