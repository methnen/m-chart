<?php

/**
 * Theme Name: Chart.js 3.x
 */

return array(
	'colors' => array(
		'#ed6d85', // Pink
		'#f7d06b', // Yellow
		'#f2a354', // Orange
		'#56a0e5', // Blue
		'#6cbebf', // Turquoise
		'#47494b', // Gray
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