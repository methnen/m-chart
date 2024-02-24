<?php

class M_Chart_Chartjs {
	public $library            = 'chartjs';
	public $library_name       = 'Chart.js';
	public $value_labels_limit = 15;
	public $value_labels_div   = 10;
	public $original_labels;
	public $post;
	public $post_meta;
	public $args;
	public $type_options      = array(
		'line',
		'spline',
		'area',
		'column',
		'stacked-column',
		'bar',
		'stacked-bar',
		'pie',
		'doughnut',
		'scatter',
		'bubble',
		'radar',
		'radar-area',
		'polar',
	);
	public $type_option_names = array();
	public $theme_directories;
	public $colors         = array(
		'#ed6d85', // Pink
		'#f7d06b', // Yellow
		'#f2a354', // Orange
		'#56a0e5', // Blue
		'#6cbebf', // Turquoise
		'#47494b', // Gray
	);
	public $points         = array(
		array(
			'point' => array(
				'pointStyle' => 'circle',
			),
		),
		array(
			'point' => array(
				'pointStyle' => 'rectRot',
			),
		),
		array(
			'point' => array(
				'pointStyle' => 'rect',
			),
		),
		array(
			'point' => array(
				'pointStyle' => 'triangle',
			),
		),
		array(
			'point' => array(
				'pointStyle' => 'triangle',
				'rotation'   => 180,
			),
		),
	);
	public $chart_types    = array(
		'column'         => 'bar',
		'stacked-column' => 'bar',
		'bar'            => 'bar',
		'stacked-bar'    => 'bar',
		'pie'            => 'pie',
		'doughnut'       => 'doughnut',
		'line'           => 'line',
		'spline'         => 'line',
		'area'           => 'line',
		'scatter'        => 'scatter',
		'bubble'         => 'bubble',
		'radar'          => 'radar',
		'radar-area'     => 'radar',
		'polar'          => 'polarArea',
	);
	public $helpers_loaded = false;

	/**
	 * Constructor
	 */
	public function __construct() {
		add_filter( 'm_chart_image_support', array( $this, 'm_chart_image_support' ), 10, 2 );
		add_filter( 'm_chart_iframe_scripts', array( $this, 'm_chart_iframe_scripts' ), 10, 2 );

		$this->theme_directories = array(
			get_stylesheet_directory() . '/m-chart-chartjs-themes/', // Child theme
			get_template_directory() . '/m-chart-chartjs-themes/', // Parent theme
			__DIR__ . '/chartjs-themes/',
		);

		$this->type_option_names = array(
			'line'           => esc_html__( 'Line', 'm-chart' ),
			'spline'         => esc_html__( 'Spline', 'm-chart' ),
			'area'           => esc_html__( 'Area', 'm-chart' ),
			'column'         => esc_html__( 'Column', 'm-chart' ),
			'stacked-column' => esc_html__( 'Stacked Column', 'm-chart' ),
			'bar'            => esc_html__( 'Bar', 'm-chart' ),
			'stacked-bar'    => esc_html__( 'Stacked Bar', 'm-chart' ),
			'pie'            => esc_html__( 'Pie', 'm-chart' ),
			'doughnut'       => esc_html__( 'Doughnut', 'm-chart' ),
			'scatter'        => esc_html__( 'Scatter', 'm-chart' ),
			'bubble'         => esc_html__( 'Bubble', 'm-chart' ),
			'radar'          => esc_html__( 'Radar', 'm-chart' ),
			'radar-area'     => esc_html__( 'Radar Area', 'm-chart' ),
			'polar'          => esc_html__( 'Polar', 'm-chart' ),
		);
	}

	/**
	 * Get the necessary chart data for a given chart and assign it the right class vars
	 *
	 * @param int $post_id the WP ID for the chart post
	 * @param array $args any args we want to override the defaults for
	 */
	public function get_chart_data( $post_id, $args ) {
		$this->args = wp_parse_args( $args, m_chart()->get_chart_default_args );
		$this->post = get_post( $post_id );

		// If the post wasn't valid might as well stop here
		if ( ! $this->post ) {
			return;
		}

		$this->post_meta = m_chart()->get_post_meta( $this->post->ID );

		$this->enqueue_chartjs_plugins();
	}

	/**
	 * Enqueue any Chart.js plugins that we'll need
	 */
	public function enqueue_chartjs_plugins() {
		wp_enqueue_script( 'chartjs-datalabels' );
	}

