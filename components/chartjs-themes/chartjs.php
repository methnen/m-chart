<?php

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Theme Name: Chart.js
 */

return array(
	'colors' => array(
		'#56a0e5', // Blue
		'#ed6d85', // Pink
		'#6cbdbf', // Turquoise
		'#f1a354', // Orange
		'#9169f6', // Purple
		'#f7cf6b', // Yellow
		'#c9cbce', // Gray
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
