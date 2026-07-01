import { registerBlockType } from '@wordpress/blocks';
import { SVG, G, Rect, Polygon } from '@wordpress/components';
import blockJson from './block.json';
import Edit from './edit';

const blockIcon = (
<SVG viewBox="0 0 437 370.056" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false">
    <G transform="matrix(1, 0, 0, 1, 38.403999, 55.937004)">
        <Rect x="281.401" y="148.511" width="88.71" height="141.45" />
        <Rect x="-9.919" y="264.821" width="88.71" height="25.13" />
        <Rect x="-9.919" y="-31.779" width="88.71" height="284.21" />
        <Rect x="281.401" y="-31.779" width="88.71" height="167.87" />
        <Rect x="186.281" y="194.551" width="82.79" height="95.4" />
        <Rect x="91.081" y="235.411" width="82.94" height="54.55" />
        <Polygon points="281.401 -31.779 180.101 65.111 180.101 176.701 281.401 79.711 281.401 -31.779" />
        <Polygon points="78.801 79.711 180.101 176.701 180.101 65.111 78.801 -31.779 78.801 79.711" />
    </G>
</SVG>
);

registerBlockType(
	blockJson,
	{
		edit: Edit,
		save: () => null,
		icon: blockIcon,
		deprecated: [
			{
				attributes: {
					chartId: {
						type:    'string',
						default: '',
					},
					show: {
						type:    'string',
						default: 'chart',
					},
				},
				save: () => null,
				isEligible( attributes ) {
					return typeof attributes.chartId === 'string';
				},
				migrate( attributes ) {
					return {
						...attributes,
						chartId: parseInt( attributes.chartId, 10 ) || 0,
					};
				},
			},
		],
	}
);