	/**
	 * Returns an arary of all settings and data needed to build a chart
	 *
	 * @param int $post_id WP post ID of the post you want chart args for
	 * @param array $args any args we want to override the defaults for
	 * @param bool $force optional param to force a rebuild of the data even if a cache was found
	 * @param bool $cache optional param to override the default behavior to cache the results
	 *
	 * @return string URL to the plugin directory with path if parameter was passed
	 */
	public function get_chart_args( $post_id, $args, $force = false, $cache = true ) {
		// There's a ton of work that goes into generating the chart args so we cache them
		$cache_key = $post_id . '-chart-args';

		if ( ! $force && $chart_args = wp_cache_get( $cache_key, m_chart()->slug ) ) {
			$this->enqueue_chartjs_plugins();

			// The width can be set via the args so we'll override whatever the cache has with the arg value
			$chart_args['graph']['width'] = isset( $this->args['width'] ) && is_numeric( $this->args['width'] ) ? $this->args['width'] : '';
			return $chart_args;
		}

		if ( ! $this->args || ! $this->post || ! $this->post_meta ) {
			$this->get_chart_data( $post_id, $args );
		}

		// Run the parse class on the data
		m_chart()->parse()->parse_data( $this->post_meta['data']['sets'][0], $this->post_meta['parse_in'] );

		$type = $this->post_meta['type'];

		$chart_args = array(
			'type'    => $this->chart_types[ $this->post_meta['type'] ],
			'options' => array(
				'plugins'             => array(
					// @TODO Figure out how to support subtitles in Chart.js
					'title'   => array(
						'display' => true,
						'text'    => $this->esc_title( apply_filters( 'the_title', $this->post->post_title, $this->post->ID ) ),
						'font'    => array(
							'size'   => 21,
							'weight' => 'normal',
						),
						'padding' => array(
							'bottom' => 15,
						),
					),
					'legend'  => array(
						'display'  => $this->post_meta['legend'] ? true : false,
						'position' => 'bottom',
						'labels'   => array(
							'font'          => array(
								'weight' => 'bold',
							),
							'usePointStyle' => true,
						),
					),
					'tooltip' => array(
						'enabled' => true,
					),
				),
				'elements'            => array(
					'point' => array(
						'hoverRadius' => 7,
						'hitRadius'   => 13,
					),
				),
				'responsive'          => true,
				'maintainAspectRatio' => false,
				'locale'              => m_chart()->get_settings( 'locale' ),
			),
		);

		// Subtitles are handled by a plugin so we have to conditionally set these values
		if ( '' != $this->post_meta['subtitle'] ) {
			$chart_args['options']['plugins']['title']['padding']['bottom'] = 10;

			$chart_args['options']['plugins']['subtitle'] = array(
				'display' => true,
				'text'    => $this->esc_title( $this->post_meta['subtitle'] ),
				'font'    => array(
					'size'   => 18,
					'weight' => 'normal',
				),
				'padding' => array(
					'bottom' => 15,
				),
			);
		}

		// If we're in the admin panel we need to bump up the devicePixelRatio to get a better image
		if ( is_admin() ) {
			$chart_args['options']['devicePixelRatio'] = m_chart()->get_settings( 'image_multiplier' );
		}

		if (
			   'pie' != $chart_args['type']
			&& 'doughnut' != $chart_args['type']
			&& 'radar' != $chart_args['type']
			&& 'polarArea' != $chart_args['type']
		) {
			$chart_args['options']['scales']['x']['grid']['borderWidth'] = 0;
			$chart_args['options']['scales']['y']['grid']['borderWidth'] = 0;
		}

		if ( $this->post_meta['shared'] ) {
			$chart_args['options']['plugins']['tooltip']['mode'] = 'index';
			$chart_args['options']['interaction']['mode']        = 'index';
		}

		// Forcing a minimum value of 0 prevents the built in fudging which sometimes looks weird
		if (
			$this->post_meta['y_min']
			&& (
				   'line' == $this->post_meta['type']
				|| 'spline' == $this->post_meta['type']
				|| 'area' == $this->post_meta['type']
			)
		) {
			$chart_args['options']['scales']['y']['min'] = $this->post_meta['y_min_value'];
		}

		// @TODO: Bubble charts need a little massaging to look better by default (not sure how to properly do this yet)
		if ( 'bubble' == $this->post_meta['type'] ) {
			//$chart_args['options']['scales']['x']['min'] = -15;
			//$chart_args['options']['scales']['y']['min'] = -15;
		}

		$chart_args['data']['labels'] = $this->get_value_labels_array();

		if (
			   'pie' != $chart_args['type']
			&& 'doughnut' != $chart_args['type']
			&& 'radar' != $chart_args['type']
			&& 'polarArea' != $chart_args['type']
		) {
			$chart_args = $this->add_axis_labels( $chart_args );
		}

		if (
			   'bar' == $this->post_meta['type']
			|| 'stacked-bar' == $this->post_meta['type']
		) {
			$chart_args['options']['indexAxis']                          = 'y';
			$chart_args['options']['scales']['y']['grid']['display']     = false;
			$chart_args['options']['scales']['y']['grid']['borderWidth'] = 0;
		} elseif (
			   'pie' != $chart_args['type']
			&& 'doughnut' != $chart_args['type']
			&& 'radar' != $chart_args['type']
			&& 'polarArea' != $chart_args['type']
		) {
			$chart_args['options']['scales']['x']['grid']['display'] = false;
		}

		if (
			   'stacked-bar' == $this->post_meta['type']
			|| 'stacked-column' == $this->post_meta['type']
		) {
			$chart_args['options']['scales']['x']['stacked'] = true;
			$chart_args['options']['scales']['y']['stacked'] = true;
		}

		$chart_args = $this->add_data_sets( $chart_args );

		// This doesn't do anything unless the datalabels plugin is active but we need to set it later
		//$chart_args['data']['datasets']['datalabels'] = array(
		//	'align'  => 'end',
		//	'anchor' => 'end',
		//);

		// Add some stuff for the helper class
		$chart_args['value_prefix'] = m_chart()->parse()->data_prefix;
		$chart_args['value_suffix'] = m_chart()->parse()->data_suffix;
		$chart_args['locale']       = m_chart()->get_settings( 'locale' );
		$chart_args['labels_pos']   = m_chart()->parse()->value_labels_position;

		// Chart.js 3.x.x requires at least some form of data set (even if it's empty) or the chart object doesn't get generated
		if ( ! isset( $chart_args['data']['datasets'] ) ) {
			$chart_args['data']['datasets'] = array(
				array(
					'label' => '',
					'data'  => array(),
				),
			);
		}

		// Apply the theme
		if ( $theme = $this->get_theme( $this->post_meta['theme'] ) ) {
			if ( isset( $theme['colors'] ) ) {
				$this->colors = $theme['colors'];
				unset( $theme['colors'] );
			}

			if ( isset( $theme['points'] ) ) {
				$this->points = $theme['points'];
				unset( $theme['points'] );
			}
		}

		$this->colors = apply_filters( 'm_chart_chartjs_colors', $this->colors, $this->post );
		$this->points = apply_filters( 'm_chart_chartjs_points', $this->points, $this->post );

		// It's possible to have more data points/sets than colors or point styles so we need to perform a modulo operation when iterating through them
		$color_count = count( $this->colors );
		$point_count = count( $this->points );

		// Apply colors and point styles, yes this kind of sucks, but so does the Chart.js color system
		if (
			   isset( $chart_args['data']['datasets'] )
			&& ( 'bar' == $chart_args['type'] || 'horizontalBar' == $chart_args['type'] )
		) {
			foreach ( $chart_args['data']['datasets'] as $key => $dataset ) {
				$chart_args['data']['datasets'][ $key ]['backgroundColor'] = $this->colors[ $key % $color_count ];

				if ( true == $this->post_meta['labels'] ) {
					if (
						   'stacked-column' == $this->post_meta['type']
						|| 'stacked-bar' == $this->post_meta['type']
					) {
						$chart_args['data']['datasets'][ $key ]['datalabels'] = array(
							'align'  => 'center',
							'anchor' => 'center',
							'color'  => '#ffffff',
						);
					} else {
						$chart_args['data']['datasets'][ $key ]['datalabels'] = array(
							'align'  => 'end',
							'anchor' => 'end',
							'color'  => $this->colors[ $key % $color_count ],
						);
					}
				}
			}
		} elseif (
			   isset( $chart_args['data']['datasets'] )
			&& (
				  'pie' == $chart_args['type']
			   || 'doughnut' == $chart_args['type']
			)
		) {
			foreach ( $chart_args['data']['datasets'][0]['data'] as $key => $data ) {
				$chart_args['data']['datasets'][0]['backgroundColor'][ $key ] = $this->colors[ $key % $color_count ];

				if ( true == $this->post_meta['labels'] ) {
					$chart_args['data']['datasets'][0]['datalabels'] = array(
						'align'  => 'end',
						'anchor' => 'end',
						'color'  => $this->colors,
					);
				}
			}
		} elseif (
			   isset( $chart_args['data']['datasets'] )
			&& 'polarArea' == $chart_args['type']
		) {
			$chart_args['data']['datasets'][0]['backgroundColor'] = $this->colors;

			if ( true == $this->post_meta['labels'] ) {
				$chart_args['data']['datasets'][0]['datalabels'] = array(
					'align'  => 'end',
					'anchor' => 'end',
					'color'  => $this->colors,
				);
			}
		} elseif ( isset( $chart_args['data']['datasets'] ) ) {
			foreach ( $chart_args['data']['datasets'] as $key => $dataset ) {
				$color = $this->colors[ $key % $color_count ];

				$chart_args['data']['datasets'][ $key ]['backgroundColor'] = $color;
				$chart_args['data']['datasets'][ $key ]['borderColor']     = $color;

				if ( 'spline' == $this->post_meta['type'] ) {
					$chart_args['data']['datasets'][ $key ]['lineTension'] = 0.25;
				} else {
					$chart_args['data']['datasets'][ $key ]['lineTension'] = 0;
				}

				if (
					   'line' == $this->post_meta['type']
					|| 'spline' == $this->post_meta['type']
					|| 'area' == $this->post_meta['type']
					|| 'radar' == $this->post_meta['type']
					|| 'radar-area' == $this->post_meta['type']
					|| 'scatter' == $this->post_meta['type']
				) {
					$chart_args['data']['datasets'][ $key ]['elements'] = $this->points[ $key % $point_count ];
				}

				if (
					   'area' == $this->post_meta['type']
					|| 'bubble' == $this->post_meta['type']
					|| 'radar-area' == $this->post_meta['type']
				) {
					$rgb = $this->hex_to_rgb( $color );

					$chart_args['data']['datasets'][ $key ]['backgroundColor']                      = 'rgba( ' . implode( ', ', $rgb ) . ', .5 )';
					$chart_args['data']['datasets'][ $key ]['elements']['point']['backgroundColor'] = $color;
					$chart_args['data']['datasets'][ $key ]['fill']                                 = true;
				} else {
					$chart_args['data']['datasets'][ $key ]['fill'] = false;
				}

				if ( true == $this->post_meta['labels'] ) {
					$chart_args['data']['datasets'][ $key ]['datalabels'] = array(
						'align'  => 'end',
						'anchor' => 'end',
						'color'  => $color,
					);
				}
			}
		}

		// Data labels are handled by a plugin so we have to conditionally set these values
		$chart_args['options']['plugins']['datalabels']['display'] = false;

		if ( true == $this->post_meta['labels'] ) {
			$chart_args['options']['plugins']['datalabels'] = array(
				'color'   => 'black',
				'font'    => array(
					'weight' => 'bold',
				),
				'offset'  => 3,
				'display' => 'auto',
			);
		}

		if ( $theme ) {
			$chart_args = m_chart()->array_merge_recursive( $chart_args, $theme );
		}

		$chart_args = apply_filters( 'm_chart_chart_args', $chart_args, $this->post, $this->post_meta, $this->args );

		// Set the cache, we'll regenerate this when someone updates the post
		if ( $cache ) {
			wp_cache_set( $cache_key, $chart_args, m_chart()->slug );
		}

		// Clear out all of the class vars so the next chart instance starts fresh
		$this->args      = null;
		$this->post      = null;
		$this->post_meta = null;

		return $chart_args;
	}

