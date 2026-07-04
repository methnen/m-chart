<?php

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Theme Name: Color Blind Safe
 *
 * Colors: Okabe & Ito color-blind safe qualitative palette
 * Source: https://jfly.uni-koeln.de/color/
 */

return array(
	'colors' => array(
		'#000000', // Black
		'#e69f00', // Orange
		'#56b4e9', // Sky Blue
		'#009e73', // Bluish Green
		'#f0e442', // Yellow
		'#0072b2', // Blue
		'#d55e00', // Vermillion
		'#cc79a7', // Reddish Purple
	),
	// hoverRadius/hitRadius match get_points_defaults(), theme points replace the defaults wholesale
	// so leaving them out would drop to Chart.js's much smaller hover targets
	'points' => array(
		array(
			'point' => array(
				// Circle
				'pointStyle'  => 'circle',
				'hoverRadius' => 7,
				'hitRadius'   => 13,
			),
		),
		array(
			'point' => array(
				// Diamond
				'pointStyle'  => 'rectRot',
				'hoverRadius' => 7,
				'hitRadius'   => 13,
			),
		),
		array(
			'point' => array(
				// Square
				'pointStyle'  => 'rect',
				'hoverRadius' => 7,
				'hitRadius'   => 13,
			),
		),
		array(
			'point' => array(
				// Up Triangle
				'pointStyle'  => 'triangle',
				'hoverRadius' => 7,
				'hitRadius'   => 13,
			),
		),
		array(
			'point' => array(
				// Down Triangle
				'pointStyle'  => 'triangle',
				'rotation'    => 180,
				'hoverRadius' => 7,
				'hitRadius'   => 13,
			),
		),
	),
);
