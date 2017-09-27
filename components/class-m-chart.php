<?php

class M_Chart {
	public $dev = true;
	public $version = '1.6.3';
	public $slug = 'm-chart';
	public $plugin_name = 'Chart';
	public $chart_meta_fields = array(
		'library'     => 'highcharts',
		'type'        => 'line',
		'parse_in'    => 'rows',
		'labels'      => true,
		'shared'      => false,
		'subtitle'    => '',
		'y_title'     => '',
		'y_units'     => '',
		'y_min'       => false,
		'y_min_value' => 0,
		'x_title'     => '',
		'x_units'     => '',
		'height'      => 400,
		'legend'      => true,
		'source'      => '',
		'source_url'  => '',
		'data'        => array(),
		'set_names'   => array(),
	);
	public $get_chart_default_args = array(
		'show'  => 'chart',
		'width' => 'responsive',
		'share' => '',
	);
	public $parse_options = array(
		'columns',
		'rows',
	);
	public $options_set;
	public $plugin_url;
	public $is_shortcake = false;
	public $is_iframe = false;
	public $instance = 1;
	public $settings = array(
		'performance'   => 'default',
		'embeds'        => '',
		'default_theme' => '_default',
		'lang_settings' => array(
			'decimalPoint'   => '.',
			'thousandsSep'   => ',',
			'numericSymbols' => array(
				'K', // Thousands
				'M', // Millions
				'B', // Billions
				'T', // Trillions
				'P', // Quadrillions
				'E', // Quintillions
			),
			'numericSymbolMagnitude' => 1000,
		),
	);

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
		$this->plugin_url = $this->plugin_url();

		add_action( 'init', array( $this, 'init' ) );
		add_action( 'plugins_loaded', array( $this, 'plugins_loaded' ) );
		add_action( 'save_post', array( $this, 'save_post' ) );
		add_action( 'shortcode_ui_before_do_shortcode', array( $this, 'shortcode_ui_before_do_shortcode' ) );
		add_action( 'template_redirect', array( $this, 'template_redirect' ) );

		// Doing this before the default so it's already done before anything else
		add_filter( 'm_chart_get_chart_image_tag', array( $this, 'm_chart_get_chart_image_tag' ), 9, 3 );
		add_filter( 'the_content', array( $this, 'the_content' ) );

