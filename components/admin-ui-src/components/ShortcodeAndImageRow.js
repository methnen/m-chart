import { useChartAdmin } from '../context/ChartAdminContext';

export default function ShortcodeAndImageRow() {
	const { state } = useChartAdmin();
	const { postId, postMeta, imageUrl, performance, imageSupport } = state;

	const shortcode = `[chart id="${ postId }"]`;

	const showImageField = 'default' === performance && 'yes' === imageSupport;
	const imageDisabled  = ! showImageField;

	return (
		<div className="row seven">
			<p>
				<label htmlFor="m-chart-shortcode">{ 'Shortcode' }</label><br />
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
			</p>
			<p className="image">
				<label htmlFor="m-chart-image">{ 'Image' }</label><br />
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
							{ 'View' }
						</a>
					</>
				) : imageDisabled ? (
					<em>{ 'Image generation is disabled' }</em>
				) : (
					<em>{ 'Save/Update this post to generate the image version' }</em>
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
