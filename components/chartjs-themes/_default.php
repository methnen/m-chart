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
	'points' => array(
		array(
			'point' => array(
				// Circle
				'pointStyle' => 'circle',
			),
		),
		array(
			'point' => array(
				// Diamond
				'pointStyle' => 'rectRot',
			),
		),
		array(
			'point' => array(
				// Square
				'pointStyle' => 'rect',
			),
		),
		array(
			'point' => array(
				// Up Triangle
				'pointStyle' => 'triangle',
			),
		),
		array(
			'point' => array(
				// Down Triangle
				'pointStyle' => 'triangle',
				'rotation'   => 180,
			),
		),
	),
);