		add_shortcode( 'chart', array( $this, 'chart_shortcode' ) );
		add_shortcode( 'chart-share', array( $this, 'share_shortcode' ) );
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
				'description'          => esc_html__( 'Manage data sets and display them as charts in WordPress.', 'm-chart' ),
				'rewrite'              => array(
					'slug' => 'chart',
					'ep_mask' => 'm-chart'
				),
				'supports'             => array(
					'author',
					'title',
					'excerpt',
					'comments',
				),
				'taxonomies' => array(
					'category',
					'post_tag',
					$this->slug . '-units',
				),
			)
		);

		// Register the graphing library scripts
		wp_register_script(
			'highcharts-more',
			$this->plugin_url . '/components/external/highcharts/highcharts-more.js',
			array( 'jquery', 'highcharts' ),
			$this->version
		);

		wp_register_script(
			'highcharts',
			$this->plugin_url . '/components/external/highcharts/highcharts.js',
			array( 'jquery' ),
			$this->version
		);

		// Add endpoint needed for iframe embed support
		add_rewrite_endpoint( 'embed', $this->slug );
	}

	/**
	 * Do plugins loaded stuff
	 */
	public function plugins_loaded() {
		load_plugin_textdomain( 'm-chart', false, plugin_basename( dirname( __FILE__ ) ) . '/languages/' );
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

		// Theme default is based off of an option so we'll handle that here
		if ( ! isset( $post_meta['theme'] ) ) {
			$settings = $this->get_settings();
			$post_meta['theme'] = $settings['default_theme'];
		}

		// If there's no subtitle set we'll set an empty one
		if ( ! isset( $post_meta['subtitle'] ) ) {
			$post_meta['subtitle'] = '';
		}

		// If there's no y min value set we'll set it to 0
		if ( ! isset( $post_meta['y_min_value'] ) ) {
			$post_meta['y_min_value'] = 0;
		}

		// If the data has the old legacy format we need to update it
		if ( isset( $post_meta['data'] ) && ! isset( $post_meta['data']['sets'] ) ) {
			$data = $post_meta['data'];
			$post_meta['data'] = array();
			$post_meta['data']['sets'][] = $data;
		}

		// If there's no set_names value set we'll set it to an empty array
		if ( ! isset( $post_meta['set_names'] ) ) {
			$post_meta['set_names'] = array();
		}

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
					$chart_meta[ $field ]['sets'] = $meta[ $field ];
				} elseif ( 'set_names' == $field ) {
					$chart_meta[ $field ] = array_values( $meta[ $field ] );
				} elseif ( in_array( $field, array( 'labels', 'y_min', 'legend' ) ) ) {
					$chart_meta[ $field ] = (bool) $meta[ $field ];
				} elseif ( 'height' == $field ) {
					$chart_meta[ $field ] = absint( $meta[ $field ] );

					if ( $chart_meta[ $field ] > 1500 ) {
						$chart_meta[ $field ] = 1500;
					} else if ( $chart_meta[ $field ] < 300 ) {
						$chart_meta[ $field ] = 300;
					}
				} else if ( 'y_min_value' == $field ) {
					$chart_meta[ $field ] = floatval( $meta[ $field ] );
				} else {
					$chart_meta[ $field ] = wp_filter_nohtml_kses( $meta[ $field ] );
				}
			}
			elseif ( ! isset( $chart_meta[ $field ] ) ) {
				// Fall back on the default value if there wasn't one in the given meta
				$chart_meta[ $field ] = $default;
			}
		}

		// The theme meta it isn't included in the chart_meta_fields class var so we handle it here
		if ( isset( $meta['theme'] ) && preg_match('#^[a-zA-Z0-9-_]+$#', $meta['theme'] ) ) {
			$chart_meta['theme'] = $meta['theme'];
		}

		// If the data value is not an array we asume it is JSON encoded (i.e. from Handsontable)
		if ( ! is_array( $chart_meta['data']['sets'] ) && '' != $chart_meta['data']['sets'] ) {
			$chart_meta['data']['sets'] = json_decode( stripslashes( $chart_meta['data']['sets'] ) );
		}

		// Validate the data array
		foreach ( $chart_meta['data']['sets'] as $key => $data ) {
			$chart_meta['data'][ $key ] = $this->validate_data( $data );
		}

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
	public function get_chart( $post_id = null, $args = array() ) {
		if ( ! $post_id ) {
			$post_id = get_the_ID();
		}

		// Normalize historic usage of 'img' argument
		if ( isset( $args['img'] ) && 'yes' == $args['img'] ) {
			$args['show'] = 'image';
			unset( $args['img'] );
		}

		$args = wp_parse_args( $args, $this->get_chart_default_args );

		// If they want the table of data we'll return that
		if ( 'table' == $args['show'] ) {
			return $this->build_table( $post_id );
		}

		// If they want the image version or the request is happening from a feed we return the image tag
		if ( 'image' == $args['show'] || is_feed() || $this->is_shortcake || $this->is_amp_endpoint() ) {
			$image = $this->get_chart_image( $post_id );

			// Default behavior is to return the full size image but with the width/height values halved
			// This should result in an image that looks nice on retina or better screens
			$image['width']  = $image['width'] / 2;
			$image['height'] = $image['height'] / 2;

			$image = apply_filters( 'm_chart_get_chart_image_tag', $image, $post_id, $args );

			$classes = $this->slug . ' ' . $this->slug . '-' . $post_id;

			if ( $this->is_amp_endpoint() ) {
				ob_start();
				?><amp-img src="<?php echo esc_url( $image['url'] ); ?>" alt="<?php echo esc_attr( $image['name'] ); ?>" width="<?php echo absint( $image['width'] ); ?>" height="<?php echo absint( $image['height'] ); ?>" class="<?php echo esc_attr( $classes ); ?>"></amp-img><?php
				return ob_get_clean();
			} else {
				ob_start();
				?><img src="<?php echo esc_url( $image['url'] ); ?>" alt="<?php echo esc_attr( $image['name'] ); ?>" width="<?php echo absint( $image['width'] ); ?>" height="<?php echo absint( $image['height'] ); ?>" alt="<?php echo esc_attr( get_the_title( $post_id ) ); ?>" class="<?php echo esc_attr( $classes ); ?>" /><?php
				return ob_get_clean();
			}
		}

		$settings = $this->get_settings();

		if (
			   ! is_admin()
			&& 'enabled' == $settings['embeds']
			&& ! $this->is_iframe
		) {
			return $this->get_chart_iframe( $post_id, $args );
		}

		$library = $this->get_post_meta( $post_id, 'library' );

		// If it's not a valid library we don't proceed
		if ( ! $this->is_valid_library( $library ) ) {
			return;
		}

		// If we haven't enqueued the right library yet lets do it
		if ( ! wp_script_is( $library, 'enqueued' ) ) {
			wp_enqueue_script( $library );
		}

		ob_start();
		require __DIR__ . '/templates/' . $library . '-chart.php';
		$this->instance++;
		return ob_get_clean();
	}

	/**
	 * Returns a charts data as an HTML table
	 *
	 * @param int $post_id WP post ID of the chart you want
	 *
	 * @return string HTML table
	 */
	public function build_table( $post_id ) {
		$post = get_post( $post_id );
		$post_meta = $this->get_post_meta( $post_id );

		$table = '';

		$multiple = count( $post_meta['data']['sets'] ) > 1 ? true : false;

		foreach ( $post_meta['data']['sets'] as $set => $data ) {
			$classes = $this->slug . '-table ' . $this->slug . '-table-' . $post_id . '-' . $set;

			m_chart()->parse()->parse_data( $data, $post_meta['parse_in'] );

			ob_start();
			require __DIR__ . '/templates/table.php';
			$table .= ob_get_clean();
		}

		return $table;
	}

	/**
	 * Return an array of image values for a chart
	 *
	 * @param int $post_id WP post ID of the chart you want an image for
	 *
	 * @return array an array of image values url, width, height, etc...
	 */
	public function get_chart_image( $post_id ) {
		$settings = $this->get_settings();

		// If we aren't generating images we'll return false
		if ( 'default' != $settings['performance'] ) {
			return false;
		}

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
	 * Filter the m_chart_get_chart_image_tag hook and return a plaecholder if appropriate
	 *
	 * @param array|bool an array of image values or false if no image could be found
	 * @param int $post_id WP post ID of the chart you want an image for
	 *
	 * @return array an array of image values url, width, height, etc...
	 */
	public function m_chart_get_chart_image_tag( $img, $post_id ) {
		if ( ! $img ) {
			return $img;
		}

		$url = $this->plugin_url . '/components/images/chart-placeholder.png';

		return array(
			'url'    => $url,
			'file'   => basename( $url ),
			'width'  => 640,
			'height' => 480,
			'name'   => get_the_title( $post_id ),
		);
	}

	/**
	 * Filter the the_content hook and return chart code if this is a chart
	 *
	 * @param string $content content from the current post
	 *
	 * @return string original content or chart code
	 */
	public function the_content( $content ) {
		// Make sure we're dealing with a chart
		if ( get_post_type() != $this->slug ) {
			// We aren't dealing with a chart so we'll just stop here
			return $content;
		}

		// Call the get_chart method and let it do it's thing
		return $this->get_chart();
	}

	/**
	 * Return an iframe for a given chart
	 *
	 * @param int $post_id WP post ID of the chart you want
	 * @param array $args an array of args
	 *
	 * @return string HTML needed to display a chart via an iframe
	 */
	public function get_chart_iframe( $post_id, $args = array() ) {
		$post_meta = $this->get_post_meta( $post_id );

		$src_url = add_query_arg( $args, get_permalink( $post_id ) . 'embed/' );

		ob_start();
		?><iframe id="m-chart-container-<?php echo absint( $post_id ); ?>-<?php echo absint( $this->instance ); ?>" class="m-chart-iframe" width="100%" height="<?php echo absint( $post_meta['height'] ); ?>" src="<?php echo esc_url_raw( $src_url ); ?>" frameborder="0"></iframe><?php
		if ( 'show' == $args['share'] ) {
			unset( $args['share'] );
			require apply_filters( 'm_chart_share_template', __DIR__ . '/templates/share.php' );
		}
		$this->instance++;
		return ob_get_clean();
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
	 * Looks for the embed endpoint and serves up the requested chart if appropriate
	 */
	public function template_redirect() {
		global $wp_query;

		// Make sure this is a chart with the embed endpoint in the URL
		if ( ! isset( $wp_query->query['post_type'] ) || ! isset( $wp_query->query['embed'] ) || 'm-chart' != $wp_query->query['post_type'] ) {
			return;
		}

		$post = get_post();

		if ( ! $post ) {
			wp_die(
				esc_html__( 'The chart could not be found', 'm-chart' ),
				esc_html__( 'Chart not found', 'm-chart' ),
				array( 'response' => 404 )
			);
		}

		$settings = $this->get_settings();

		if ( 'enabled' != $settings['embeds'] ) {
			wp_die(
				esc_html__( 'Embeds of this type are not enabled', 'm-chart' ),
				esc_html__( 'Embeds disabled', 'm-chart' ),
				array( 'response' => 403 )
			);
			exit;
		}

		$this->is_iframe = true;

		unset( $_GET['action'], $_GET['share'] );

		// This prevents issues when embedding with outside sites
		header_remove( 'X-Frame-Options' );

		status_header( 200 );

		require __DIR__ . '/templates/iframe.php';
		exit;
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

	/**
	 * If current page is an AMP page returns true
	 *
	 * @return bool
	 */
	public function is_amp_endpoint() {
		if ( function_exists( 'is_amp_endpoint' ) && is_amp_endpoint() ) {
			return true;
		}

		return false;
	}

	/**
	 * Return the M Chart settings as an object
	 *
	 * @return array current settings
	 */
	public function get_settings() {
		$settings = (array) get_option( $this->slug, $this->settings );
		$settings = wp_parse_args( $settings, $this->settings );

		// Make sure the lang_settings aren't missing anything we'll be expecting later on
		$settings['lang_settings'] = wp_parse_args( $settings['lang_settings'], $this->settings['lang_settings'] );

		return $settings;
	}

	/**
	 * Return a recursively merged array out of the two given
	 *
	 * @param array a multi dimensional array that will be merged into
	 * @param array a multi dimensional array that will be merged recursively into the first one
	 *
	 * @return array the merged array
	 */
	public function array_merge_recursive( &$a, $b ) {
	    foreach ( $b as $child => $value ) {
	        if ( isset( $a[ $child ] ) ) {
				// New value exists so we'll need to move a level down
	            if ( is_array( $a[ $child ] ) && is_array( $value ) ) {
	                $this->array_merge_recursive( $a[ $child ], $value );
	            } else {
					// New value is not an array so we override the old value with the new one
	            	$a[ $child ] = $value;
	            }
	        } else {
				// New value doesn't exist so we can just add it
	        	$a[ $child ] = $value;
	        }

	    }

	    return $a;
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
