<?php

class M_Chart_Block {

	private $build_folder_url;
	private $build_folder_path;

	/**
	 * Constructor
	 */
	public function __construct() {
		$this->build_folder_url  = plugin_dir_url( __DIR__ ) . 'build/';
		$this->build_folder_path = plugin_dir_path( __DIR__ ) . 'build/';
		add_action( 'init', array( $this, 'register_m_chart_block_support' ) );
		add_filter( 'rest_prepare_m-chart', array( $this, 'filter_m_chart_json' ), 10, 3 );
		add_filter( 'rest_m-chart_query', array( $this, 'set_custom_max_post_per_page' ), 10, 2 );
	}



	function set_custom_max_post_per_page( $args, $request ) {
		// Default only 100 items per request can be fetcht, we set it to 1000
		$max                    = max( (int) $request->get_param( 'all_charts' ), 1000 );
		$args['posts_per_page'] = $max;
		return $args;
	}

	public function register_m_chart_block_support() {
		register_block_type( $this->build_folder_path . 'chart/block.json' );
		$asset_file = require_once $this->build_folder_path . 'index.asset.php';

		//Register editor script
		wp_register_script(
			'm-chart_editor',
			$this->build_folder_url . 'index.js',
			array(),
			$this->version_str(),
			true
		);

		// Register block styles
		wp_register_style(
			'm-chart-style',
			$this->build_folder_url . 'index.css',
			array(),
			$this->version_str()
		);

		//Regist ereditor styles
		wp_register_style(
			'm-chart-editor-style',
			$this->build_folder_url . 'index.css',
			array( 'wp-edit-blocks' ),
			$this->version_str()
		);

	}

	// Morph the api request response to fit our needs: e.g. a preview url and subtitle to search through.
	public function filter_m_chart_json( $data, $post, $context ) {
		$post_meta              = get_post_meta( $post->ID, 'm-chart', true );
		$data->data['id']       = strval( $data->data['id'] );
		$data->data['title']    = strtolower( $data->data['title']['rendered'] ) ?? '';
		$data->data['url']      = get_the_post_thumbnail_url( $post->ID );
		$data->data['subtitle'] = isset( $post_meta ) && isset( $post_meta['subtitle'] ) ? strtolower( $post_meta['subtitle'] ) : '';

		return $data;
	}

	// Create a version string to add to the loaded script & style files, but refresh if in develop mode.
	public function version_str() {
		$plugin_file    = plugin_dir_path( __DIR__ ) . ( 'm-chart.php' );
		$plugin_data    = get_file_data( $plugin_file, array( 'Version' => 'Version' ) );
		$plugin_version = $plugin_data['Version'];
		return WP_DEBUG ? $plugin_version . ' - ' . substr( hash( 'sha256', current_time( 'timestamp' ) ), 0, 12 ) : $plugin_version;
	}
}
