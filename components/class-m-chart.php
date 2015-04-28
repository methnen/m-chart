<?php

class M_Chart {
	public $dev = true;
	public $slug = 'm-chart';
	public $plugin_name = 'Chart';
	public $chart_meta_fields = array(
		'library'    => 'highcharts',
		'type'       => 'line',
		'parse_in'   => 'rows',
		'labels'     => true,
		'subtitle'   => '',
		'y_title'    => '',
		'y_units'    => '',
		'y_min'      => false,
		'x_title'    => '',
		'x_units'    => '',
		'height'     => 400,
		'legend'     => true,
		'source'     => '',
		'source_url' => '',
		'data'       => array(),
	);
	public $get_chart_default_args = array(
		'img'   => 'no',
		'width' => 'responsive',
	);
	public $parse_options = array(
		'columns',
		'rows',
	);
	public $options_set;
	public $plugin_url;
	public $is_shortcake = false;

	private $admin;
	private $highcharts;
	private $parse;
	private $valid_libraries = array(
		'highcharts',
	);

	/**
	 * Constructor
	 */
	public function __construct() {
		add_action( 'init', array( $this, 'init' ) );
		add_action( 'save_post', array( $this, 'save_post' ) );
		add_action( 'shortcode_ui_before_do_shortcode', array( $this, 'shortcode_ui_before_do_shortcode' ) );

		add_shortcode( 'chart', array( $this, 'chart_shortcode' ) );
	}

	/**
	 * Admin object accessor
	 */
	public function admin() {
		if ( ! $this->admin ) {
			require_once __DIR__ . '/class-m-chart-admin.php';
			$this->admin = new M_Chart_Admin;
		}

		return $this->admin;
	}

	/**
	 * Highcharts object accessor
	 */
	public function highcharts() {
		if ( ! $this->highcharts ) {
			require_once __DIR__ . '/class-m-chart-highcharts.php';
			$this->highcharts = new M_Chart_Highcharts;
		}

		return $this->highcharts;
	}

	/**
	 * Parse object accessor
	 */
	public function parse() {
		if ( ! $this->parse ) {
			require_once __DIR__ . '/class-m-chart-parse.php';
			$this->parse = new M_Chart_Parse;
		}

		return $this->parse;
	}

	/**
	 * Do init stuff
	 */
	public function init() {
		// Register the units taxonomy
		register_taxonomy(
			$this->slug . '-units',
			array( $this->slug ),
			array(
				'hierarchical' => true,
				'labels'       => array(
					'name'              => esc_html__( 'Chart Units', 'm-chart' ),
					'singular_name'     => esc_html__( 'Chart Unit', 'm-chart' ),
					'search_items'      => esc_html__( 'Search Chart Units', 'm-chart' ),
					'all_items'         => esc_html__( 'All Chart Units', 'm-chart' ),
					'parent_item'       => esc_html__( 'Parent Chart Unit', 'm-chart' ),
					'parent_item_colon' => esc_html__( 'Parent Chart Unit:', 'm-chart' ),
					'edit_item'         => esc_html__( 'Edit Chart Unit', 'm-chart' ),
					'update_item'       => esc_html__( 'Update Chart Unit', 'm-chart' ),
					'add_new_item'      => esc_html__( 'Add New Chart Unit', 'm-chart' ),
					'new_item_name'     => esc_html__( 'Chart Unit Name', 'm-chart' ),
					'menu_name'         => esc_html__( 'Chart Units', 'm-chart' ),
				),
				'show_ui'      => true,
				'query_var'    => true,
				'rewrite'      => array(
					'slug'         => $this->slug . '-units',
				),
			)
		);

		// Get the public taxonomies so the custom post type can use them
		$taxonomies = get_taxonomies( array( 'public' => true ) );

		// Register the charts custom post type
		register_post_type(
			$this->slug,
			array(
				'labels' => array(
					'name'               => esc_html__( 'Charts', 'm-chart' ),
					'singular_name'      => esc_html__( 'Chart', 'm-chart' ),
					'add_new'            => esc_html__( 'Add Chart', 'm-chart' ),
					'add_new_item'       => esc_html__( 'Add Chart', 'm-chart' ),
					'edit'               => esc_html__( 'Edit', 'm-chart' ),
					'edit_item'          => esc_html__( 'Edit Chart', 'm-chart' ),
					'new_item'           => esc_html__( 'New Chart', 'm-chart' ),
					'view'               => esc_html__( 'View', 'm-chart' ),
					'view_item'          => esc_html__( 'View Chart', 'm-chart' ),
					'search_items'       => esc_html__( 'Search Charts', 'm-chart' ),
					'not_found'          => esc_html__( 'No Charts found', 'm-chart' ),
					'not_found_in_trash' => esc_html__( 'No Charts found in the Trash', 'm-chart' ),
				),
				'register_meta_box_cb' => is_admin() ? array( $this->admin(), 'meta_boxes' ) : null,
				'public'               => true,
				'hierarchical'         => false,
				'exclude_from_search'  => false,
				'menu_position'        => 9,
				'menu_icon'            => 'dashicons-chart-pie',
				'query_var'            => true,
				'can_export'           => true,
				'has_archive'          => 'charts',
				'description'          => esc_html__( 'Manage data sets and display them as charts in WordPress.', $this->slug ),
				'rewrite'              => array( 'slug' => 'chart' ),
				'supports'             => array(
					'author',
					'title',
					'excerpt',
					'comments',
				),
				'taxonomies' => $taxonomies,
			)
		);

		$this->plugin_url = $this->plugin_url();

		// Register the graphing library scripts
		wp_register_script(
			'highcharts-js',
			$this->plugin_url . '/components/external/highcharts/highcharts.js',
			array( 'jquery' )
		);
	}

