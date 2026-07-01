import { Button, TextControl } from '@wordpress/components';
import { useState } from '@wordpress/element';
import { speak } from '@wordpress/a11y';
import { __ } from '@wordpress/i18n';
import { useChartAdmin } from '../context/ChartAdminContext';

export default function ShortcodeAndImageRow() {
	const { state } = useChartAdmin();
	const { postId, postMeta, imageUrl, performance, imageSupport } = state;

	const shortcode = `[m-chart id="${ postId }"]`;

	const showImageField = 'default' === performance && 'yes' === imageSupport;
	const imageDisabled  = ! showImageField;

	const imagePlaceholder = imageDisabled
		? __( 'Image generation is disabled', 'm-chart' )
		: __( 'Save/Update this post to generate the image version', 'm-chart' );

	const [ copied, setCopied ] = useState( false );

	function handleCopy() {
		navigator.clipboard.writeText( shortcode ).then( () => {
			setCopied( true );
			speak( __( 'Shortcode copied to clipboard', 'm-chart' ) );
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
				<div>
					<TextControl
						__next40pxDefaultSize
						label={ __( 'Image', 'm-chart' ) }
						name="m-chart[image]"
						value={ imageUrl || '' }
						placeholder={ imageUrl ? undefined : imagePlaceholder }
						disabled={ ! imageUrl }
						readOnly={ !! imageUrl }
						onChange={ () => {} }
						onClick={ ( e ) => { if ( imageUrl ) { e.target.select(); } } }
					/>
					{ imageUrl && (
						<Button
							variant="secondary"
							type="button"
							href={ imageUrl }
							target="_blank"
							rel="noopener noreferrer"
							className="m-chart-input-action-button"
						>
							{ __( 'View', 'm-chart' ) }
							<span className="screen-reader-text">
								{ __( '(opens in a new tab)', 'm-chart' ) }
							</span>
						</Button>
					) }
				</div>
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
