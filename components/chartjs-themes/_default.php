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