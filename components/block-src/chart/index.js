import { __ } from '@wordpress/i18n';
import { registerBlockType } from '@wordpress/blocks';
import { SVG, Path } from '@wordpress/components';
import blockJson from './block.json';
import edit from './edit';

const blockIcon = (
<SVG viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" width="24" height="24" aria-hidden="true" focusable="false">
    <Path d="M 18.7 3 L 5.3 3 C 4 3 3 4 3 5.3 L 3 18.7 C 3 20 4 21 5.3 21 L 18.7 21 C 20 21 21 20 21 18.7 L 21 5.3 C 21 4 20 3 18.7 3 Z M 19.5 18.7 C 19.5 19.1 19.1 19.5 18.7 19.5 L 5.3 19.5 C 4.9 19.5 4.5 19.1 4.5 18.7 L 4.5 5.3 C 4.5 4.9 4.9 4.5 5.3 4.5 L 18.7 4.5 C 19.1 4.5 19.5 4.9 19.5 5.3 L 19.5 18.7 Z" />
    <Path d="M 12.312 7 L 12.312 11.688 L 17 11.688 C 17 9.1 14.9 7 12.312 7 Z M 11.375 12.157 L 11.375 7.635 C 8.932 7.797 7 9.828 7 12.312 C 7 14.9 9.1 17 11.687 17 C 14.172 17 16.203 15.068 16.365 12.625 L 11.375 12.625 L 11.375 12.157 Z" style={{ strokeWidth: 1 }} />
</SVG>
);

registerBlockType(
	blockJson,
	{
		edit: edit,
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