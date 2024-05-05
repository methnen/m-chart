<?php

class M_Chart_Block {
	/**
	 * Constructor
	 */
	public function __construct() {
		add_action( 'init', [ $this, 'register_m_chart_block_support' ] );
		add_action( 'plugins_loaded', [ $this, 'wt_m_chart_load_textdomain' ] );
		add_action( 'rest_api_init', [ $this, 'register_fetch_m_chart_options' ] );
		add_action( 'rest_api_init', [ $this, 'register_fetch_graphs' ] );
	}

	/**
	 * Register block type
	 */
	public function register_m_chart_block_support() {
		$asset_file = require_once __DIR__ . '/block/index.asset.php';

		// Register editor script.
		wp_register_script(
			'm-chart-editor',
			m_chart()->plugin_url . '/components/block/index.js',
			[ 'wp-i18n' ],
			$this->version_str(),
			true
		);
		
		// Set editor script translation.
		wp_set_script_translations(
			'm-chart-editor',
			'm-chart',
			plugin_dir_path( __DIR__ ) . 'components/languages/'
		);

		// Register block styles.
		wp_register_style(
			'm-chart-style',
			m_chart()->plugin_url . '/components/block/index.css',
			[],
			$this->version_str()
		);

		// Register editor styles.
		wp_register_style(
			'm-chart-editor-style',
			m_chart()->plugin_url . '/components/block/index.css',
			[ 'wp-edit-blocks' ],
			$this->version_str()
		);

		register_block_type( __DIR__ . '/block/chart/block.json' );
	}

	/**
	 * Create a version string to add to the loaded script & style files, but refresh if in develop mode.
	 */
	public function version_str() {
		$plugin_file    = plugin_dir_path( __DIR__ ) . ( 'm-chart.php' );
		$plugin_data    = get_file_data( $plugin_file, [ 'Version' => 'Version' ] );
		$plugin_version = $plugin_data['Version'];
	
		return WP_DEBUG ? $plugin_version . ' - ' . substr( hash( 'sha256', current_time( 'timestamp' ) ), 0, 12 ) : $plugin_version;
	}

	/**
	 * Load the plugin's text domain
	 */
	public function wt_m_chart_load_textdomain() {
		load_plugin_textdomain( 'm-chart', false, basename( __DIR__ ) . '/languages' );
	}


	/**
	 * Register api route to fetch all kind of information needed on the available graphs & settings of the plugin.
	 */
	public function register_fetch_m_chart_options() {
		register_rest_route(
			'm-chart/v1',
			'/options/',
			[
				'methods'             => 'GET',
				'callback'            => [ $this, 'fetch_options' ],
				'permission_callback' => function () {
					return true;                },
			]
		);
	}

	/**
	 * Retrieve from the saved options the siteurl & whether to show preview images,  default show.
	 */
	public function fetch_options() {
		$mchart_options = get_option( 'm-chart' );
		$image_support  = $mchart_options && is_array( $mchart_options ) ? $mchart_options['performance'] === 'default' : true;
		$args           = [ 'post_type' => 'm-chart', 'post_status' => 'publish' ];
		$graphs         = new WP_Query( $args );

		return [
			'siteurl'              => get_option( 'siteurl' ),
			'image_support_active' => $image_support,
			'maxAvailable'         => $graphs->found_posts,
		];
	}

	/**
	 * Register api route to search graphs by title using a search string.
	 */
	public function register_fetch_graphs() {
		register_rest_route(
			'm-chart/v1',
			'/graphs(?:/(?P<s>([a-zA-Z0-9_\- ,]|%20)+))?',
			[
				'methods'             => 'GET',
				'callback'            => [ $this, 'fetch_graphs' ],
				'permission_callback' => function () {
					return true;
				},
			]
		);
	}

	/**
	 * Callback function to fetch graphs possibly using a search term to query all titles.
	 * Returns an array with the total number of results and a max of the 24 most recent objects
	 */
	public function fetch_graphs( $request ) {
		$args          = [ 'post_type' => 'm-chart', 'post_status' => 'publish' ];
		$search_string = $request->get_param( 's' );

		if ( ! ( empty( $search_string ) ) ) {
			$search_string = sanitize_text_field( urldecode( $search_string ) );
			$args['s']     = $search_string;
		}

		$graphs                           = new WP_Query( $args );
		$total_number_of_possible_results = $graphs->found_posts;

		// Limit the default number to prevent memory issues.
		$args['numberposts'] = 24;
		$posts               = get_posts( $args );

		$results = [];
		
		foreach ( $posts as $post ) {
			$result             = [];
			$post_meta          = get_post_meta( $post->ID, 'm-chart', true );
			$post_thumbnail_id  = get_post_meta( $post->ID, '_thumbnail_id', true );
			$result['id']       = strval( $post->ID );
			$result['title']    = html_entity_decode( get_the_title( $post->ID ) );
			$result['subtitle'] = isset( $post_meta ) && isset( $post_meta['subtitle'] ) ? $post_meta['subtitle'] : '';
			$result['url']      = get_the_post_thumbnail_url( $post->ID );
			$result['type']     = isset( $post_meta ) && isset( $post_meta['type'] ) ? $post_meta['type'] : '';
			$result['height']   = wp_get_attachment_metadata( $post_thumbnail_id )['height'] ?? 800;
			$result['width']    = wp_get_attachment_metadata( $post_thumbnail_id )['width'] ?? 1200;
			$results[]          = $result;
		}
		
		return [$total_number_of_possible_results, $results];
	}
}
