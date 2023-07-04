<?php
/**
 * Server-side rendering of the `wtblocks/chart` block.
 *
 * $attributes (array): The block attributes.
 * $content (string): The block default content.
 * $block (WP_Block): The block instance.
 */

$chart_id = $attributes['chartId'] ?? null;

if ( ! empty( $chart_id ) ) :
	echo '[chart id="' . $chart_id . '"]';
endif;
