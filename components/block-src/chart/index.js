import { __ } from '@wordpress/i18n';
import { registerBlockType } from '@wordpress/blocks';

import metadata from './block.json';
import edit from './edit';

registerBlockType(
    metadata,
    {
        edit: edit,
        save: () => null,
        deprecated: [
            {
                attributes: {
                    chartId: { type: 'string', default: '' },
                    show:    { type: 'string', default: 'chart' },
                },
                isEligible( attributes ) {
                    return typeof attributes.chartId === 'string' && attributes.chartId !== '';
                },
                migrate( attributes ) {
                    return {
                        ...attributes,
                        chartId: parseInt( attributes.chartId, 10 ) || 0,
                    };
                },
                save: () => null,
            },
        ],
    }
);