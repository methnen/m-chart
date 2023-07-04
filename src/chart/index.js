import { registerBlockType } from '@wordpress/blocks';

import metadata from './block.json';
import edit from './edit';

registerBlockType(
    metadata,
    {
        edit: edit,
        save: () => null,
    }
);
