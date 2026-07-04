<?php

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Theme Name: M Chart
 */

return array(
	'colors' => array(
		'#0f64ab', // Dark Blue
		'#3b93c3', // Medium Blue
		'#8ec3de', // Light Blue
		'#47494b', // Gray
		'#f6a382', // Peach
		'#d75f4c', // Coral
		'#b31529', // Red
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