	/**
	 * VIP's CDN was breaking Highcharts ability to handle embedded SVGs so this should circumvent that
	 * If you wanted to say, watermark your charts, SVGs suddenly become very important
	 *
	 * @param string $path option additional path to be used (e.g. components)
	 *
	 * @return string URL to the plugin directory with path if parameter was passed
	 */
	public function plugin_url( $path = '' ) {
		if ( is_admin() ) {
			$url_base = parse_url( admin_url() );
		}
		else
		{
			$url_base = parse_url( home_url() );
		}

		$url_path = parse_url( plugins_url( $path, __DIR__ ) );

		return $url_base['scheme'] . '://' . $url_base['host'] . preg_replace( '#/$#', '', $url_path['path'] ) . ( empty( $url_path['query'] ) ? '' : '?' . $url_path['query'] );
	}

	/**
	 * Get chart post meta
	 *
	 * @param int $post_id WP post ID of the post you want post meta from
	 * @param string $field optional field to be returend instead of all post meta
	 *
	 * @return string URL to the plugin directory with path if parameter was passed
	 */
	public function get_post_meta( $post_id, $field = false ) {
		$post_meta = get_post_meta( $post_id, $this->slug, true );
		$post_meta = wp_parse_args( $post_meta, $this->chart_meta_fields );

		if ( $field && isset( $post_meta[ $field ] ) ) {
			return $post_meta[ $field ];
		}
		elseif ( $field ) {
			return null;
		}

		return $post_meta;
	}

	/**
	 * Update the post meta based and set unit terms if appropriate
	 *
	 * @param int $post_id WP post ID of the post you want to attach post meta to
	 * @param array $meta an array of the post meta you want to attach to the post
	 */
	public function update_post_meta( $post_id, $meta ) {
		// Make sure the meta is formatted correctly and validated
		$parsed_meta = $this->validate_post_meta( $meta );

		// Set unit terms
		$terms = array();

		if ( '' != $parsed_meta['y_units'] ) {
			$terms[] = $parsed_meta['y_units'];
		}

		if ( '' != $parsed_meta['x_units'] ) {
			$terms[] = $parsed_meta['x_units'];
		}

		wp_set_object_terms( $post_id, $terms, $this->slug . '-units' );

		// Save meta to the post
		update_post_meta( $post_id, $this->slug, $parsed_meta );
		do_action( 'm_chart_update_post_meta', $post_id, $parsed_meta );
	}