	/**
	 * Hook to the m_chart_update_post_meta action and refresh the chart args cache
	 *
	 * @param int $post_id WP post ID of the post you want chart args for
	 * @param array $parsed_meta the parsed chart meta passed by the action hook
	 */
	public function m_chart_update_post_meta( $post_id, $parsed_meta ) {
		// Refresh arg cache
		$this->args = m_chart()->get_chart_default_args;
		$this->post = get_post( $post_id );

		$this->post_meta = $parsed_meta;

		$this->get_chart_args( $post_id, array(), true );
	}

	/**
	 * Hook to the m_chart_image_support filter and indicate that Chart.js supports images
	 *
	 * @param string $supports_images yes/no whether the library supports image generation
	 * @param string $library the library in question
	 *
	 * @return string $supports_images yes/no whether the library supports image generation
	 */
	public function m_chart_image_support( $supports_images, $library ) {
		if ( $library != $this->library ) {
			return $supports_images;
		}

		return 'yes';
	}

	/**
	 * Returns the value labels array
	 *
	 * @return array an array of the value labels need for the active chart
	 */

	public function get_value_labels_array() {
		$value_labels = m_chart()->parse()->value_labels;

		if ( isset( $value_labels['first_column'] ) ) {
			$label_key = 'rows' == $this->post_meta['parse_in'] ? 'first_row' : 'first_column';

			return $value_labels[ $label_key ];
		}

		return $value_labels;
	}

