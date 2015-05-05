<?php

class M_Chart_Highcharts {
	public $library = 'highcharts';
	public $value_labels_limit = 15;
	public $value_labels_div = 10;
	public $original_labels;
	public $post;
	public $post_meta;
	public $args;
	public $type_options = array(
		'line',
		'spline',
		'area',
		'column',
		'bar',
		'pie',
	);

	/**
	 * Constructor
	 */
	public function __construct() {
		add_action( 'm_chart_update_post_meta', array( $this, 'm_chart_update_post_meta' ), 10, 2 );
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
		$this->post_meta = m_chart()->get_post_meta( $this->post->ID );
	}

	/**
	 * Get the chart options
	 *
	 * @return array an array of Highcharts wide options we want to set
	 */
	public function get_chart_options() {
		$chart_options = array(
			'lang' => array(
				'numericSymbols' => array(
					/* Thousands */
					'K',
					/* Millions */
					'M',
					/* Billions */
					'B',
					/* Trillions */
					'T',
				),
				'thousandsSep' => array(
					',',
				),
			),
		);

		return apply_filters( 'm_chart_chart_options', $chart_options, $this->library );
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
			$chart_args['graph']['width'] = is_numeric( $this->args['width'] ) ? $this->args['width'] : '';
			return $chart_args;
		}

		if ( ! $this->args || ! $this->post || ! $this->post_meta ) {
			$this->get_chart_data( $post_id, $args );
		}

		// Run the parse class on the data
		m_chart()->parse()->parse_data( $this->post_meta['data'], $this->post_meta['parse_in'] );

		$chart_args = array(
			'chart' => array(
				'type'        => $this->post_meta['type'],
				'show_labels' => $this->post_meta['labels'] ? true : false,
				'renderTo'    => 'm-chart-' . $this->post->ID,
				'height'      => $this->post_meta['height'],
			),
			'title' => array(
				'text' => $this->esc_title( apply_filters( 'the_title', $this->post->post_title ) ),
			),
			'subtitle' => array(
				'text' => $this->esc_title( $this->post_meta['subtitle'] ),
			),
			'legend' => array(
				'enabled' => $this->post_meta['legend'] ? true : false,
			),
			'credits' => array(
				'href' => $this->post_meta['source-url'],
				'text' => $this->post_meta['source'],
			),
			'exporting' => array(
				'enabled' => false,
			),
			'plotOptions' => array(
				'series' => array(
					'dataLabels' => array(
						'enabled' => $this->post_meta['labels'] ? true : false,
					),
					'connectNulls' => true,
				),
				$this->post_meta['type'] => array(
					'dataLabels' => array(
						'enabled' => $this->post_meta['labels'] ? true : false,
					),
				),
			),
		);

		// We don't want to set a width unless an explicit width was given
		if ( is_numeric( $this->args['width'] ) ) {
			$chart_args['chart']['width'] = $this->args['width'];
		}

		// Forcing a minimum value of 0 prevents the built in fudging which sometimes looks weird
		if ( $this->post_meta['y_min'] ) {
			$chart_args['yAxis']['min'] = 0;
		}

		// The x axis values need to be set or else you end up with a single notch :P
		$chart_args['xAxis']['categories'] = $this->get_value_labels_array();

		$chart_args = $this->add_axis_labels( $chart_args );
		$chart_args = $this->add_data_sets( $chart_args );

		// Add prefix/suffix if appropriate
		if ( '' != m_chart()->parse()->data_prefix ) {
			$chart_args['tooltip']['valuePrefix'] = m_chart()->parse()->data_prefix;
		}

		if ( '' != m_chart()->parse()->data_suffix ) {
			$chart_args['tooltip']['valueSuffix'] = m_chart()->parse()->data_suffix;
		}

		$chart_args['plotOptions']['series']['dataLabels']['format'] = m_chart()->parse()->data_prefix . '{y:,f}' . m_chart()->parse()->data_suffix;