	/**
	 * Parses a $meta array and returns a cleaned and validated array
	 *
	 * @param array $meta an array of the post meta you want to attach to the post
	 *
	 * @return array of cleaned/validated post meta
	 */
	public function validate_post_meta( $meta ) {
		// Need to set checkboxes before checking or they can't be deselected
		$chart_meta['labels'] = false;
		$chart_meta['y_min']  = false;
		$chart_meta['legend'] = false;

		// Filter values so we know the data is clean
		foreach ( $this->chart_meta_fields as $field => $default ) {
			if ( isset( $meta[ $field ] ) ) {
				if ( 'source_url' == $field && '' != $meta[ $field ] ) {
					$chart_meta[ $field ] = esc_url_raw( $meta[ $field ] );
				} elseif ( 'data' == $field ) {
					$chart_meta[ $field ] = $meta[ $field ];
				} elseif ( in_array( $field, array( 'labels', 'y_min', 'legend' ) ) ) {
					$chart_meta[ $field ] = (bool) $meta[ $field ];
				} elseif ( 'height' == $field ) {
					$chart_meta[ $field ] = absint( $meta[ $field ] );

					if ( $chart_meta[ $field ] > 900 ) {
						$chart_meta[ $field ] = 900;
					} else if ( $chart_meta[ $field ] < 300 ) {
						$chart_meta[ $field ] = 300;
					}
				} else {
					$chart_meta[ $field ] = wp_filter_nohtml_kses( $meta[ $field ] );
				}
			}
			elseif ( ! isset( $chart_meta[ $field ] ) ) {
				// Fall back on the default value if there wasn't one in the given meta
				$chart_meta[ $field ] = $default;
			}
		}

		// If the data value is not an array we asume it is JSON encoded (i.e. from Handsontable)
		if ( ! is_array( $chart_meta['data'] ) && '' != $chart_meta['data'] ) {
			$chart_meta['data'] = json_decode( stripslashes( $chart_meta['data'] ) );
		}

		// Validate the data array
		$chart_meta['data'] = $this->validate_data( $chart_meta['data'] );

		return $chart_meta;
	}

	/**
	 * Runs all of the raw data array values through wp_filter_nohtml_kses
	 *
	 * @param array $data an array of data as passed by the user
	 *
	 * @return array of validated data
	 */
	function validate_data( $data ) {
		if ( ! is_array( $data ) ) {
			return wp_filter_nohtml_kses( $data );
		}

        foreach ( $data as $key => $value ) {
            if ( is_array( $value ) ) {
                $data[ $key ] = $this->validate_data( $value );
            }
            else {
                $data[ $key ] = wp_filter_nohtml_kses( $value );
            }
        }

        return $data;
    }


	/**
	 * Hook to save_post action and save chart related post meta
	 *
	 * @param int $post_id WP post ID of the post
	 */
	public function save_post( $post_id ) {
		// We do this in the main class because otherwise it won't get hooked soon enough
		$this->admin()->save_post( $post_id );
	}

	/**
	 * Returns a chart
	 *
	 * @param int $post_id WP post ID of the chart you want
	 * @param array $args an array of args
	 *
	 * @return string HTML and Javascript needed to display a chart (or if appropriate an HTML image tag)
	 */
	public function get_chart( $post_id, $args = array() ) {
		$args = wp_parse_args( $args, $this->get_chart_default_args );

		// If they want the image version or the request is happening from a feed we return the image tag
		if ( 'yes' == $args['img'] || is_feed() || $this->is_shortcake ) {
			$image = $this->get_chart_image( $post_id );

			// Default behavior is to return the full size image but with the width/height values halved
			// This should result in an image that looks nice on retina or better screens
			$image['width']  = $image['width'] / 2;
			$image['height'] = $image['height'] / 2;

			$image = apply_filters( 'm_chart_get_chart_image_tag', $image, $post_id, $args );

			ob_start();
			?>
			<img src="<?php echo esc_url( $image['url'] ); ?>" alt="<?php echo esc_attr( $image['name'] ); ?>" width="<?php echo absint( $image['width'] ); ?>" height="<?php echo absint( $image['height'] ); ?>" />
			<?php
			return ob_get_clean();
		}

		$library = $this->get_post_meta( $post_id, 'library' );

		// If it's not a valid library we don't proceed
		if ( ! $this->is_valid_library( $library ) ) {
			return;
		}

		// If we haven't enqueued the right library yet lets do it
		if ( ! wp_script_is( $library . '-js', 'enqueued' ) ) {
			wp_enqueue_script( $library . '-js' );
		}

		ob_start();
		require __DIR__ . '/templates/' . $library . '-chart.php';
		return ob_get_clean();
	}

	/**
	 * Return an array of image values for a chart
	 *
	 * @param int $post_id WP post ID of the chart you want an image for
	 *
	 * @return array an arry of image values url, width, height, etc...
	 */
	public function get_chart_image( $post_id ) {
		if ( ! $thumbnail_id = get_post_meta( $post_id, '_thumbnail_id', true ) ) {
			return false;
		}

		if ( ! $thumbnail = wp_get_attachment_image_src( $thumbnail_id, 'full' ) ) {
			return false;
		}

		return array(
			'url'    => $thumbnail[0],
			'file'   => basename( $thumbnail[0] ),
			'width'  => $thumbnail[1],
			'height' => $thumbnail[2],
			'name'   => get_the_title( $thumbnail_id ),
		);
	}