	/**
	 * Handle adding units to axis labels and/or flipping axis labels on bar chart
	 *
	 * @param array the current array of chart args
	 *
	 * @return array the chart args array with axis labels (and units) added to it
	 */
	public function add_axis_labels( $chart_args ) {
		// Note the additional layer in the array: [0] its needed for Chart.js to see the label settings
		$chart_args['options']['scales']['x']['title'] = array(
			'display' => '' == $this->post_meta['x_title'] ? false : true,
			'text'    => $this->esc_title( $this->post_meta['x_title'] ),
		);

		// We've got x axis units so we'll add them to the axis label
		if ( '' != $this->post_meta['x_units'] ) {
			$chart_args['options']['scales']['x']['title']['display'] = true;

			$units   = get_term_by( 'slug', $this->post_meta['x_units'], m_chart()->slug . '-units' );
			$x_units = '' != $this->post_meta['x_title'] ? ' (' . $units->name . ')' : $units->name;

			$chart_args['options']['scales']['x']['title']['text'] .= $x_units;
		}

		$chart_args['options']['scales']['y']['title'] = array(
			'display' => '' == $this->post_meta['y_title'] ? false : true,
			'text'    => $this->esc_title( $this->post_meta['y_title'] ),
		);

		// We've got y axis units so we'll add them to the axis label
		if ( '' != $this->post_meta['y_units'] ) {
			$chart_args['options']['scales']['y']['title']['display'] = true;

			$units   = get_term_by( 'slug', $this->post_meta['y_units'], m_chart()->slug . '-units' );
			$y_units = '' != $this->post_meta['y_title'] ? ' (' . $units->name . ')' : $units->name;

			$chart_args['options']['scales']['y']['title']['text'] .= $y_units;
		}

		return $chart_args;
	}

