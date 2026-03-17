<?php

class M_Chart_Block {

	/**
	 * Constructor
	 */
	public function __construct() {
		add_action( 'init', [ $this, 'register_m_chart_block_support' ] );
		add_action( 'rest_api_init', [ $this, 'register_fetch_m_chart_options' ] );
		add_action( 'rest_api_init', [ $this, 'register_fetch_charts' ] );
		add_action( 'rest_api_init', [ $this, 'register_fetch_chart' ] );
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
		// Check the performance setting
		$performance = m_chart()->get_settings( 'performance' );
		
		// Check if there's any posts available
		$args = [ 
			'post_type' => 'm-chart', 
			'post_status' => 'publish', 
			'posts_per_page' => 1 
		];

		$posts = new WP_Query( $args );

		return [
			'siteurl'        => get_option( 'siteurl' ),
			'image_support'  => 'default' === $performance ? true : false,
			'posts_avilable' => $posts->have_posts() ? true : false,
		];
	}

	/**
	 * Register api route to search graphs by title using a search string.
	 */
	public function register_fetch_charts() {
		register_rest_route(
			'm-chart/v1',
			'/charts',
			[
				'methods'             => 'GET',
				'callback'            => [ $this, 'fetch_charts' ],
				'permission_callback' => function () {
					return true;
				},
				'args'                => [
					's' => [
						'default'           => '',
						'sanitize_callback' => 'sanitize_text_field',
					],
					'page' => [
						'default'           => 1,
						'validate_callback' => function ( $param ) {
							return is_numeric( $param ) && intval( $param ) > 0;
						},
					],
				],
			]
		);
	}

	/**
	 * Register api route to fetch a single graph by post ID.
	 */
	public function register_fetch_chart() {
		register_rest_route(
			'm-chart/v1',
			'/chart/(?P<id>\d+)',
			[
				'methods'             => 'GET',
				'callback'            => [ $this, 'fetch_chart' ],
				'permission_callback' => function () {
					return true;
				},
				'args'                => [
					'id' => [
						'validate_callback' => function ( $param ) {
							return is_numeric( $param );
						},
					],
				],
			]
		);
	}

	/**
	 * Fetch a single published chart post by ID and return the data needed by the block
	 *
	 * @param WP_REST_Request $request The REST request object.
	 * @return array|WP_Error Chart data array or WP_Error if not found.
	 */
	public function fetch_chart( $request ) {
		$post_id = intval( $request->get_param( 'id' ) );
		$post    = get_post( $post_id );

		if ( ! $post || $post->post_type !== 'm-chart' || $post->post_status !== 'publish' ) {
			return new WP_Error( 'not_found', __( 'Chart not found', 'm-chart' ), [ 'status' => 404 ] );
		}

		$post_meta         = get_post_meta( $post->ID, 'm-chart', true );
		$post_thumbnail_id = get_post_meta( $post->ID, '_thumbnail_id', true );

		return [
			'id'       => intval( $post->ID ),
			'title'    => html_entity_decode( get_the_title( $post->ID ) ),
			'subtitle' => isset( $post_meta['subtitle'] ) ? $post_meta['subtitle'] : '',
			'url'      => get_the_post_thumbnail_url( $post->ID ),
			'type'     => isset( $post_meta['type'] ) ? $post_meta['type'] : '',
			'height'   => wp_get_attachment_metadata( $post_thumbnail_id )['height'] ?? 800,
			'width'    => wp_get_attachment_metadata( $post_thumbnail_id )['width'] ?? 1200,
		];
	}

	/**
	 * Fetch charts with an optional search term
	 * 
	 * @param WP_REST_Request $request The REST request object.
	 * @return array|WP_Error Chart data array or WP_Error if not found.
	 */
	public function fetch_charts( $request ) {
		$args = [
			'post_type'      => 'm-chart',
			'post_status'    => 'publish',
			'posts_per_page' => 9,
			'paged'          => intval( $request->get_param( 'page' ) ) ?: 1,
		];

		// If there's a search string add it to our args
		$search_string = $request->get_param( 's' );

		if ( ! empty( $search_string ) ) {
			$args['s'] = $search_string;
		}

		// Get the charts
		$posts = new WP_Query( $args );

		// Buid a results array to return to the block
		$results = [];
		
		if ( $posts->have_posts() ) {
			foreach ( $posts->posts as $post ) {
				$post_meta         = get_post_meta( $post->ID, 'm-chart', true );
				$post_thumbnail_id = get_post_meta( $post->ID, '_thumbnail_id', true );
				
				$result = [
					'id'       => intval( $post->ID ),
					'title'    => html_entity_decode( get_the_title( $post->ID ) ),
					'subtitle' => isset( $post_meta ) && isset( $post_meta['subtitle'] ) ? $post_meta['subtitle'] : '',
					'url'      => get_the_post_thumbnail_url( $post->ID ),
					'type'     => isset( $post_meta ) && isset( $post_meta['type'] ) ? $post_meta['type'] : '',
					'height'   => wp_get_attachment_metadata( $post_thumbnail_id )['height'] ?? 800,
					'width'    => wp_get_attachment_metadata( $post_thumbnail_id )['width'] ?? 1200,
				];
				
				$results[] = $result;
			}
		}
		
		return [ 'found_posts' => $posts->found_posts, 'posts' => $results ];
	}
}
