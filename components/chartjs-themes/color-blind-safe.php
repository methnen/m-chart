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
