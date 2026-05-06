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
	public $type_options      = [
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
		'treemap',
	];
	public $type_option_names = [];
	public $theme_directories;
	public $colors         = [
		'#ed6d85', // Pink
		'#f7d06b', // Yellow
		'#f2a354', // Orange
		'#56a0e5', // Blue
		'#6cbebf', // Turquoise
		'#47494b', // Gray
	];
	public $points;
	public $chart_types    = [
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
		'treemap'        => 'treemap',
	];
	public $helpers_loaded = false;

	/**
	 * Constructor
	 */
	public function __construct() {
		add_filter( 'm_chart_image_support', [ $this, 'm_chart_image_support' ], 10, 2 );
		add_filter( 'm_chart_iframe_scripts', [ $this, 'm_chart_iframe_scripts' ], 10, 2 );

		$this->points = self::get_points_defaults();

		$this->theme_directories = [
			get_stylesheet_directory() . '/m-chart-chartjs-themes/', // Child theme
			get_template_directory() . '/m-chart-chartjs-themes/', // Parent theme
			__DIR__ . '/chartjs-themes/',
		];

		$this->type_option_names = [
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
			'treemap'        => esc_html__( 'Treemap', 'm-chart' ),
		];
	}

	/**
	 * Canonical Chart.js options scaffold that get_chart_args() builds on top of.
	 *
	 * Pure static defaults with no post-meta dependencies. Exposed so
	 * extensions (e.g. m-chart-pro's theme builder preview) can read the
	 * same literals m-chart will apply at render time, instead of mirroring
	 * them and drifting.
	 *
	 * @return array
	 */
	public static function get_chart_options_defaults() {
		return [
			'plugins' => [
				'title' => [
					'font'    => [
						'size'   => 21,
						'weight' => 'normal',
					],
					'padding' => [
						'bottom' => 15,
					],
				],
				'subtitle' => [
					'font'    => [
						'size'   => 18,
						'weight' => 'normal',
					],
					'padding' => [
						'bottom' => 15,
					],
				],
				'legend' => [
					'position' => 'bottom',
					'labels'   => [
						'font'          => [
							'weight' => 'bold',
						],
						'usePointStyle' => true,
					],
				],
				'tooltip' => [
					'enabled' => true,
				],
				'datalabels' => [
					'color'  => 'black',
					'font'   => [
						'weight' => 'bold',
					],
					'offset' => 3,
				],
			],
			'layout' => [
				'padding' => 20,
			],
			'responsive'          => true,
			'maintainAspectRatio' => false,
		];
	}

	/**
	 * Canonical per-dataset point defaults cycle.
	 *
	 * Each entry's `point` array is what core assigns to a dataset's
	 * `elements` slot for line/scatter/radar charts. Extensions read this
	 * to get pointStyle/hoverRadius/hitRadius without mirroring the values.
	 *
	 * @return array
	 */
	public static function get_points_defaults() {
		return [
			[
				'point' => [
					'pointStyle'  => 'circle',
					'hoverRadius' => 7,
					'hitRadius'   => 13,
				],
			],
			[
				'point' => [
					'pointStyle'  => 'rectRot',
					'hoverRadius' => 7,
					'hitRadius'   => 13,
				],
			],
			[
				'point' => [
					'pointStyle'  => 'rect',
					'hoverRadius' => 7,
					'hitRadius'   => 13,
				],
			],
			[
				'point' => [
					'pointStyle'  => 'triangle',
					'hoverRadius' => 7,
					'hitRadius'   => 13,
				],
			],
			[
				'point' => [
					'pointStyle'  => 'triangle',
					'rotation'    => 180,
					'hoverRadius' => 7,
					'hitRadius'   => 13,
				],
			],
		];
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
		wp_enqueue_script( 'chartjs-helper' );
		wp_enqueue_script( 'chartjs-datalabels' );

		if ( isset( $this->post_meta['type'] ) && 'treemap' === $this->post_meta['type'] ) {
			wp_enqueue_script( 'chartjs-treemap' );
		}
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
		$data = isset( $this->post_meta['data']['sets'][0] ) ? $this->post_meta['data']['sets'][0] : [];
		m_chart()->parse()->parse_data( $data, $this->post_meta['parse_in'] );

		$type = $this->post_meta['type'];

		$defaults = self::get_chart_options_defaults();

		$chart_args = [
			'type'    => $this->chart_types[ $this->post_meta['type'] ],
			'options' => [
				'plugins' => [
					// @TODO Figure out how to support subtitles in Chart.js
					'title' => array_merge(
						$defaults['plugins']['title'],
						[
							'display' => true,
							'text'    => $this->esc_title( apply_filters( 'the_title', $this->post->post_title, $this->post->ID ) ),
						]
					),
					'legend' => array_merge(
						$defaults['plugins']['legend'],
						[
							'display' => $this->post_meta['legend'] ? true : false,
						]
					),
					'tooltip' => $defaults['plugins']['tooltip'],
				],
				'layout'              => $defaults['layout'],
				'responsive'          => $defaults['responsive'],
				'maintainAspectRatio' => $defaults['maintainAspectRatio'],
				'locale'              => m_chart()->get_settings( 'locale' ),
			],
		];

		// Subtitles are handled by a plugin so we have to conditionally set these values
		if ( '' != $this->post_meta['subtitle'] ) {
			$chart_args['options']['plugins']['title']['padding']['bottom'] = 10;

			$chart_args['options']['plugins']['subtitle'] = array_merge(
				$defaults['plugins']['subtitle'],
				[
					'display' => true,
					'text'    => $this->esc_title( $this->post_meta['subtitle'] ),
				]
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
			&& 'treemap' != $chart_args['type']
		) {
			$chart_args['options']['scales']['x']['grid']['borderWidth'] = 0;
			$chart_args['options']['scales']['y']['grid']['borderWidth'] = 0;
		}

		if ( $this->post_meta['shared'] ) {
			$chart_args['options']['plugins']['tooltip']['mode'] = 'index';
			$chart_args['options']['interaction']['mode']        = 'index';
		}

		// Treemap has no meaningful series legend; force it off
		if ( 'treemap' === $chart_args['type'] ) {
			$chart_args['options']['plugins']['legend']['display'] = false;
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
			&& 'treemap' != $chart_args['type']
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
			&& 'treemap' != $chart_args['type']
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

		// Add some stuff for the helper plugin
		$chart_args['locale']                                                    = m_chart()->get_settings( 'locale' );
		$chart_args['options']['plugins']['m-chart-helper']['labels_pos'] = m_chart()->parse()->value_labels_position;

		// Chart.js 3.x.x requires at least some form of data set (even if it's empty) or the chart object doesn't get generated
		if ( ! isset( $chart_args['data']['datasets'] ) ) {
			$chart_args['data']['datasets'] = [
				[
					'label' => '',
					'data'  => [],
				],
			];
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

		$use_per_point_colors = ! empty( $this->post_meta['data_point_colors'] );

		// Apply colors and point styles, yes this kind of sucks, but so does the Chart.js color system
		if ( 'treemap' === $chart_args['type'] && isset( $chart_args['data']['datasets'][0]['tree'] ) ) {
			$ds = &$chart_args['data']['datasets'][0];

			if ( ! empty( $ds['mChartTreemapHierarchical'] ) ) {
				// Hierarchical: build a stable map from each unique top-level group VALUE to a palette color
				// in first-seen order so downstream JS can paint top groups + alpha-shaded descendants
				$top_field    = $ds['mChartTopGroupField'];
				$top_colors   = [];
				$top_rgb      = [];

				foreach ( $ds['tree'] as $entry ) {
					if ( ! isset( $entry[ $top_field ] ) ) {
						continue;
					}
					$top_id = $entry[ $top_field ];
					if ( isset( $top_colors[ $top_id ] ) ) {
						continue;
					}

					$hex                    = $this->colors[ count( $top_colors ) % $color_count ];
					$top_colors[ $top_id ]  = $hex;
					$top_rgb[ $top_id ]     = $this->hex_to_rgb( $hex );
				}

				$ds['mChartTopGroupColors'] = $top_colors;
				$ds['mChartTopGroupRgb']    = $top_rgb;
			} else {
				$values = wp_list_pluck( $ds['tree'], 'value' );
				$max    = ! empty( $values ) ? max( $values ) : 0;
				$max    = $max > 0 ? $max : 1;

				$colors = [];

				if ( $use_per_point_colors ) {
					foreach ( $values as $i => $_v ) {
						$colors[] = $this->colors[ $i % $color_count ];
					}
				} else {
					$rgb = $this->hex_to_rgb( $this->colors[0] );

					foreach ( $values as $v ) {
						// Floor at 0.15 so the smallest rectangles still render visibly
						$alpha    = max( 0.15, min( 1, $v / $max ) );
						$colors[] = sprintf( 'rgba(%d, %d, %d, %.3f)', $rgb['red'], $rgb['green'], $rgb['blue'], $alpha );
					}
				}

				$ds['mChartColors'] = $colors;
			}

			unset( $ds );
		} elseif (
			   isset( $chart_args['data']['datasets'] )
			&& ( 'bar' == $chart_args['type'] || 'horizontalBar' == $chart_args['type'] )
		) {
			$is_single_series = 1 === count( $chart_args['data']['datasets'] );
			$is_stacked       = 'stacked-column' == $this->post_meta['type'] || 'stacked-bar' == $this->post_meta['type'];

			foreach ( $chart_args['data']['datasets'] as $key => $dataset ) {
				if ( $use_per_point_colors && $is_single_series && ! $is_stacked ) {
					// Each bar/column gets a different color cycled from the palette
					$per_point = [];
					$count     = isset( $dataset['data'] ) && is_array( $dataset['data'] ) ? count( $dataset['data'] ) : 0;

					for ( $i = 0; $i < $count; $i++ ) {
						$per_point[] = $this->colors[ $i % $color_count ];
					}

					$chart_args['data']['datasets'][ $key ]['backgroundColor'] = $per_point;
				} else {
					$chart_args['data']['datasets'][ $key ]['backgroundColor'] = $this->colors[ $key % $color_count ];
				}

				if ( true == $this->post_meta['labels'] ) {
					if ( $is_stacked ) {
						$chart_args['data']['datasets'][ $key ]['datalabels'] = [
							'align'  => 'center',
							'anchor' => 'center',
							'color'  => '#ffffff',
						];
					} else {
						$chart_args['data']['datasets'][ $key ]['datalabels'] = [
							'align'  => 'end',
							'anchor' => 'end',
							'color'  => $this->colors[ $key % $color_count ],
						];
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
					$chart_args['data']['datasets'][0]['datalabels'] = [
						'align'  => 'end',
						'anchor' => 'end',
						'color'  => $this->colors,
					];
				}
			}
		} elseif (
			   isset( $chart_args['data']['datasets'] )
			&& 'polarArea' == $chart_args['type']
		) {
			$chart_args['data']['datasets'][0]['backgroundColor'] = $this->colors;

			if ( true == $this->post_meta['labels'] ) {
				$chart_args['data']['datasets'][0]['datalabels'] = [
					'align'  => 'end',
					'anchor' => 'end',
					'color'  => $this->colors,
				];
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
					$chart_args['data']['datasets'][ $key ]['datalabels'] = [
						'align'  => 'end',
						'anchor' => 'end',
						'color'  => $color,
					];
				}
			}
		}

		// Data labels are handled by a plugin so we have to conditionally set these values
		$chart_args['options']['plugins']['datalabels']['display'] = false;

		if ( true == $this->post_meta['labels'] && 'treemap' !== $chart_args['type'] ) {
			$chart_args['options']['plugins']['datalabels'] = array_merge(
				$defaults['plugins']['datalabels'],
				[ 'display' => 'auto' ]
			);
		}

		if ( $theme ) {
			$chart_args = m_chart()->array_merge_recursive( $chart_args, $theme );
		}

		// Expose the full resolved color palette so extensions can use it
		$chart_args['colors'] = $this->colors;

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

		$this->get_chart_args( $post_id, [], true );
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

		if ( isset( $value_labels[ M_Chart_Parse::LABELS_FIRST_COLUMN ] ) ) {
			$label_key = M_Chart_Parse::PARSE_ROWS == $this->post_meta['parse_in'] ? M_Chart_Parse::LABELS_FIRST_ROW : M_Chart_Parse::LABELS_FIRST_COLUMN;

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
		$chart_args['options']['scales']['x']['title'] = [
			'display' => '' == $this->post_meta['x_title'] ? false : true,
			'text'    => $this->esc_title( $this->post_meta['x_title'] ),
		];

		// We've got x axis units so we'll add them to the axis label
		if ( '' != $this->post_meta['x_units'] ) {
			$chart_args['options']['scales']['x']['title']['display'] = true;

			$units   = get_term_by( 'slug', $this->post_meta['x_units'], m_chart()->slug . '-units' );
			$x_units = '' != $this->post_meta['x_title'] ? ' (' . $units->name . ')' : $units->name;

			$chart_args['options']['scales']['x']['title']['text'] .= $x_units;
		}

		$chart_args['options']['scales']['y']['title'] = [
			'display' => '' == $this->post_meta['y_title'] ? false : true,
			'text'    => $this->esc_title( $this->post_meta['y_title'] ),
		];

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
		$data_array = array_map( [ $this, 'fix_null_values' ], m_chart()->parse()->set_data );
		$raw_data   = m_chart()->parse()->raw_data;

		if ( 'treemap' === $this->post_meta['type'] ) {
			$raw_sheet = isset( $this->post_meta['data']['sets'][0] ) ? $this->post_meta['data']['sets'][0] : [];
			$hierarchy = $this->build_treemap_hierarchy( $raw_sheet, $this->post_meta['parse_in'] );

			if ( null !== $hierarchy ) {
				$dataset_defaults = apply_filters(
					'm_chart_treemap_dataset_defaults',
					[
						'spacing'          => 1,
						'borderWidth'      => 1,
						'borderColor'      => '#ffffff',
						'hoverBorderWidth' => 1,
						'hoverBorderColor' => '#ffffff',
						'captions'         => [
							'display' => true,
							'align'   => 'left',
							'color'   => '#000000',
							'font'    => [ 'weight' => 'bold' ],
							'padding' => 4,
						],
						'labels'           => [
							'display'  => (bool) $this->post_meta['labels'],
							'color'    => '#000000',
							'font'     => [ 'weight' => 'bold' ],
							'align'    => 'center',
							'position' => 'middle',
						],
					],
					$this->post,
					$this->args
				);

				$chart_args['data']['labels']   = [];
				$chart_args['data']['datasets'] = [
					array_merge(
						$dataset_defaults,
						[
							'tree'                      => $hierarchy['tree'],
							'key'                       => $hierarchy['key'],
							'groups'                    => $hierarchy['groups'],
							'mChartIsTreemap'           => true,
							'mChartTreemapHierarchical' => true,
							'mChartTopGroupField'       => $hierarchy['top_field'],
							'mChartDatasetPrefix'       => $hierarchy['dataset_prefix'],
							'mChartDatasetSuffix'       => $hierarchy['dataset_suffix'],
						]
					),
				];

				return $chart_args;
			}

			$tree = [];

			foreach ( $chart_args['data']['labels'] as $key => $label ) {
				if ( ! isset( $data_array[ $key ] ) ) {
					continue;
				}

				// raw_data entries are M_Chart_Parsed_Data_Point objects produced by parse_data_point()
				$raw = isset( $raw_data[ $key ] ) && $raw_data[ $key ] instanceof M_Chart_Parsed_Data_Point ? $raw_data[ $key ] : null;

				$tree[] = [
					'label'  => $label,
					'value'  => is_numeric( $data_array[ $key ] ) ? (float) $data_array[ $key ] : 0,
					'prefix' => $raw ? $raw->prefix : '',
					'suffix' => $raw ? $raw->suffix : '',
					'text'   => $raw ? $raw->text : null,
				];
			}

			$dataset_defaults = apply_filters(
				'm_chart_treemap_dataset_defaults',
				[
					'spacing'          => 1,
					'borderWidth'      => 1,
					'borderColor'      => '#ffffff',
					'hoverBorderWidth' => 1,
					'hoverBorderColor' => '#ffffff',
					'captions'         => [ 'display' => false ],
					'labels'           => [
						'display'  => (bool) $this->post_meta['labels'],
						'color'    => '#000000',
						'font'     => [ 'weight' => 'bold' ],
						'align'    => 'center',
						'position' => 'middle',
					],
				],
				$this->post,
				$this->args
			);

			$chart_args['data']['labels']   = [];
			$chart_args['data']['datasets'] = [
				array_merge(
					$dataset_defaults,
					[
						'tree'            => $tree,
						'key'             => 'value',
						'rawData'         => $tree,
						'mChartIsTreemap' => true,
					]
				),
			];

			return $chart_args;
		}

		if (
			   'pie' == $this->post_meta['type']
			|| 'doughnut' == $chart_args['type']
			|| 'polar' == $this->post_meta['type']
			|| M_Chart_Parse::LABELS_BOTH != m_chart()->parse()->value_labels_position
			&& (
				   'scatter' != $this->post_meta['type']
				&& 'bubble' != $this->post_meta['type']
				&& 'radar' != $this->post_meta['type']
				&& 'radar-area' != $this->post_meta['type']
			)
		) {
			foreach ( $chart_args['data']['labels'] as $key => $label ) {
				if ( isset( $data_array[ $key ] ) ) {
					$chart_args['data']['datasets'][0]['data'][]    = $data_array[ $key ];
					$chart_args['data']['datasets'][0]['rawData'][] = isset( $raw_data[ $key ] ) ? $raw_data[ $key ] : '';
				}
			}
		} elseif (
			   'radar' == $this->post_meta['type']
			|| 'radar-area' == $this->post_meta['type']
		) {
			$set_names = $this->post_meta['set_names'];

			foreach ( $this->post_meta['data']['sets'] as $key => $data ) {
				$parse = m_chart()->parse()->parse_data( $data, $this->post_meta['parse_in'] );

				$data_array = array_map( [ $this, 'fix_null_values' ], $parse->set_data );

				$chart_args['data']['datasets'][ $key ] = [
					'label'   => isset( $set_names[ $key ] ) ? $set_names[ $key ] : 'Sheet 1',
					'data'    => $data_array,
					'rawData' => $parse->raw_data,
				];
			}
		} elseif ( 'scatter' == $this->post_meta['type'] ) {
			$set_names = $this->post_meta['set_names'];

			foreach ( $this->post_meta['data']['sets'] as $key => $data ) {
				$parse = m_chart()->parse()->parse_data( $data, $this->post_meta['parse_in'] );

				$data_array = array_map( [ $this, 'fix_null_values' ], $parse->set_data );

				$new_data_array = [];

				if ( M_Chart_Parse::LABELS_BOTH == $parse->value_labels_position ) {
					if ( M_Chart_Parse::PARSE_COLUMNS == $this->post_meta['parse_in'] ) {
						// PARSE_COLUMNS: set_data is [x_values_array, y_values_array] — zip by index
						foreach ( ( $data_array[0] ?? [] ) as $i => $x ) {
							$new_data_array[] = [
								'x'     => $x,
								'y'     => $data_array[1][ $i ],
								'label' => $parse->value_labels[ M_Chart_Parse::LABELS_FIRST_COLUMN ][ $i ],
							];
						}
					} else {
						// PARSE_ROWS: set_data is [[x1,y1], [x2,y2], ...] — one entry per point
						foreach ( $data_array as $data_key => $data ) {
							$new_data_array[] = [
								'x'     => $data[0],
								'y'     => $data[1],
								'label' => $parse->value_labels[ M_Chart_Parse::LABELS_FIRST_COLUMN ][ $data_key ],
							];
						}
					}
				} else {
					foreach ( $data_array as $data_key => $data ) {
						if ( $data_key % 2 ) {
							continue;
						}

						if ( ! isset( $data_array[ $data_key + 1 ] ) ) {
							continue;
						}

						$new_data_array[] = [
							'x' => $data,
							'y' => $data_array[ $data_key + 1 ],
						];
					}
				}

				$chart_args['data']['datasets'][ $key ] = [
					'label'   => isset( $set_names[ $key ] ) ? $set_names[ $key ] : 'Sheet 1',
					'data'    => $new_data_array,
					'rawData' => $parse->raw_data,
				];
			}
		} elseif ( 'bubble' == $this->post_meta['type'] ) {
			$set_names = $this->post_meta['set_names'];

			foreach ( $this->post_meta['data']['sets'] as $key => $data ) {
				$parse = m_chart()->parse()->parse_data( $data, $this->post_meta['parse_in'] );

				$data_array = array_map( [ $this, 'fix_null_values' ], $parse->set_data );

				$new_data_array = [];

				if ( M_Chart_Parse::LABELS_BOTH == $parse->value_labels_position ) {
					if ( M_Chart_Parse::PARSE_COLUMNS == $this->post_meta['parse_in'] ) {
						// PARSE_COLUMNS: set_data is [x_values_array, y_values_array, r_values_array] — zip by index
						foreach ( $data_array[0] as $i => $x ) {
							$new_data_array[] = [
								'x'     => $x,
								'y'     => $data_array[1][ $i ],
								'r'     => $data_array[2][ $i ],
								'label' => $parse->value_labels[ M_Chart_Parse::LABELS_FIRST_COLUMN ][ $i ],
							];
						}
					} else {
						// PARSE_ROWS: set_data is [[x1,y1,r1], [x2,y2,r2], ...] — one entry per point
						foreach ( $data_array as $data_key => $data ) {
							$new_data_array[] = [
								'x'     => $data[0],
								'y'     => $data[1],
								'r'     => $data[2],
								'label' => $parse->value_labels[ M_Chart_Parse::LABELS_FIRST_COLUMN ][ $data_key ],
							];
						}
					}
				} else {
					foreach ( $data_array as $data_key => $data ) {
						if ( $data_key % 3 ) {
							continue;
						}

						if ( ! isset( $data_array[ $data_key + 1 ] ) || ! isset( $data_array[ $data_key + 2 ] ) ) {
							continue;
						}

						$new_data_array[] = [
							'x' => $data,
							'y' => $data_array[ $data_key + 1 ],
							'r' => $data_array[ $data_key + 2 ],
						];
					}
				}

				$chart_args['data']['datasets'][ $key ] = [
					'label'   => isset( $set_names[ $key ] ) ? $set_names[ $key ] : 'Sheet 1',
					'data'    => $new_data_array,
					'rawData' => $parse->raw_data,
				];
			}
		} else {
			$set_data = [];

			$label_key = ( $this->post_meta['parse_in'] == M_Chart_Parse::PARSE_ROWS ) ? M_Chart_Parse::LABELS_FIRST_COLUMN : M_Chart_Parse::LABELS_FIRST_ROW;

			foreach ( $data_array as $key => $data_chunk ) {
				$set_data[ $key ] = [
					'label'   => m_chart()->parse()->value_labels[ $label_key ][ $key ],
					'data'    => [],
					'rawData' => isset( $raw_data[ $key ] ) ? $raw_data[ $key ] : [],
				];

				if ( is_array( $data_chunk ) ) {
					foreach ( $data_chunk as $data ) {
						$set_data[ $key ]['data'][] = $data;
					}
				} else {
					$set_data[ $key ]['data'] = [];
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

		$scripts[] = 'chartjs-helper';
		$scripts[] = 'chartjs-datalabels';

		if ( 'treemap' === $type ) {
			$scripts[] = 'chartjs-treemap';
		}

		// Return the scripts
		return $scripts;
	}

	/**
	 * Helper function escapes and modifies text/title values
	 *
	 * @param string an string you want to use in Chart.js
	 *
	 * @return string an escaped and modified string
	 */
	public function esc_title( $string ) {
		$string = html_entity_decode( $string, ENT_QUOTES );

		$find = [
			"\n",
			"\r",
			'<br><br>',
			'—',
			'–',
		];

		$replace = [
			'<br />',
			'<br />',
			'<br />',
			'-',
			'-',
		];

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
			return array_map( [ $this, 'fix_null_values' ], $value );
		}

		if ( ! is_numeric( $value ) ) {
			return null;
		}

		return $value;
	}

	/**
	 * Detect and build a hierarchical tree config for a treemap from a raw spreadsheet
	 * Returns null when the sheet is flat (<=2 columns/rows after orientation normalization)
	 * so the caller can fall through to the existing flat treemap path
	 *
	 * @param array  $sheet    Raw sheet, array of rows in Jspreadsheet getData() shape
	 * @param string $parse_in 'rows' or 'columns'
	 *
	 * @return array|null { 'tree', 'key', 'groups', 'top_field', 'dataset_prefix', 'dataset_suffix' } or null
	 */
	public function build_treemap_hierarchy( $sheet, $parse_in ) {
		if ( ! is_array( $sheet ) || count( $sheet ) < 2 ) {
			return null;
		}

		$rows = ( 'columns' === $parse_in ) ? $this->transpose_sheet( $sheet ) : $sheet;

		$rows = array_values( array_filter( $rows, function( $r ) {
			if ( ! is_array( $r ) ) {
				return false;
			}
			foreach ( $r as $c ) {
				if ( '' !== trim( (string) $c ) ) {
					return true;
				}
			}
			return false;
		} ) );

		if ( count( $rows ) < 2 ) {
			return null;
		}

		// Effective column count: the rightmost column with any non-empty cell across all rows.
		// Jspreadsheet pads sheets out to a minimum width (37 cols by default), so a raw max-width
		// reading would include trailing padding columns that aren't real data.
		$col_count = 0;
		foreach ( $rows as $row ) {
			if ( ! is_array( $row ) ) {
				continue;
			}
			for ( $i = count( $row ) - 1; $i >= 0; $i-- ) {
				if ( '' !== trim( (string) $row[ $i ] ) ) {
					if ( $i + 1 > $col_count ) {
						$col_count = $i + 1;
					}
					break;
				}
			}
		}

		if ( $col_count < 3 ) {
			return null;
		}

		// Header detection. Treat row 0 as headers only if EVERY row-0 cell extracts to non-numeric
		// (per the same parse_data_point used by other chart types) AND row 1's last cell extracts
		// to a usable numeric value. This avoids misinterpreting an all-numeric leaf row as headers.
		$row_zero_all_non_numeric = true;
		for ( $i = 0; $i < $col_count; $i++ ) {
			$cell   = isset( $rows[0][ $i ] ) ? (string) $rows[0][ $i ] : '';
			$parsed = m_chart()->parse()->parse_data_point( $cell );
			if ( '' === trim( $cell ) || null !== $parsed->value ) {
				$row_zero_all_non_numeric = false;
				break;
			}
		}

		$row_one_last_cell   = isset( $rows[1][ $col_count - 1 ] ) ? (string) $rows[1][ $col_count - 1 ] : '';
		$row_one_last_parsed = m_chart()->parse()->parse_data_point( $row_one_last_cell );
		$has_headers         = $row_zero_all_non_numeric && null !== $row_one_last_parsed->value;

		if ( $has_headers ) {
			$headers      = array_map( function( $h ) { return trim( (string) $h ); }, $rows[0] );
			$data_rows    = array_slice( $rows, 1 );
			$value_field  = isset( $headers[ $col_count - 1 ] ) && '' !== $headers[ $col_count - 1 ] ? $headers[ $col_count - 1 ] : 'value';
			$group_fields = [];

			for ( $i = 0; $i < $col_count - 1; $i++ ) {
				$group_fields[] = isset( $headers[ $i ] ) && '' !== $headers[ $i ] ? $headers[ $i ] : 'group_' . ( $i + 1 );
			}
		} else {
			$data_rows    = $rows;
			$value_field  = 'value';
			$group_fields = [];

			for ( $i = 0; $i < $col_count - 1; $i++ ) {
				$group_fields[] = 'group_' . ( $i + 1 );
			}
		}

		$group_fields = $this->disambiguate_field_names( $group_fields, $value_field );

		$tree           = [];
		$dataset_prefix = '';
		$dataset_suffix = '';
		$affixes_set    = false;

		foreach ( $data_rows as $row ) {
			$entry = [];
			$skip  = false;

			for ( $i = 0; $i < $col_count - 1; $i++ ) {
				$cell = isset( $row[ $i ] ) ? trim( (string) $row[ $i ] ) : '';
				if ( '' === $cell ) {
					$skip = true;
					break;
				}
				$entry[ $group_fields[ $i ] ] = $cell;
			}

			if ( $skip ) {
				continue;
			}

			$value_cell = isset( $row[ $col_count - 1 ] ) ? (string) $row[ $col_count - 1 ] : '';
			$parsed     = m_chart()->parse()->parse_data_point( $value_cell );

			if ( null === $parsed->value ) {
				continue;
			}

			$entry[ $value_field ] = (float) $parsed->value;
			$entry['prefix']       = $parsed->prefix;
			$entry['suffix']       = $parsed->suffix;

			if ( ! $affixes_set ) {
				$dataset_prefix = $parsed->prefix;
				$dataset_suffix = $parsed->suffix;
				$affixes_set    = true;
			}

			$tree[] = $entry;
		}

		if ( empty( $tree ) ) {
			return null;
		}

		return [
			'tree'           => $tree,
			'key'            => $value_field,
			'groups'         => $group_fields,
			'top_field'      => $group_fields[0],
			'dataset_prefix' => $dataset_prefix,
			'dataset_suffix' => $dataset_suffix,
		];
	}

	/**
	 * Transpose a 2D sheet so columns become rows (used to normalize parse_in='columns'
	 * to a row-oriented shape for hierarchical treemap construction)
	 *
	 * @param array $sheet array of rows
	 *
	 * @return array array of rows (transposed)
	 */
	private function transpose_sheet( $sheet ) {
		if ( ! is_array( $sheet ) || empty( $sheet ) ) {
			return [];
		}

		$row_count = count( $sheet );
		$col_count = 0;

		foreach ( $sheet as $row ) {
			if ( is_array( $row ) ) {
				$col_count = max( $col_count, count( $row ) );
			}
		}

		$out = [];

		for ( $c = 0; $c < $col_count; $c++ ) {
			$new_row = [];
			for ( $r = 0; $r < $row_count; $r++ ) {
				$new_row[] = isset( $sheet[ $r ][ $c ] ) ? $sheet[ $r ][ $c ] : '';
			}
			$out[] = $new_row;
		}

		return $out;
	}

	/**
	 * Ensure no two field names collide and that none collide with the value field
	 * Appends _2, _3, etc. as needed to disambiguate
	 *
	 * @param array  $group_fields array of group field names
	 * @param string $value_field  the value field name
	 *
	 * @return array deduplicated group fields
	 */
	private function disambiguate_field_names( $group_fields, $value_field ) {
		$seen = [ $value_field => 1 ];
		$out  = [];

		foreach ( $group_fields as $name ) {
			$candidate = $name;
			$suffix    = 2;

			while ( isset( $seen[ $candidate ] ) ) {
				$candidate = $name . '_' . $suffix;
				$suffix++;
			}

			$seen[ $candidate ] = 1;
			$out[]              = $candidate;
		}

		return $out;
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
		$rgb = [];

		switch ( strlen( $hex ) ) {
			case 6:
				// If a proper hex code, convert using bitwise operation, no overhead... faster
				$color_value = hexdec( $hex );

				$rgb['red']   = 0xFF & ( $color_value >> 0x10 );
				$rgb['green'] = 0xFF & ( $color_value >> 0x8 );
				$rgb['blue']  = 0xFF & $color_value;
				break;

			case 3:
				// If shorthand notation we need to do some string manipulations
				$rgb['red']   = hexdec( str_repeat( substr( $hex, 0, 1 ), 2 ) );
				$rgb['green'] = hexdec( str_repeat( substr( $hex, 1, 1 ), 2 ) );
				$rgb['blue']  = hexdec( str_repeat( substr( $hex, 2, 1 ), 2 ) );
				break;

			default:
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
		$themes = [];

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
			return [];
		}

		$theme_dir = new DirectoryIterator( $theme_base );
		$themes    = [];

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

				$themes[ $file ] = (object) [
					'slug'    => substr( $file, 0, -4 ),
					'name'    => $name,
					'file'    => $file,
					'options' => require $theme_base . $file,
				];
			}
		}

		asort( $themes );

		return $themes;
	}
}
