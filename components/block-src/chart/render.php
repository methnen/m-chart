<?php
if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Server-side rendering of the `wtblocks/chart` block
 *
 * $attributes (array): The block attributes
 * $content (string): The block default content
 * $block (WP_Block): The block instance
 */

$chart_id = $attributes['chartId'] ?? null;

if ( ! empty( $chart_id ) ) :
	$allowed_show = [ 'chart', 'image', 'table' ];
	$show         = in_array( $attributes['show'] ?? '', $allowed_show, true ) ? $attributes['show'] : 'chart';

	echo '[m-chart id="' . absint( $chart_id ) . '" show="' . esc_attr( $show ) . '"]';
endif;