	/**
	 * Handle adding data sets to the chart args
	 *
	 * @param array the current array of chart args
	 *
	 * @return array the chart args array with data sets added to it
	 */
	public function add_data_sets( $chart_args ) {
		// When Chart.js encounters an empty data value it stops so we set them to NULL
		$data_array = array_map( array( $this, 'fix_null_values' ), m_chart()->parse()->set_data );

		if (
			   'pie' == $this->post_meta['type']
			|| 'doughnut' == $chart_args['type']
			|| 'polar' == $this->post_meta['type']
			|| 'both' != m_chart()->parse()->value_labels_position
			&& (
				   'scatter' != $this->post_meta['type']
				&& 'bubble' != $this->post_meta['type']
				&& 'radar' != $this->post_meta['type']
				&& 'radar-area' != $this->post_meta['type']
			)
		) {
			foreach ( $chart_args['data']['labels'] as $key => $label ) {
				if ( isset( $data_array[ $key ] ) ) {
					$chart_args['data']['datasets'][0]['data'][] = $data_array[ $key ];
				}
			}
		} elseif (
			   'radar' == $this->post_meta['type']
			|| 'radar-area' == $this->post_meta['type']
		) {
			$set_names = $this->post_meta['set_names'];

			foreach ( $this->post_meta['data']['sets'] as $key => $data ) {
				$parse = m_chart()->parse()->parse_data( $data, $this->post_meta['parse_in'] );

				$data_array = array_map( array( $this, 'fix_null_values' ), $parse->set_data );

				$chart_args['data']['datasets'][ $key ] = array(
					'label' => isset( $set_names[ $key ] ) ? $set_names[ $key ] : 'Sheet 1',
					'data'  => $data_array,
				);
			}
		} elseif ( 'scatter' == $this->post_meta['type'] ) {
			$set_names = $this->post_meta['set_names'];

			foreach ( $this->post_meta['data']['sets'] as $key => $data ) {
				$parse = m_chart()->parse()->parse_data( $data, $this->post_meta['parse_in'] );

				$data_array = array_map( array( $this, 'fix_null_values' ), $parse->set_data );

				$new_data_array = array();

				$label_key = ( $this->post_meta['parse_in'] == 'rows' ) ? 'first_column' : 'first_row';

				if ( 'both' == $parse->value_labels_position ) {
					foreach ( $data_array as $data_key => $data ) {
						$new_data_array[] = array(
							'x'     => $data[0],
							'y'     => $data[1],
							'label' => $parse->value_labels[ $label_key ][ $data_key ],
						);
					}
				} else {
					foreach ( $data_array as $data_key => $data ) {
						if ( $data_key % 2 ) {
							continue;
						}

						$new_data_array[] = array(
							'x' => $data,
							'y' => $data_array[ $data_key + 1 ],
						);
					}
				}

				$chart_args['data']['datasets'][ $key ] = array(
					'label' => isset( $set_names[ $key ] ) ? $set_names[ $key ] : 'Sheet 1',
					'data'  => $new_data_array,
				);
			}
		} elseif ( 'bubble' == $this->post_meta['type'] ) {
			$set_names = $this->post_meta['set_names'];

			foreach ( $this->post_meta['data']['sets'] as $key => $data ) {
				$parse = m_chart()->parse()->parse_data( $data, $this->post_meta['parse_in'] );

				$data_array = array_map( array( $this, 'fix_null_values' ), $parse->set_data );

				$new_data_array = array();

				$label_key = ( $this->post_meta['parse_in'] == 'rows' ) ? 'first_column' : 'first_row';

				if ( 'both' == $parse->value_labels_position ) {
					foreach ( $data_array as $data_key => $data ) {
						$new_data_array[] = array(
							'x'     => $data[0],
							'y'     => $data[1],
							'r'     => $data[2],
							'label' => $parse->value_labels[ $label_key ][ $data_key ],
						);
					}
				} else {
					foreach ( $data_array as $data_key => $data ) {
						if ( $data_key % 2 ) {
							continue;
						}

						$new_data_array[] = array(
							'x' => $data,
							'y' => $data_array[ $data_key + 1 ],
							'r' => $data_array[ $data_key + 2 ],
						);
					}
				}

				$chart_args['data']['datasets'][ $key ] = array(
					'label' => isset( $set_names[ $key ] ) ? $set_names[ $key ] : 'Sheet 1',
					'data'  => $new_data_array,
				);
			}
		} else {
			$set_data = array();

			$label_key = ( $this->post_meta['parse_in'] == 'rows' ) ? 'first_column' : 'first_row';

			foreach ( $data_array as $key => $data_chunk ) {
				$set_data[ $key ] = array(
					'label' => m_chart()->parse()->value_labels[ $label_key ][ $key ],
					'data'  => array(),
				);

				if ( is_array( $data_chunk ) ) {
					foreach ( $data_chunk as $data ) {
						$set_data[ $key ]['data'][] = $data;
					}
				} else {
					$set_data[ $key ]['data'] = array();
				}
			}

			$chart_args['data']['datasets'] = $set_data;
		}

		return $chart_args;
	}

