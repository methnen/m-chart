<?php

class M_Chart_Chartjs {
	public $library = 'chartjs';
	public $value_labels_limit = 15;
	public $value_labels_div = 10;
	public $original_labels;
	public $post;
	public $post_meta;
	public $args;
	public $type_options = array(
		'line',
		'column',
		'bar',
		'pie',
	);
	public $theme_directories;
	public $colors = array(
		'#7cb5ec',
		'#434348',
		'#90ed7d',
		'#f7a35c',
		'#8085e9',
		'#f15c80',
		'#e4d354',
		'#2b908f',
		'#f45b5b',
		'#91e8e1',
	);
	public $chart_types = array(
		'column' => 'bar',
		'bar'    => 'horizontalBar',
		'pie'    => 'pie',
		'line'   => 'line',
	);

	/**
	 * Constructor
	 */
	public function __construct() {
		add_filter( 'm_chart_image_support', array( $this, 'm_chart_image_support' ), 10, 2 );
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
			'type' => $this->chart_types[ $this->post_meta['type'] ],
			'options' => array(
			    'title' => array(
			    	'display'   => true,
					'text'      => $this->esc_title( apply_filters( 'the_title', $this->post->post_title ) ),
					'fontSize'  => 21,
					'fontStyle' => 'normal',
			    ),
				'legend' => array(
					'display'  => $this->post_meta['legend'] ? true : false,
					'position' => 'bottom',
					'labels' => array(
						'fontStyle' => 'bold',
					),
				),
				'responsive' => true,
				'maintainAspectRatio' => false,
			),
		);

		$chart_args['data']['labels'] = $this->get_value_labels_array();

		if ( 'pie' != $chart_args['type'] ) {
			$chart_args = $this->add_axis_labels( $chart_args );
		}

		if ( 'horizontalBar' == $chart_args['type'] ) {
			$chart_args['options']['scales']['yAxes'][0]['gridLines']['display'] = false;
		} elseif ( 'pie' != $chart_args['type'] ) {
			$chart_args['options']['scales']['xAxes'][0]['gridLines']['display'] = false;
		}

		$chart_args = $this->add_data_sets( $chart_args );

		// Apply colors, yes this kind of sucks, but so does the Chart.js color system
		if (
			   isset( $chart_args['data']['datasets'] )
			&& ( 'bar' == $chart_args['type'] || 'horizontalBar' == $chart_args['type'] )
		) {
			foreach ( $chart_args['data']['datasets'] as $key => $dataset ) {
				$chart_args['data']['datasets'][ $key ]['backgroundColor'] = $this->colors[ $key % count( $this->colors ) ];
			}
		} elseif (
			   isset( $chart_args['data']['datasets'] )
			&& 'pie' == $chart_args['type']
		) {
			foreach ( $chart_args['data']['datasets'][0]['data'] as $key => $data ) {
				$chart_args['data']['datasets'][0]['backgroundColor'][ $key ] = $this->colors[ $key ];
			}
		} elseif( isset( $chart_args['data']['datasets'] ) ) {
			foreach ( $chart_args['data']['datasets'] as $key => $dataset ) {
				$color = $this->colors[ $key % count( $this->colors ) ];

				$chart_args['data']['datasets'][ $key ]['fill'] = false;
				$chart_args['data']['datasets'][ $key ]['backgroundColor'] = $color;
				$chart_args['data']['datasets'][ $key ]['borderColor'] = $color;
				$chart_args['data']['datasets'][ $key ]['lineTension'] = 0;
			}
		}

		$chart_args = apply_filters( 'm_chart_chart_args', $chart_args, $this->post, $this->post_meta, $this->args );

		// Set the cache, we'll regenerate this when someone updates the post
		if ( $cache ) {
			wp_cache_set( $cache_key, $chart_args, m_chart()->slug );
		}

		// Clear out all of the class vars so the next chart instance starts fresh
		$this->args = null;
		$this->post = null;
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
		$chart_args['options']['scales']['xAxes'][0]['scaleLabel'] = array(
			'display'     => '' == $this->post_meta['x_title'] ? false : true,
			'labelString' => $this->esc_title( $this->post_meta['x_title'] ),
		);

		// We've got x axis units so we'll add them to the axis label
		if ( '' != $this->post_meta['x_units'] ) {
			$units   = get_term_by( 'slug', $this->post_meta['x_units'], m_chart()->slug . '-units' );
			$x_units = '' != $this->post_meta['x_title'] ? ' (' . $units->name . ')' : $units->name;

			$chart_args['options']['scales']['xAxes'][0]['scaleLabel']['labelString'] .= $x_units;
		}

		$chart_args['options']['scales']['yAxes'][0]['scaleLabel'] = array(
			'display'     => '' == $this->post_meta['y_title'] ? false : true,
			'labelString' => $this->esc_title( $this->post_meta['y_title'] ),
		);

		// We've got y axis units so we'll add them to the axis label
		if ( $this->post_meta['y_units'] != '' ) {
			$units   = get_term_by( 'slug', $this->post_meta['y_units'], m_chart()->slug . '-units' );
			$y_units = '' != $this->post_meta['y_title'] ? ' (' . $units->name . ')' : $units->name;

			$chart_args['options']['scales']['yAxes'][0]['scaleLabel']['labelString'] .= $y_units;
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
			|| 'both' != m_chart()->parse()->value_labels_position
		) {
			foreach ( $chart_args['data']['labels'] as $key => $label ) {
				$chart_args['data']['datasets'][0]['data'][] = $data_array[ $key ];
			}
		} else {
			$set_data = array();

			$label_key = ( $this->post_meta['parse_in'] == 'rows' ) ? 'first_column' : 'first_row';

			foreach ( $data_array as $key => $data_chunk ) {
				$set_data[ $key ] = array(
					'label' => m_chart()->parse()->value_labels[ $label_key ][ $key ],
					'data' => array(),
				);

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
	 * Helper function sets empty values to NULL so that Chart.js handles them correctly.
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
}