	/**
	 * Return a chart via the [chart id="x"] short code
	 *
	 * @param array $args an array of arguments passed by the WP short code API
	 *
	 * @return string the chart requested in Javascript or HTML form
	 */
	public function chart_shortcode( $args ) {
		$default_args = $this->get_chart_default_args;
		$default_args['id'] = '';

		$args = shortcode_atts( $default_args, $args );

		$post_id = $args['id'];
		unset( $args['id'] );

		// Did we get a chart ID?
		if ( ! is_numeric( $post_id ) ) {
			return;
		}

		// Make sure the chart actually exists and that it's a chart so we don't fatal later
		if ( $this->slug != get_post_type( $post_id ) ) {
			return;
		}

		// Is it published?
		if ( 'publish' != get_post_status( $post_id ) ) {
			return;
		}

		return $this->get_chart( $post_id, $args );
	}

	/**
	 * Helper function that prevents issues with stripslashes and unicode characters
	 * stripslashes will strip off the slash before unicode characters which is sucky, this prevents that
	 *
	 * @param string $string a string that may have unicode characters as well as unecessary escaping
	 *
	 * @return string a string with any unecessary escaping removed
	 */
	public function unicode_aware_stripslashes( $string ) {
		return stripslashes( preg_replace( '#\\\u[a-fA-F0-9]{4}#', '\\\\$0', $string ) );
	}

	/**
	 * Helper function that returns the chart unit terms
	 *
	 * @return array an array of generated and/or compiled unit terms
	 */
	public function get_unit_terms() {
		$terms = get_terms( $this->slug . '-units', array( 'hide_empty' => false ) );

		if ( empty( $terms ) ) {
			$terms = $this->generate_unit_terms();
		}

		return $this->compile_unit_terms( $terms );
	}

	/**
	 * Helper function that returns the chart unit terms
	 *
	 * @param array an array of unit terms
	 *
	 * @return array an array of compiled unit terms
	 */
	public function compile_unit_terms( $terms ) {
		$compiled_terms = array();
		$parents = array();

		foreach ( $terms as $unit ) {
			if ( 0 == $unit->parent ) {
				$parents[ $unit->term_id ] = $unit->name;
			}
		}

		foreach ( $terms as $unit ) {
			if ( 0 != $unit->parent && isset( $parents[ $unit->parent ] ) ) {
				$compiled_terms[ $parents[ $unit->parent ] ][] = $unit;
			}
		}

		ksort( $compiled_terms );

		return $compiled_terms;
	}

	/**
	 * Helper function that populates the unit terms taxonomy with a default set of terms
	 *
	 * @return array an array of the newly generated unit terms
	 */
	public function generate_unit_terms() {
		// Load the default terms array
		$default_terms = require __DIR__ .'/array-default-unit-terms.php';

		$terms = array();

		foreach ( $default_terms as $parent_term => $child_terms ) {
			$parent  = (object) wp_insert_term( $parent_term, $this->slug . '-units' );
			$terms[] = get_term( $parent->term_id, $this->slug . '-units' );

			foreach ( $child_terms as $child_term ) {
				$term    = (object) wp_insert_term( $child_term, $this->slug . '-units', array( 'parent' => $parent->term_id ) );
				$terms[] = get_term( $term->term_id, $this->slug . '-units' );
			}
		}

		return $terms;
	}

	/**
	 * Detect Shortcake usage and set is_shortcake to true
	 *
	 * @param string The shortcode being rendered
	 */
	public function shortcode_ui_before_do_shortcode( $shortcode ) {
		if ( ! preg_match( '#\[chart*.*?\]#', $shortcode ) ) {
			return;
		}

		$this->is_shortcake = true;
	}

	/**
	 * If the passed library is valid return TRUE otherwise FALSE
	 *
	 * @param string library string (i.e. 'highcharts')
	 *
	 * @return bool
	 */
	public function is_valid_library( $library ) {
		if ( ! in_array( $library, $this->valid_libraries ) ) {
			return false;
		}

		return true;
	}
}

/**
 * Plugin object accessor
 */
function m_chart() {
	global $m_chart;

	if ( ! $m_chart ) {
		$m_chart = new M_Chart;
	}

	return $m_chart;
}