	/**
	 * Hook to the m_chart_iframe_scripts filter and add additional scripts if needed
	 *
	 * @param array $scripts an array of scripts needed for the iframe to render the chart
	 * @param int $post_id WP post ID of the chart being displayed
	 *
	 * @return array $scripts an array of scripts needed for the iframe to render the chart
	 */
	public function m_chart_iframe_scripts( $scripts, $post_id ) {
		$library = m_chart()->get_post_meta( $post_id, 'library' );

		// If Chart.js isn't the library type we'll stop here
		if ( $library != $this->library ) {
			return $scripts;
		}

		$type = m_chart()->get_post_meta( $post_id, 'type' );

		$scripts[] = 'chartjs-datalabels';

		// Return the scripts
		return $scripts;
	}

	/**
	 * Helper function escapes and modifies text/title values
	 *
	 * @param string an string you want to use in Highcharts
	 *
	 * @return string an escaped and modified string
	 */
	public function esc_title( $string ) {
		$string = html_entity_decode( $string, ENT_QUOTES );

		$find = array(
			"\n",
			"\r",
			'<br><br>',
			'—',
			'–',
		);

		$replace = array(
			'<br />',
			'<br />',
			'<br />',
			'-',
			'-',
		);

		$string = str_replace( $find, $replace, $string );

		// @TODO: See if this addslashes/stripslashes is still necessary (need to remember why I did it first...)
		return addslashes( stripslashes( $string ) );
	}