		$chart_args = apply_filters( 'm_chart_chart_args', $chart_args, $this->post, $this->post_meta, $this->args );

		// Set the cache, we'll regenerate this when someone updates the post
		if ( $cache ) {
			wp_cache_set( $cache_key, $chart_args, m_chart()->slug );
		}

		// Clear out all of the class vars so the next chart instance starts fresh
		unset( $this->args, $this->post, $this->post_meta );

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
		$this->args = $this->get_chart_default_args;
		$this->post = (object) array(
			'ID'         => $post_id,
		);
		$this->post_meta = $parsed_meta;

		$this->get_chart_args( $post_id, array(), true );
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
		$chart_args['xAxis']['title']['text'] = $this->esc_title( $this->post_meta['x_title'] );

		// We've got x axis units so we'll add them to the axis label
		if ( '' != $this->post_meta['x_units'] ) {
			$units   = get_term_by( 'slug', $this->post_meta['x_units'], m_chart()->slug . '-units' );
			$x_units = '' != $this->post_meta['x_title'] ? ' (' . $units->name . ')' : $units->name;

			$chart_args['xAxis']['title']['text'] .= $x_units;
		}

		$chart_args['yAxis']['title']['text'] = $this->esc_title( $this->post_meta['y_title'] );

		// We've got y axis units so we'll add them to the axis label
		if ( $this->post_meta['y_units'] != '' ) {
			$units   = get_term_by( 'slug', $this->post_meta['y_units'], m_chart()->slug . '-units' );
			$y_units = '' != $this->post_meta['y_title'] ? ' (' . $units->name . ')' : $units->name;

			$chart_args['yAxis']['title']['text'] .= $y_units;
		}

		// Bar charts are just rotated column charts in Highcharts so we flip things around to keep the UI consistent
		if ( 'bar' == $this->post_meta['type'] ) {
			$x_title = $chart_args['xAxis']['title']['text'];

			$chart_args['xAxis']['title']['text'] = $chart_args['yAxis']['title']['text'];
			$chart_args['yAxis']['title']['text'] = $x_title;
		}

		return $chart_args;
	}

	/**
	 * Handle adding data sets (series in Highcharts terminology) to the chart args
	 *
	 * @param array the current array of chart args
	 *
	 * @return array the chart args array with data sets added to it
	 */
	public function add_data_sets( $chart_args ) {
		// When Highcharts encounters an empty data value it stops so we set them to NULL
		$data_array = array_map( array( $this, 'fix_null_values' ), m_chart()->parse()->set_data );

		if ( 'pie' != $this->post_meta['type'] && 'both' == m_chart()->parse()->value_labels_position ) {
			$set_data = array();

			$label_key = ( $this->post_meta['parse_in'] == 'rows' ) ? 'first_column' : 'first_row';

			foreach ( $data_array as $key => $data_chunk ) {
				$set_data[ $key ] = array(
					'name' => m_chart()->parse()->value_labels[ $label_key ][ $key ],
					'data' => array(),
				);

				foreach ( $data_chunk as $data ) {
					$set_data[ $key ]['data'][] = $data;
				}
			}

			$chart_args['series'] = $set_data;
		}
		else
		{
			$new_data_array = array();

			foreach ( $chart_args['xAxis']['categories'] as $key => $label ) {
				$new_data_array[ $key ] = array(
					$label,
					$data_array[ $key ],
				);
			}

			if ( 'pie' == $this->post_meta['type'] ) {
				// Don't need these anymore for pie charts
				unset( $chart_args['xAxis']['categories'] );
			}

			$chart_args['series'] = array(
				array(
					'type'         => $this->post_meta['type'],
					'showInLegend' => true,
					'data'         => $new_data_array,
				),
			);

			$chart_args['tooltip'] = array(
				'pointFormat' => '<b>{point.y}</b>',
			);
		}

		return $chart_args;
	}

	/**
	 * Helper function escapes and modifies text/title values so they work in Highcharts
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
	 * Helper function sets empty values to NULL so that Highcharts handles them correctly.
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