	/**
	 * Helper function sets empty values to NULL so that Chart.js handles them correctly
	 *
	 * @param string/int a data value
	 *
	 * @return int/null the integer value or NULL if the value was not numeric
	 */
	public function fix_null_values( $value ) {
		if ( is_array( $value ) ) {
			return array_map( array( $this, 'fix_null_values' ), $value );
		}

		if ( ! is_numeric( $value ) ) {
			return null;
		}

		return $value;
	}

	/**
	 * Helper function takes a hex color value and returns an array of RGB values to match
	 *
	 * @param string a hex color value
	 *
	 * @return array the color as seperate RGB values
	 */
	public function hex_to_rgb( $hex ) {
		// Make sure the hex string is a proper hex string
		$hex = preg_replace( '#[^0-9A-Fa-f]#', '', $hex );
		$rgb = array();

		if ( 6 === strlen( $hex ) ) {
			// If a proper hex code, convert using bitwise operation, no overhead... faster
			$color_value = hexdec( $hex );

			$rgb['red']   = 0xFF & ( $color_value >> 0x10 );
			$rgb['green'] = 0xFF & ( $color_value >> 0x8 );
			$rgb['blue']  = 0xFF & $color_value;
		} elseif ( 3 == strlen( $hex ) ) {
			// If shorthand notation we need to do some string manipulations
			$rgb['red']   = hexdec( str_repeat( substr( $hex, 0, 1 ), 2 ) );
			$rgb['green'] = hexdec( str_repeat( substr( $hex, 1, 1 ), 2 ) );
			$rgb['blue']  = hexdec( str_repeat( substr( $hex, 2, 1 ), 2 ) );
		} else {
			// Invalid hex color code so we return false
			return false;
		}

		return $rgb;
	}

	/**
	 * Get all themes available from the various theme directories
	 *
	 * @return array an array of themes
	 */
	public function get_themes() {
		$themes = array();

		foreach ( $this->theme_directories as $directory ) {
			$themes = array_merge( $themes, $this->_get_themes_readdir( $directory ) );
		}

		return $themes;
	}

	/**
	 * Returns the theme options for a given theme
	 *
	 * @param string a theme slug
	 *
	 * @return string/boolean requested theme options or false if they could not be found
	 */
	private function get_theme( $slug ) {
		foreach ( $this->theme_directories as $directory ) {
			if ( ! $themes = $this->_get_themes_readdir( $directory ) ) {
				continue;
			}

			foreach ( $themes as $theme ) {
				if ( $theme->slug == $slug ) {
					return $theme->options;
				}
			}
		}

		return false;
	}

	/**
	 * Get all themes from a given directory
	 *
	 * @param string a path to a server directory
	 *
	 * @return array an array of all the themes available in a given directory
	 */
	private function _get_themes_readdir( $theme_base ) {
		// Sanity check to make sure we have a real directory
		if ( ! is_dir( $theme_base ) ) {
			return array();
		}

		$theme_dir = new DirectoryIterator( $theme_base );
		$themes    = array();

		foreach ( $theme_dir as $file ) {
			if ( ! $file->isFile() || ! preg_match( '#.php$#i', $file->getFilename() ) ) {
				continue;
			}

			$theme_data = implode( '', file( $theme_base . $file ) );

			if ( preg_match( '|Theme Name:(.*)$|mi', $theme_data, $name ) ) {
				$name = trim( _cleanup_header_comment( $name[1] ) );
			}

			if ( isset( $name ) && '' != $name ) {
				$file = basename( $file );

				$themes[ $file ] = (object) array(
					'slug'    => substr( $file, 0, -4 ),
					'name'    => $name,
					'file'    => $file,
					'options' => require $theme_base . $file,
				);
			}
		}

		asort( $themes );

		return $themes;
	}
}
