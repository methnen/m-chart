<?php

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

// Loaded up front so the static helpers on these classes (M_Chart_Parse::detect_labels_position(), M_Chart_Chartjs::get_type_traits(), ...)
// can be called from any hook without something having touched the parser or the library instance first
// The files only declare classes, nothing runs until m_chart()->parse() or m_chart()->library() instantiates them
require_once __DIR__ . '/class-m-chart-parsed-data-point.php';
require_once __DIR__ . '/class-m-chart-parse.php';
require_once __DIR__ . '/class-m-chart-chartjs.php';

class M_Chart {
	// Chart height range in pixels, shared by the per chart height field, the default height setting and the admin UI
	const HEIGHT_MIN = 300;
	const HEIGHT_MAX = 1500;

	public $version           = '2.4';
	private $is_preview_request = false;
	public $slug              = 'm-chart';
	public $plugin_name       = 'Chart';
	public $chart_meta_fields = [
		'library'           => 'chartjs',
		'type'              => 'line',
		'parse_in'          => 'rows',
		'labels'            => true,
		'shared'            => false,
		'subtitle'          => '',
		'y_title'           => '',
		'y_units'           => '',
		'y_min'             => false,
		'y_min_value'       => 0,
		'x_title'           => '',
		'x_units'           => '',
		'height'            => 600,
		'legend'            => true,
		'source'            => '',
		'source_url'        => '',
		'data'              => [],
		'set_names'         => [],
		'data_point_colors' => false,
		'mean_point'        => true,
		'sample_points'     => false,
		'constrain_y_axis'  => false,
		'include_source'    => false,
	];
	public $get_chart_default_args = [
		'show'  => 'chart',
		'width' => 'responsive',
		'share' => '',
	];
	public $parse_options = [
		'columns',
		'rows',
	];
	public $options_set;
	public $plugin_url;
	public $is_iframe    = false;
	public $instance     = 1;
	public $iframe_csp_nonce = '';
	public $settings     = [
		'library'          => 'chartjs',
		'show_library'     => 'no',
		'performance'      => 'default',
		'image_multiplier' => '2',
		'image_width'      => '900',
		'default_height'   => '600',
		'embeds'           => '',
		'defer_rendering'  => 'enabled',
		'default_theme'    => '_default',
		'locale'           => 'en-US',
		'csv_delimiter'    => ',',
	];
	public $csv_delimiters = [
		','  => 'Comma',
		"\t" => 'Tab',
		' '  => 'Space',
		';'  => 'Semicolon',
	];
	public $library_class;
	public $icon = 'PD94bWwgdmVyc2lvbj0iMS4wIiBlbmNvZGluZz0idXRmLTgiPz4KPHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjY0IDY0IDI0IDI0IiB3aWR0aD0iMjRweCIgaGVpZ2h0PSIyNHB4Ij4KICA8cGF0aCBmaWxsPSJjdXJyZW50Q29sb3IiIGQ9Ik0gNzYuNjU3IDY1LjUgTCA3Ni42NTcgNzUuMzQ0IEwgODYuNSA3NS4zNDQgQyA4Ni41IDY5LjkwOSA4Mi4wOTEgNjUuNSA3Ni42NTcgNjUuNSBaIE0gNzQuNjg4IDc2LjMyOCBMIDc0LjY4OCA2Ni44MzMgQyA2OS41NTcgNjcuMTc0IDY1LjUgNzEuNDM5IDY1LjUgNzYuNjU3IEMgNjUuNSA4Mi4wOTEgNjkuOTA5IDg2LjUgNzUuMzQzIDg2LjUgQyA4MC41NjIgODYuNSA4NC44MjggODIuNDQzIDg1LjE2NyA3Ny4zMTMgTCA3NC42ODggNzcuMzEzIEwgNzQuNjg4IDc2LjMyOCBaIi8+Cjwvc3ZnPg==';
	public $logo = 'PD94bWwgdmVyc2lvbj0iMS4wIiBlbmNvZGluZz0idXRmLTgiPz4KPHN2ZyBpZD0idXVpZC03OGNkNDE3YS0zN2NjLTQ0NTAtODU2ZC00MzBlMTliYjhmOTEiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyIgdmlld0JveD0iMCAwIDQzNyAzNzAuMDU2Ij4KICA8ZyBpZD0idXVpZC1hMDM3MTk0ZS1hN2QzLTQ4NTktOGEwZi0wMmIzMWI0YmQ3MzEiIHRyYW5zZm9ybT0ibWF0cml4KDEsIDAsIDAsIDEsIDM4LjQwMzk5OSwgNTUuOTM3MDA0KSI+CiAgICA8cmVjdCB4PSIyODEuNDAxIiB5PSIxNDguNTExIiB3aWR0aD0iODguNzEiIGhlaWdodD0iMTQxLjQ1IiBzdHlsZT0ic3Ryb2tlLXdpZHRoOiAxOyIvPgogICAgPHJlY3QgeD0iLTkuOTE5IiB5PSIyNjQuODIxIiB3aWR0aD0iODguNzEiIGhlaWdodD0iMjUuMTMiIHN0eWxlPSJzdHJva2Utd2lkdGg6IDE7Ii8+CiAgICA8cmVjdCB4PSItOS45MTkiIHk9Ii0zMS43NzkiIHdpZHRoPSI4OC43MSIgaGVpZ2h0PSIyODQuMjEiIHN0eWxlPSJzdHJva2Utd2lkdGg6IDE7Ii8+CiAgICA8cmVjdCB4PSIyODEuNDAxIiB5PSItMzEuNzc5IiB3aWR0aD0iODguNzEiIGhlaWdodD0iMTY3Ljg3IiBzdHlsZT0ic3Ryb2tlLXdpZHRoOiAxOyIvPgogICAgPHJlY3QgeD0iMTg2LjI4MSIgeT0iMTk0LjU1MSIgd2lkdGg9IjgyLjc5IiBoZWlnaHQ9Ijk1LjQiIHN0eWxlPSJzdHJva2Utd2lkdGg6IDE7Ii8+CiAgICA8cmVjdCB4PSI5MS4wODEiIHk9IjIzNS40MTEiIHdpZHRoPSI4Mi45NCIgaGVpZ2h0PSI1NC41NSIgc3R5bGU9InN0cm9rZS13aWR0aDogMTsiLz4KICAgIDxwb2x5Z29uIHBvaW50cz0iMjgxLjQwMSAtMzEuNzc5IDE4MC4xMDEgNjUuMTExIDE4MC4xMDEgMTc2LjcwMSAyODEuNDAxIDc5LjcxMSAyODEuNDAxIC0zMS43NzkiIHN0eWxlPSJzdHJva2Utd2lkdGg6IDE7Ii8+CiAgICA8cG9seWdvbiBwb2ludHM9Ijc4LjgwMSA3OS43MTEgMTgwLjEwMSAxNzYuNzAxIDE4MC4xMDEgNjUuMTExIDc4LjgwMSAtMzEuNzc5IDc4LjgwMSA3OS43MTEiIHN0eWxlPSJzdHJva2Utd2lkdGg6IDE7Ii8+CiAgPC9nPgo8L3N2Zz4=';

	private $admin;
	private $parse;
	private $block;
	private $fs;
	private $resolved_settings;
	private $libraries = [
		'chartjs' => 'Chart.js',
	];

	/**
	 * Constructor
	 */
	public function __construct() {
		// Initiate Freemius first so it loads as early as possible
		// Must run synchronously here at file load so Freemius detects m-chart.php as the plugin file
		$this->freemius();

		$this->plugin_url = $this->plugin_url();

		add_action( 'init', [ $this, 'init' ] );
		add_action( 'plugins_loaded', [ $this, 'plugins_loaded' ] );
		add_action( 'save_post', [ $this, 'save_post' ] );
		// Priority 0 so is_iframe is set before anything else reads it
		add_action( 'template_redirect', [ $this, 'template_redirect' ], 0 );
		// Runs last so the chart args cache is flushed after every other plugin has saved its related meta
		add_action( 'm_chart_update_post_meta', [ $this, 'm_chart_update_post_meta' ], PHP_INT_MAX, 2 );
		// Anything that writes the chart meta row directly (REST, Pro's external data sync) also invalidates the cache
		add_action( 'added_post_meta', [ $this, 'flush_chart_args_cache_on_meta_change' ], 10, 4 );
		add_action( 'updated_post_meta', [ $this, 'flush_chart_args_cache_on_meta_change' ], 10, 4 );
		add_action( 'deleted_post_meta', [ $this, 'flush_chart_args_cache_on_meta_change' ], 10, 4 );

		// Priority 9 so this runs before any default-priority filters other plugins add
		add_filter( 'm_chart_get_chart_image_tag', [ $this, 'm_chart_get_chart_image_tag' ], 9, 3 );
		add_filter( 'the_content', [ $this, 'the_content' ] );
		add_filter( 'm_chart_image_support', [ $this, 'm_chart_image_support' ], 10, 2 );
		add_filter( 'm_chart_library_class', [ $this, 'm_chart_library_class' ], 10, 2 );

		add_shortcode( 'm-chart', [ $this, 'chart_shortcode' ] );
		// Backwards-compatible alias for content created before the rename
		add_shortcode( 'chart', [ $this, 'chart_shortcode' ] );

		// Initiate the block class
		$this->block();
	}

	/**
	 * Initiate and return the Freemius SDK instance
	 *
	 * Lazily builds the instance on first call and caches it
	 * The SDK lives in components/external/freemius rather than the usual plugin root /freemius
	 * M Chart core (m-chart) is the free version so is_premium is false
	 * M Chart Pro (m-chart-pro) is a separate plugin sold under the same Freemius product via parallel activation
	 *
	 * @return Freemius the Freemius SDK instance for M Chart
	 */
	public function freemius() {
		if ( isset( $this->fs ) ) {
			return $this->fs;
		}

		require_once __DIR__ . '/external/freemius/start.php';

		$this->fs = fs_dynamic_init( $this->get_freemius_config() );

		$this->freemius_filters();

		do_action( 'm_chart_fs_loaded' );

		return $this->fs;
	}

	/**
	 * The Freemius SDK configuration for the free plugin
	 *
	 * The premium plugin shares the product id, keys and menu anchor, so it reads them from here rather than keeping a copy
	 *
	 * @return array arguments for fs_dynamic_init()
	 */
	public function get_freemius_config() {
		return [
			'id'                  => '30258',
			'slug'                => 'm-chart',
			'premium_slug'        => 'm-chart-pro',
			'type'                => 'plugin',
			'public_key'          => 'pk_b1eafc082abd31243874041aaaaab',
			'is_premium'          => false,
			'has_premium_version' => true,
			'has_addons'          => false,
			'has_paid_plans'      => true,
			'is_org_compliant'    => true,
			'parallel_activation' => [
				'enabled'                  => true,
				'premium_version_basename' => 'm-chart-pro/m-chart-pro.php',
			],
			'menu'                => [
				// Anchor on the Charts CPT itself so the Freemius pages are plugin-level (m-chart-account, m-chart-pricing)
				// The CPT slug contains ".php?" so get_slug() falls back to the m-chart affix rather than an m-chart-settings- prefix
				'slug'    => 'edit.php?post_type=m-chart',
				// Surface the Freemius Account page as a submenu link under the Charts menu
				'account' => true,
				'contact' => false,
				'support' => false,
			],
		];
	}

	/**
	 * Register Freemius filters that brand the pricing and opt-in screens
	 *
	 * pricing/css_path points Freemius at our stylesheet which is enqueued on the pricing page after its own CSS
	 * pricing/show_annual_in_monthly shows the real annual price rather than the monthly equivalent of the annual plan
	 *
	 * The css_path and plugin_icon paths run through Freemius's fs_asset_url which maps a path to a URL by stripping WP_PLUGIN_DIR
	 * __DIR__ resolves to the plugin's real path which differs from WP_PLUGIN_DIR when the plugin is symlinked
	 * plugin_basename normalizes it back to the plugins-dir-relative path so the URL resolves in every install
	 *
	 * The opt-in / connect screen has no css_path filter so we inline our stylesheet on the connect/before action instead
	 * It prints after Freemius's own connect.css so equal-specificity overrides win on source order
	 */
	private function freemius_filters() {
		$this->fs->add_filter( 'pricing/css_path', function () {
			return WP_PLUGIN_DIR . '/' . plugin_basename( __DIR__ . '/css/m-chart-freemius-pricing.css' );
		} );

		// Re-point the pricing page contact links at M Chart's own support/contact pages
		// Freemius wraps the pricing output in this filter so the inline script is scoped to that screen
		$this->fs->add_filter( 'templates/pricing.php', function ( $html ) {
			$script_path = __DIR__ . '/js/m-chart-freemius-pricing.js';

			if ( ! file_exists( $script_path ) ) {
				return $html;
			}

			return $html
				. "<script id=\"m-chart-freemius-pricing\">\n"
				. file_get_contents( $script_path ) // phpcs:ignore WordPress.WP.AlternativeFunctions.file_get_contents_file_get_contents -- local plugin asset
				. "</script>\n";
		} );

		$this->fs->add_filter( 'plugin_icon', function () {
			return WP_PLUGIN_DIR . '/' . plugin_basename( __DIR__ . '/images/m-chart-logo-square-rounded.svg' );
		} );

		$this->fs->add_filter( 'pricing/show_annual_in_monthly', '__return_false' );

		$this->fs->add_action( 'connect/before', function () {
			$css_path = __DIR__ . '/css/m-chart-freemius-connect.css';

			if ( ! file_exists( $css_path ) ) {
				return;
			}

			echo "<style id=\"m-chart-freemius-connect\">\n";
			echo file_get_contents( $css_path ); // phpcs:ignore WordPress.WP.AlternativeFunctions.file_get_contents_file_get_contents -- local plugin asset
			echo "</style>\n";
		} );

		// Swap Freemius's casual interjection headings for professional wording
		// These are admin-notice titles keyed by id and the trailing "!" / "..." is appended by the SDK so it carries over
		// Values are left unescaped since Freemius escapes them at the output site
		// Deferred to init since freemius() runs at construct and the __() calls would load the text domain before WordPress is ready
		add_action( 'init', function () {
			fs_override_i18n( [
				'yee-haw'  => __( 'Success', 'm-chart' ),
				'woot'     => __( 'Success', 'm-chart' ),
				'right-on' => __( 'Success', 'm-chart' ),
				'oops'     => __( 'Error', 'm-chart' ),
				'hmm'      => __( 'Heads up', 'm-chart' ),
				'hey'      => __( 'Hello', 'm-chart' ),
			], $this->slug );
		} );
	}

	/**
	 * Admin object accessor
	 */
	public function admin() {
		if ( ! $this->admin ) {
			require_once __DIR__ . '/class-m-chart-admin.php';
			$this->admin = new M_Chart_Admin();
		}

		return $this->admin;
	}
	
	/**
	 * Block object accessor
	 */
	public function block() {
		if ( ! $this->block ) {
			require_once __DIR__ . '/class-m-chart-block.php';
			$this->block = new M_Chart_Block();
		}

		return $this->block;
	}

	/**
	 * Library object accessor
	 */
	public function library( $library = false ) {
		if ( ! $library ) {
			$library = $this->get_library();
		}

		return apply_filters( 'm_chart_library_class', $this->library_class, $library );
	}

	/**
	 * Parse object accessor
	 */
	public function parse() {
		if ( ! $this->parse ) {
			require_once __DIR__ . '/class-m-chart-parsed-data-point.php';
			require_once __DIR__ . '/class-m-chart-parse.php';
			$this->parse = new M_Chart_Parse();
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
			[ $this->slug ],
			[
				'hierarchical' => true,
				'labels'       => [
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
				],
				'show_ui'   => true,
				'query_var' => true,
				'rewrite'   => [
					'slug' => $this->slug . '-units',
				],
			]
		);

		// Register the library taxonomy
		register_taxonomy(
			$this->slug . '-library',
			[ $this->slug ],
			[
				'hierarchical' => false,
				'show_ui'      => false,
				'query_var'    => true,
				'rewrite'      => [
					'slug' => $this->slug . '-library',
				],
			]
		);

		// Register the charts custom post type
		register_post_type(
			$this->slug,
			[
				'labels' => [
					'name'               => esc_html__( 'Charts', 'm-chart' ),
					// Top-level admin menu label defaults to 'name' so we set it explicitly to brand the menu as M Chart
					'menu_name'          => esc_html__( 'M Chart', 'm-chart' ),
					// First submenu item label defaults to menu_name so we set it back to Charts (parent reads M Chart, list reads Charts)
					'all_items'          => esc_html__( 'Charts', 'm-chart' ),
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
				],
				'register_meta_box_cb' => is_admin() ? [ $this->admin(), 'meta_boxes' ] : null,
				'public'               => true,
				'show_in_rest'         => true,
				'hierarchical'         => false,
				'exclude_from_search'  => false,
				'menu_position'        => 9,
				'menu_icon'            => 'data:image/svg+xml;base64,' . $this->logo,
				'query_var'            => true,
				'can_export'           => true,
				'has_archive'          => 'charts',
				'description'          => esc_html__( 'Manage data sets and display them as charts in WordPress.', 'm-chart' ),
				'rewrite'              => [
					'slug' => 'chart',
				],
				'supports' => [
					'author',
					'title',
					'excerpt',
					'comments',
				],
				'taxonomies' => [
					'category',
					'post_tag',
					$this->slug . '-units',
				],
			]
		);

		// Register the graphing library scripts
		wp_register_script(
			'chartjs',
			$this->plugin_url . '/components/external/chartjs/chart.js',
			[],
			$this->version
		);

		wp_register_script(
			'chartjs-helper',
			$this->plugin_url . '/components/js/m-chart-chartjs-helper.min.js',
			[ 'chartjs' ],
			$this->version
		);

		wp_register_script(
			'chartjs-datalabels',
			$this->plugin_url . '/components/external/chartjs/chartjs-plugin-datalabels.js',
			[ 'chartjs' ],
			$this->version
		);

		wp_register_script(
			'chartjs-treemap',
			$this->plugin_url . '/components/external/chartjs/chartjs-chart-treemap.min.js',
			[ 'chartjs' ],
			$this->version
		);

		wp_register_script(
			'chartjs-boxplot',
			$this->plugin_url . '/components/external/chartjs/chartjs-chart-boxplot.min.js',
			[ 'chartjs' ],
			$this->version
		);

		// The venn UMD build reads the global Chart at load time so the chartjs dependency is required
		wp_register_script(
			'chartjs-venn',
			$this->plugin_url . '/components/external/chartjs/chartjs-chart-venn.min.js',
			[ 'chartjs' ],
			$this->version
		);

		// Add endpoint needed for iframe embed support
		add_rewrite_endpoint( 'embed', EP_PERMALINK );

		// Check if we need to run any upgrades
		$current_version = get_site_option( 'm_chart_version' );

		if ( version_compare( $current_version, '1.7', 'lt' ) ) {
			$this->upgrade_to_1_7();
		}

		if ( version_compare( $current_version, '1.7.4', 'lt' ) ) {
			$this->upgrade_to_1_7_4();
		}
	}

	/**
	 * Do plugins loaded stuff
	 */
	public function plugins_loaded() {
		load_plugin_textdomain( 'm-chart', false, plugin_basename( dirname( __FILE__ ) ) . '/languages/' );
	}

	/**
	 * Return the plugin URL built from the home/admin URL rather than plugins_url() alone
	 *
	 * Exists because WP VIP's CDN rewrote plugin URLs in a way that broke embedded SVG handling (e.g. watermarks)
	 * Building the URL from the current host circumvents that
	 *
	 * @param string $path optional additional path to append (e.g. components)
	 *
	 * @return string URL to the plugin directory with path if parameter was passed
	 */
	public function plugin_url( $path = '' ) {
		if ( is_admin() ) {
			$url_base = parse_url( admin_url() );
		} else {
			$url_base = parse_url( home_url() );
		}

		$url_path = parse_url( plugins_url( $path, __DIR__ ) );

		// Honor a non-standard port if the base URL has one
		$port = '';

		if ( isset( $url_base['port'] ) && 80 != $url_base['port'] ) {
			$port = ':' . $url_base['port'];
		}

		$scheme = $url_base['scheme'] ?? 'https';
		$host   = $url_base['host']   ?? '';
		$path   = $url_path['path']   ?? '';
		$query  = $url_path['query']  ?? '';

		return $scheme . '://' . $host . $port . preg_replace( '#/$#', '', $path ) . ( '' === $query ? '' : '?' . $query );
	}

	/**
	 * Get chart post meta
	 *
	 * @param int $post_id WP post ID of the post you want post meta from
	 * @param string $field optional field to be returned instead of all post meta
	 *
	 * @return array $post_meta the meta for a given post ID
	 */
	public function get_post_meta( $post_id, $field = false ) {
		$raw_post_meta = get_post_meta( $post_id, $this->slug, true );

		$post_meta = $raw_post_meta;

		$defaults = $this->chart_meta_fields;

		// Make sure the correct library is set in the default chart meta fields
		if ( ! $post_meta ) {
			// get_current_screen() is only defined in admin context
			// This guards the call so REST and front-end contexts don't fatal
			$current_screen = is_admin() && function_exists( 'get_current_screen' )
				? get_current_screen()
				: null;

			// When adding a new chart with a library specified in the query string, use that library
			if (
				   is_admin()
				&& null != $current_screen
				&& 'post' == $current_screen->base
				&& 'add' == $current_screen->action
				&& isset( $_GET['library'] )
				&& $this->is_valid_library( $_GET['library'] )
			) {
				$defaults['library'] = $_GET['library'];
			} else {
				$defaults['library'] = $this->get_library();
			}
		}

		// Default chart height comes from the plugin settings so new charts honor the site default
		// Saved charts already have a height so wp_parse_args leaves theirs alone
		$defaults['height'] = (int) $this->get_settings( 'default_height' );

		$post_meta = wp_parse_args( $post_meta, $defaults );

		// Theme default is based off of an option so we'll handle that here
		if ( ! isset( $post_meta['theme'] ) ) {
			$settings           = $this->get_settings();
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

		$post_meta = $this->normalize_legacy_data( $post_meta );

		// If there's no set_names value set we'll set it to an empty array
		if ( ! isset( $post_meta['set_names'] ) ) {
			$post_meta['set_names'] = [];
		}

		$post_meta = apply_filters( 'm_chart_get_post_meta', $post_meta, $raw_post_meta, $post_id );

		if ( $field && isset( $post_meta[ $field ] ) ) {
			return $post_meta[ $field ];
		} elseif ( $field ) {
			return null;
		}

		return $post_meta;
	}

	/**
	 * Update the post meta and set unit terms if appropriate
	 *
	 * @param int $post_id WP post ID of the post you want to attach post meta to
	 * @param array $meta an array of the post meta you want to attach to the post
	 */
	public function update_post_meta( $post_id, $meta ) {
		// Make sure the meta is formatted correctly and validated
		$parsed_meta = $this->validate_post_meta( $meta );

		// Set unit terms
		$terms = [];

		if ( '' != $parsed_meta['y_units'] ) {
			$terms[] = $parsed_meta['y_units'];
		}

		if ( '' != $parsed_meta['x_units'] ) {
			$terms[] = $parsed_meta['x_units'];
		}

		wp_set_object_terms( $post_id, $terms, $this->slug . '-units' );

		// Set library as a post_tag
		wp_set_object_terms( $post_id, $parsed_meta['library'], $this->slug . '-library' );

		// Save meta to the post
		update_post_meta( $post_id, $this->slug, $parsed_meta );
		do_action( 'm_chart_update_post_meta', $post_id, $parsed_meta, $meta );
	}

	/**
	 * Parses a $meta array and returns a cleaned and validated array
	 *
	 * @param array  $meta    an array of the post meta you want to attach to the post
	 * @param string $context 'save' when the result is about to be stored, 'preview' when it only feeds the admin preview
	 *
	 * @return array of cleaned/validated post meta
	 */
	public function validate_post_meta( $meta, $context = 'save' ) {
		// Need to set checkboxes before checking or they can't be deselected
		$chart_meta['labels']             = false;
		$chart_meta['y_min']              = false;
		$chart_meta['legend']             = false;
		$chart_meta['data_point_colors']  = false;
		$chart_meta['mean_point']         = false;
		$chart_meta['sample_points']      = false;
		$chart_meta['constrain_y_axis']   = false;
		$chart_meta['include_source']     = false;

		// Filter values so we know the data is clean
		foreach ( $this->chart_meta_fields as $field => $default ) {
			if ( isset( $meta[ $field ] ) ) {
				if ( 'source_url' == $field && '' != $meta[ $field ] ) {
					$chart_meta[ $field ] = esc_url_raw( $meta[ $field ] );
				} elseif ( 'data' == $field ) {
					$data = $meta[ $field ];

					// Accept the stored shape (data => [ 'sets' => [...] ]) as well as a plain list of sheets
					// or the JSON string the spreadsheet textarea submits
					if ( is_array( $data ) && array_key_exists( 'sets', $data ) ) {
						$data = $data['sets'];
					}

					$chart_meta[ $field ]['sets'] = $data;
				} elseif ( 'set_names' == $field ) {
					$chart_meta[ $field ] = array_values( $meta[ $field ] );
				} elseif ( in_array( $field, [ 'labels', 'y_min', 'legend', 'data_point_colors', 'mean_point', 'sample_points', 'constrain_y_axis', 'include_source' ] ) ) {
					$chart_meta[ $field ] = (bool) $meta[ $field ];
				} elseif ( 'height' == $field ) {
					$chart_meta[ $field ] = self::clamp_height( $meta[ $field ] );
				} elseif ( 'y_min_value' == $field ) {
					$chart_meta[ $field ] = floatval( $meta[ $field ] );
				} else {
					$chart_meta[ $field ] = wp_filter_nohtml_kses( $meta[ $field ] );
				}
			} elseif ( ! isset( $chart_meta[ $field ] ) ) {
				// Fall back on the default value if there wasn't one in the given meta
				// Height honors the default_height setting so the save path agrees with get_post_meta()
				if ( 'height' === $field ) {
					$chart_meta[ $field ] = (int) $this->get_settings( 'default_height' );
				} else {
					$chart_meta[ $field ] = $default;
				}
			}
		}

		// Theme isn't included in chart_meta_fields so it's validated here
		if ( isset( $meta['theme'] ) && preg_match( '#^[a-zA-Z0-9-_]+$#', $meta['theme'] ) ) {
			$chart_meta['theme'] = $meta['theme'];
		}

		// If the data value is not an array we assume it is JSON encoded (i.e. from Jspreadsheet CE)
		if ( ! is_array( $chart_meta['data']['sets'] ) && '' != $chart_meta['data']['sets'] ) {
			$decoded = json_decode( stripslashes( $chart_meta['data']['sets'] ) );
			$chart_meta['data']['sets'] = is_array( $decoded ) ? $decoded : [];
		}

		// Validate the data array
		// validate_data() returns plain text, the rest of this array is slashed for update_post_meta() so match it
		foreach ( $chart_meta['data']['sets'] as $key => $data ) {
			$chart_meta['data']['sets'][ $key ] = wp_slash( $this->validate_data( $data ) );
		}

		// Allow plugins to validate their own custom meta
		// $context tells them whether this is a real save or the admin preview
		$chart_meta = apply_filters( 'm_chart_validate_post_meta', $chart_meta, $meta, $context );

		return $chart_meta;
	}

	/**
	 * Strips tags from every cell of a raw (unslashed) data array
	 *
	 * Cells are text, not HTML, so entities kses normalises on the way through are decoded again
	 * Otherwise a cell like "A & B" would come back as "A &amp; B" in the spreadsheet and on the canvas
	 * The result is plain text too, callers that store it are responsible for slashing it (see validate_post_meta())
	 *
	 * @param array $data an array of data as passed by the user
	 *
	 * @return array of validated data
	 */
	function validate_data( $data ) {
		if ( ! is_array( $data ) ) {
			return $this->validate_data_cell( $data );
		}

		foreach ( $data as $key => $value ) {
			if ( is_array( $value ) ) {
				$data[ $key ] = $this->validate_data( $value );
			} else {
				$data[ $key ] = $this->validate_data_cell( $value ?? '' );
			}
		}

		return $data;
	}

	/**
	 * Strip tags from a single spreadsheet cell while leaving its text intact
	 *
	 * wp_kses() is used directly rather than wp_filter_nohtml_kses(), which expects slashed input
	 * and would eat a backslash the user typed ("C:\temp") and hand back quotes with backslashes in front
	 *
	 * @param mixed $value a single cell value
	 *
	 * @return string the cleaned cell
	 */
	private function validate_data_cell( $value ) {
		return html_entity_decode( wp_kses( (string) $value, 'strip' ), ENT_QUOTES | ENT_HTML5, 'UTF-8' );
	}


	/**
	 * Hook to save_post action and save chart related post meta
	 *
	 * @param int $post_id WP post ID of the post
	 */
	public function save_post( $post_id ) {
		// save_post is hooked here because the admin class is lazy-loaded and wouldn't be instantiated in time to hook it itself
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
	public function get_chart( $post_id = null, $args = [] ) {
		if ( ! $post_id ) {
			$post_id = get_the_ID();
		}

		do_action( 'm_chart_get_chart_start', $post_id, $args );

		// Normalize historic usage of 'img' argument
		if ( isset( $args['img'] ) && 'yes' == $args['img'] ) {
			$args['show'] = 'image';
			unset( $args['img'] );
		}

		$args = wp_parse_args( $args, $this->get_chart_default_args );

		$library = $this->get_post_meta( $post_id, 'library' );

		// If it's not a valid library we don't proceed
		if ( ! $this->is_valid_library( $library ) ) {
			return;
		}

		// Make sure we instantiate the library so any library specific filters/setup get run
		$this->library( $library );

		// If they want the table of data we'll return that
		if ( 'table' == $args['show'] ) {
			return $this->build_table( $post_id );
		}

		// If they want the image version or the request is happening from a feed we return the image tag
		if ( 
			   'image' == $args['show']
			|| is_feed()
			|| $this->is_amp_endpoint()
			|| apply_filters( 'm_chart_show_image', false, $post_id, $args )
		) {
			$image = $this->get_chart_image( $post_id );

			// Default behavior is to return the full size image but with the width/height values halved
			// This should result in an image that looks nice on retina or better screens
			$image['width']  = $image['width'] / 2;
			$image['height'] = $image['height'] / 2;

			$image = apply_filters( 'm_chart_get_chart_image_tag', $image, $post_id, $args );

			$classes = $this->slug . ' ' . $this->slug . '-' . $post_id;

			if ( $this->is_amp_endpoint() ) {
				ob_start();
				?>
<figure class="m-chart-image-figure">
	<amp-img src="<?php echo esc_url( $image['url'] ); ?>"
		width="<?php echo absint( $image['width'] ); ?>" height="<?php echo absint( $image['height'] ); ?>"
		alt="<?php echo esc_attr( get_the_title( $post_id ) ); ?>"
		class="<?php echo esc_attr( $classes ); ?>"></amp-img>
	<?php if ( has_action( 'm_chart_screen_reader_text' ) ) : ?>
	<?php wp_enqueue_style( 'm-chart-frontend', $this->plugin_url . '/components/css/m-chart-frontend.css', [], $this->version ); ?>
	<div class="screen-reader-text">
		<?php do_action( 'm_chart_screen_reader_text', $post_id, $args ); ?>
	</div>
	<?php endif; ?>
</figure>
				<?php
				return ob_get_clean();
			} else {
				ob_start();
				?>
<figure class="m-chart-image-figure">
	<img src="<?php echo esc_url( $image['url'] ); ?>"
		width="<?php echo absint( $image['width'] ); ?>" height="<?php echo absint( $image['height'] ); ?>"
		alt="<?php echo esc_attr( get_the_title( $post_id ) ); ?>"
		class="<?php echo esc_attr( $classes ); ?>" />
	<?php if ( has_action( 'm_chart_screen_reader_text' ) ) : ?>
	<?php wp_enqueue_style( 'm-chart-frontend', $this->plugin_url . '/components/css/m-chart-frontend.css', [], $this->version ); ?>
	<div class="screen-reader-text">
		<?php do_action( 'm_chart_screen_reader_text', $post_id, $args ); ?>
	</div>
	<?php endif; ?>
</figure>
				<?php
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

		// A plugin can take over the rendering of a Chart.js chart entirely (e.g. show the data as a table)
		// in which case the library, its plugins and the inline script are all left out
		$post_meta    = $this->get_post_meta( $post_id );
		$uses_chartjs = $this->render_uses_chartjs( $post_id, $post_meta );

		// If we haven't enqueued the right library yet lets do it
		// Chart.js' helper and plugins are enqueued by the library class on m_chart_get_chart_begin
		if ( ( 'chartjs' !== $library || $uses_chartjs ) && ! wp_script_is( $library, 'enqueued' ) ) {
			wp_enqueue_script( $library );
		}

		// Ship the visually hidden rule the screen reader data table relies on
		// so it never depends on the active theme defining .screen-reader-text
		wp_enqueue_style( 'm-chart-frontend', $this->plugin_url . '/components/css/m-chart-frontend.css', [], $this->version );

		$template = __DIR__ . '/templates/' . $library . '-chart.php';

		// Locals for the template, the $this-> equivalents keep working for templates written against older versions
		$instance  = $this->instance;
		$is_iframe = $this->is_iframe;

		ob_start();
		do_action( 'm_chart_get_chart_begin', $post_id, $args, $uses_chartjs );
		require apply_filters( 'm_chart_chart_template', $template, $library, $post_id );
		do_action( 'm_chart_get_chart_end', $post_id, $args );
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
		$post      = get_post( $post_id );
		$post_meta = $this->get_post_meta( $post_id );
		$library   = m_chart()->get_post_meta( $post->ID, 'library' );

		$table = '';

		$multiple = count( $post_meta['data']['sets'] ) > 1 ? true : false;

		foreach ( $post_meta['data']['sets'] as $set => $data ) {
			$classes = $this->slug . '-table ' . $this->slug . '-table-' . $post_id . '-' . $set;

			m_chart()->parse()->parse_data( $data, $post_meta['parse_in'] );

			$template = __DIR__ . '/templates/table.php';

			ob_start();
			require apply_filters( 'm_chart_table_template', $template, $library, $post->ID );
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

		return [
			'url'    => $thumbnail[0],
			'file'   => basename( $thumbnail[0] ),
			'width'  => $thumbnail[1],
			'height' => $thumbnail[2],
			'name'   => get_the_title( $thumbnail_id ),
		];
	}

	/**
	 * Filter the m_chart_get_chart_image_tag hook and return a placeholder if appropriate
	 *
	 * @param array|bool an array of image values or false if no image could be found
	 * @param int $post_id WP post ID of the chart you want an image for
	 *
	 * @return array an array of image values url, width, height, etc...
	 */
	public function m_chart_get_chart_image_tag( $img, $post_id ) {
		if ( $img ) {
			return $img;
		}

		$url = $this->plugin_url . '/components/images/chart-placeholder.png';

		return [
			'url'    => $url,
			'file'   => basename( $url ),
			'width'  => 640,
			'height' => 480,
			'name'   => get_the_title( $post_id ),
		];
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
			return $content;
		}

		return $this->get_chart();
	}

	/**
	 * Hook to the m_chart_image_support filter and indicate that Chart.js supports images
	 *
	 * @param string $supports_images yes/no whether the library supports image generation
	 * @param string $library the library in question
	 *
	 * @return string yes/no whether the library supports images
	 */
	public function m_chart_image_support( $supports_images, $library ) {
		if ( $library != $this->chart_meta_fields['library'] ) {
			return $supports_images;
		}

		return 'yes';
	}

	/**
	 * Hook to the m_chart_library_class filter and return the library class if appropriate
	 *
	 * @param string $library_class the library class
	 * @param string $library the library in question
	 *
	 * @return class the library class for this library
	 */
	public function m_chart_library_class( $library_class, $library ) {
		// If Chart.js wasn't requested we'll stop here
		if ( $library != $this->chart_meta_fields['library'] ) {
			return $library_class;
		}

		if ( ! $this->library_class instanceof M_Chart_Chartjs ) {
			require_once __DIR__ . '/class-m-chart-chartjs.php';
			$this->library_class = new M_Chart_Chartjs();
		}

		return $this->library_class;
	}

	/**
	 * Return an iframe for a given chart
	 *
	 * @param int $post_id WP post ID of the chart you want
	 * @param array $args an array of args
	 *
	 * @return string HTML needed to display a chart via an iframe
	 */
	public function get_chart_iframe( $post_id, $args = [] ) {
		$post_meta = $this->get_post_meta( $post_id );

		$src_url = add_query_arg( $args, get_permalink( $post_id ) . 'embed/' );

		$defer_lazy = 'enabled' === $this->get_settings( 'defer_rendering' );

		ob_start();
		?>
<iframe id="<?php echo esc_attr( $this->get_container_id( $post_id ) ); ?>"
	class="m-chart-iframe" width="100%" height="<?php echo absint( $post_meta['height'] + 1 ); ?>"
	title="<?php echo esc_attr( get_the_title( $post_id ) ); ?>"
	src="<?php echo esc_url( $src_url ); ?>"<?php echo $defer_lazy ? ' loading="lazy"' : ''; ?>></iframe>
		<?php
		if ( 'show' == $args['share'] ) {
			unset( $args['share'] );
			require apply_filters( 'm_chart_share_template', __DIR__ . '/templates/share.php' );
		}
		$this->instance++;
		return ob_get_clean();
	}

	/**
	 * Return a chart via the [m-chart id="x"] short code
	 *
	 * Also registered under the legacy [chart] name for backwards compatibility
	 *
	 * @param array $args an array of arguments passed by the WP short code API
	 *
	 * @return string the chart requested in Javascript or HTML form
	 */
	public function chart_shortcode( $args ) {
		$default_args       = $this->get_chart_default_args;
		$default_args['id'] = '';

		$args = shortcode_atts( $default_args, $args );

		$post_id = $args['id'];
		unset( $args['id'] );

		// Did we get what looks like a chart ID?
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
	 * stripslashes() strips the backslash before \uXXXX sequences
	 * This re-escapes those sequences first so unicode survives the strip
	 *
	 * @param string $string a string that may have unicode characters as well as unnecessary escaping
	 *
	 * @return string a string with any unnecessary escaping removed
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
		$terms = get_terms( $this->slug . '-units', [ 'hide_empty' => false ] );

		if ( empty( $terms ) ) {
			$terms = $this->generate_unit_terms();
		}

		return $this->compile_unit_terms( $terms );
	}

	/**
	 * Helper function that compiles the chart unit terms for use
	 *
	 * @param array an array of unit terms
	 *
	 * @return array an array of compiled unit terms
	 */
	public function compile_unit_terms( $terms ) {
		$compiled_terms = [];
		$parents        = [];

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
		$default_terms = require __DIR__ . '/array-default-unit-terms.php';

		$terms = [];

		foreach ( $default_terms as $parent_term => $child_terms ) {
			$parent  = (object) wp_insert_term( $parent_term, $this->slug . '-units' );
			$terms[] = get_term( $parent->term_id, $this->slug . '-units' );

			foreach ( $child_terms as $child_term ) {
				$term    = (object) wp_insert_term( $child_term, $this->slug . '-units', [ 'parent' => $parent->term_id ] );
				$terms[] = get_term( $term->term_id, $this->slug . '-units' );
			}
		}

		return $terms;
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
				[ 'response' => 404 ]
			);
		}

		$settings = $this->get_settings();

		if ( 'enabled' != $settings['embeds'] ) {
			wp_die(
				esc_html__( 'Embeds of this type are not enabled', 'm-chart' ),
				esc_html__( 'Embeds disabled', 'm-chart' ),
				[ 'response' => 403 ]
			);
			exit;
		}

		$this->is_iframe = true;

		$library = $this->get_post_meta( $post->ID, 'library' );
		$scripts = [ 'jquery' ];

		// A chart a plugin renders without Chart.js doesn't need the library in the iframe either
		if ( 'chartjs' !== $library || $this->render_uses_chartjs( $post->ID ) ) {
			$scripts[] = $library;
		}

		unset( $_GET['action'], $_GET['share'] );

		// This prevents issues when embedding with outside sites
		header_remove( 'X-Frame-Options' );

		status_header( 200 );

		require __DIR__ . '/templates/iframe.php';
		exit;
	}

	/**
	 * Clamp a chart height to the supported range
	 *
	 * @param mixed $height a height in pixels, anything absint() can read
	 *
	 * @return int
	 */
	public static function clamp_height( $height ) {
		return min( self::HEIGHT_MAX, max( self::HEIGHT_MIN, absint( is_scalar( $height ) ? $height : 0 ) ) );
	}

	/**
	 * Change one setting the same way the settings page does
	 *
	 * The value is validated, the full settings array runs through m_chart_validated_settings, the option is written,
	 * the memoised settings are reset, rewrite rules are flushed if embeds toggled and m_chart_settings_saved fires
	 *
	 * @param string $key   the setting key, must exist in the (filtered) default settings
	 * @param mixed  $value the new value
	 *
	 * @return bool false when the key is unknown
	 */
	public function update_setting( $key, $value ) {
		$default_settings = apply_filters( 'm_chart_default_settings', $this->settings );

		if ( ! array_key_exists( $key, $default_settings ) ) {
			return false;
		}

		$previous  = $this->get_settings();
		$submitted = $previous;

		$submitted[ $key ] = $value;

		$validated         = $previous;
		$validated[ $key ] = $this->admin()->validate_setting( $key, $value, $default_settings[ $key ] );

		$this->store_settings( $validated, $submitted, $previous );

		return true;
	}

	/**
	 * Persist a validated settings array
	 *
	 * Shared by the settings page and update_setting()
	 *
	 * @param array $validated the validated settings
	 * @param array $submitted the settings as submitted, handed to the m_chart_validated_settings filter
	 * @param array $previous  the settings before this save
	 */
	public function store_settings( array $validated, array $submitted, array $previous ) {
		// Allow third party libraries to further validate the settings
		$validated = apply_filters( 'm_chart_validated_settings', $validated, $submitted );

		update_option( $this->slug, $validated );

		// Drop the memoized settings so anything later in this request sees the new values
		$this->reset_settings();

		// Only flush rewrite rules when the embed endpoint is actually being toggled
		if ( ( $previous['embeds'] ?? '' ) !== ( $validated['embeds'] ?? '' ) ) {
			flush_rewrite_rules();
		}

		do_action( 'm_chart_settings_saved', $this->get_settings(), $previous );
	}

	/**
	 * The usable sources of an @font-face descriptor passed through m_chart_iframe_fonts
	 *
	 * Only https URLs survive, formats are reduced to [a-z0-9-]
	 * iframe.php uses this both to build the font-src CSP allowlist and to render the rule, so the two can't disagree
	 *
	 * @param array $font a font descriptor with a src list of [ 'url' => ..., 'format' => ... ]
	 *
	 * @return array validated [ 'url' => ..., 'format' => ... ] entries
	 */
	public static function font_face_sources( array $font ) {
		$sources = [];

		foreach ( (array) ( $font['src'] ?? [] ) as $src ) {
			$url = esc_url( is_array( $src ) ? ( $src['url'] ?? '' ) : '', [ 'https' ] );

			if ( '' === $url ) {
				continue;
			}

			$sources[] = [
				'url'    => $url,
				'format' => preg_replace( '/[^a-z0-9-]/', '', strtolower( (string) ( $src['format'] ?? '' ) ) ),
			];
		}

		return $sources;
	}

	/**
	 * Render one @font-face rule from a descriptor, every slot allowlisted
	 *
	 * Descriptor keys: family (required), src (required, see font_face_sources()), weight, style, display, unicode_range
	 *
	 * @param array $font the font descriptor
	 *
	 * @return string a <style> element, or an empty string when the descriptor can't be used
	 */
	public static function render_font_face( array $font ) {
		$family = preg_replace( '/[^A-Za-z0-9 _-]/', '', (string) ( $font['family'] ?? '' ) );

		if ( '' === $family ) {
			return '';
		}

		$weight  = (string) ( $font['weight'] ?? '400' );
		$style   = (string) ( $font['style'] ?? 'normal' );
		$display = (string) ( $font['display'] ?? 'swap' );

		$weight  = preg_match( '/^[1-9]00$|^(normal|bold)$/', $weight ) ? $weight : '400';
		$style   = in_array( $style,   [ 'normal', 'italic', 'oblique' ],                    true ) ? $style   : 'normal';
		$display = in_array( $display, [ 'auto', 'block', 'swap', 'fallback', 'optional' ], true ) ? $display : 'swap';

		$srcs = [];

		foreach ( self::font_face_sources( $font ) as $src ) {
			$srcs[] = sprintf( "url('%s')%s", $src['url'], $src['format'] ? " format('{$src['format']}')" : '' );
		}

		if ( empty( $srcs ) ) {
			return '';
		}

		$unicode_range = '';

		if ( isset( $font['unicode_range'] ) && preg_match( '/^[U+0-9A-Fa-f?,\s-]+$/', (string) $font['unicode_range'] ) ) {
			$unicode_range = ' unicode-range: ' . trim( (string) $font['unicode_range'] ) . ';';
		}

		return sprintf(
			"<style>@font-face { font-family: '%s'; src: %s; font-weight: %s; font-style: %s; font-display: %s;%s }</style>\n",
			esc_html( $family ),
			implode( ', ', $srcs ),
			esc_html( $weight ),
			esc_html( $style ),
			esc_html( $display ),
			$unicode_range
		);
	}

	/**
	 * Bring the data value of older charts up to the current shape
	 *
	 * Current charts store data => [ 'sets' => [ sheet, sheet, ... ] ] where each sheet is an array of row arrays
	 * Charts from before multi sheet support stored the rows directly in data, and some very old ones stored
	 * a single sheet's rows directly in sets
	 *
	 * @param array $post_meta chart post meta as stored
	 *
	 * @return array the same meta with data in the current shape
	 */
	public function normalize_legacy_data( array $post_meta ) {
		// If the data has the old legacy format we need to update it
		if ( isset( $post_meta['data'] ) && ! isset( $post_meta['data']['sets'] ) ) {
			$data                        = $post_meta['data'];
			$post_meta['data']           = [];
			$post_meta['data']['sets'][] = $data;
		}

		// Some very old charts stored a single sheet's rows directly in the sets value
		if ( isset( $post_meta['data']['sets'] ) && is_array( $post_meta['data']['sets'] ) ) {
			$first_sheet = reset( $post_meta['data']['sets'] );

			if ( is_array( $first_sheet ) && [] !== $first_sheet && ! is_array( reset( $first_sheet ) ) ) {
				$post_meta['data'] = [ 'sets' => [ array_values( $post_meta['data']['sets'] ) ] ];
			}
		}

		return $post_meta;
	}

	/**
	 * The chart meta exactly as stored, with only the legacy data shape fixes applied
	 *
	 * Unlike get_post_meta() this fills in no defaults and runs no m_chart_get_post_meta filters, so plugins that
	 * mask or rewrite meta through that filter can still read the underlying row
	 *
	 * @param int $post_id WP post ID of the chart
	 *
	 * @return array|false the stored meta, or false when the post has none
	 */
	public function get_raw_post_meta( $post_id ) {
		$raw = get_post_meta( $post_id, $this->slug, true );

		if ( ! is_array( $raw ) ) {
			return false;
		}

		return $this->normalize_legacy_data( $raw );
	}

	/**
	 * Whether the current request is the admin preview building chart args from unsaved meta
	 *
	 * Set by the m_chart_get_chart_args AJAX handler, so plugins don't have to sniff $_REQUEST themselves
	 *
	 * @return bool
	 */
	public function is_preview_request() {
		return $this->is_preview_request;
	}

	/**
	 * Flag the current request as an admin preview
	 *
	 * @param bool $is_preview
	 */
	public function set_preview_request( $is_preview ) {
		$this->is_preview_request = (bool) $is_preview;
	}

	/**
	 * Whether a Chart.js chart is drawn by Chart.js on this render
	 *
	 * Plugins that replace the rendering of a chart (M Chart Pro's Display as Table) return false from
	 * m_chart_render_uses_chartjs so the library, its plugins and the inline script are left out
	 * Charts using another library always return false
	 *
	 * @param int        $post_id   WP post ID of the chart
	 * @param array|null $post_meta the chart's post meta, fetched when not given
	 *
	 * @return bool
	 */
	public function render_uses_chartjs( $post_id, $post_meta = null ) {
		if ( null === $post_meta ) {
			$post_meta = $this->get_post_meta( $post_id );
		}

		$default = isset( $post_meta['library'] ) && 'chartjs' === $post_meta['library'];

		return (bool) apply_filters( 'm_chart_render_uses_chartjs', $default, $post_id, $post_meta );
	}

	/**
	 * The id of the element that wraps one rendered chart
	 *
	 * @param int      $post_id  WP post ID of the chart
	 * @param int|null $instance which render of this chart on the page, defaults to the current instance counter
	 *
	 * @return string
	 */
	public function get_container_id( $post_id, $instance = null ) {
		if ( null === $instance ) {
			$instance = $this->instance;
		}

		return 'm-chart-container-' . absint( $post_id ) . '-' . absint( $instance );
	}

	/**
	 * The screen reader source attribution paragraph a chart template prints
	 *
	 * The visual source attribution is painted on the canvas by the helper plugin, which makes it invisible to AT and mouse only
	 * This is the operable version for keyboard and screen reader users and un-hides while the link has focus
	 *
	 * @param array $post_meta the chart's post meta
	 *
	 * @return string the markup, or an empty string when the chart doesn't show its source
	 */
	public function render_source_html( $post_meta ) {
		$source_name = trim( (string) ( $post_meta['source'] ?? '' ) );
		$source_url  = trim( (string) ( $post_meta['source_url'] ?? '' ) );

		if ( empty( $post_meta['include_source'] ) || '' === $source_name ) {
			return '';
		}

		$source = '' !== $source_url
			? '<a href="' . esc_url( $source_url ) . '">' . esc_html( $source_name ) . '</a>'
			: ' ' . esc_html( $source_name );

		return '<p class="m-chart-source screen-reader-text">' . esc_html__( 'Source:', 'm-chart' ) . ' ' . $source . '</p>';
	}

	/**
	 * Hook to the m_chart_update_post_meta action and call the required library specific function
	 *
	 * @param int $post_id WP post ID of the post you want chart args for
	 * @param array $parsed_meta the parsed chart meta passed by the action hook
	 */
	public function m_chart_update_post_meta( $post_id, $parsed_meta ) {
		$library = $this->library( $parsed_meta['library'] );

		// The chart's library plugin may be inactive (e.g. Highcharts charts after the
		// extension was removed) in which case there's no library object to notify
		if ( is_object( $library ) && method_exists( $library, 'm_chart_update_post_meta' ) ) {
			$library->m_chart_update_post_meta( $post_id, $parsed_meta );
		}

		// Flush after the library has had its turn so a library that still rebuilds the cache from the raw meta can't leave stale args behind
		$this->flush_chart_args_cache( $post_id );
	}

	/**
	 * The object cache key the chart args for a given chart live under
	 *
	 * @param int $post_id WP post ID of the chart
	 *
	 * @return string the cache key (use with the m-chart cache group)
	 */
	public function chart_args_cache_key( $post_id ) {
		return absint( $post_id ) . '-chart-args';
	}

	/**
	 * Drop the cached chart args for a chart so the next render rebuilds them
	 *
	 * Call this after changing anything that feeds into the chart args outside of a normal chart save
	 *
	 * @param int $post_id WP post ID of the chart
	 */
	public function flush_chart_args_cache( $post_id ) {
		wp_cache_delete( $this->chart_args_cache_key( $post_id ), $this->slug );
	}

	/**
	 * Hook to added/updated/deleted_post_meta and flush the chart args cache when the chart meta row changes
	 *
	 * @param int|array $meta_id the meta ID(s) that changed
	 * @param int $object_id the post the meta belongs to
	 * @param string $meta_key the meta key that changed
	 * @param mixed $meta_value the new meta value
	 */
	public function flush_chart_args_cache_on_meta_change( $meta_id, $object_id, $meta_key, $meta_value ) {
		if ( $this->slug !== $meta_key ) {
			return;
		}

		$this->flush_chart_args_cache( $object_id );
	}

	/**
	 * If the passed library is valid return TRUE otherwise FALSE
	 *
	 * @param string library string (i.e. 'highcharts')
	 *
	 * @return bool
	 */
	public function is_valid_library( $library ) {
		$libraries = $this->get_libraries();

		if ( ! isset( $libraries[ $library ] ) ) {
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
	 * Return the M Chart settings
	 *
	 * @return array current settings
	 */
	public function get_settings( $setting = false ) {
		// Memoize the resolved settings, get_post_meta() calls this on every invocation
		// and the option + filter pipeline doesn't need to re-run within a request
		// Invalidated via reset_settings() when the settings are saved
		if ( isset( $this->resolved_settings ) ) {
			$settings = $this->resolved_settings;
		} else {
			// Allow third party libraries to modify the default settings
			$default_settings = apply_filters( 'm_chart_default_settings', $this->settings );

			$settings = (array) get_option( $this->slug, $default_settings );
			$settings = wp_parse_args( $settings, $default_settings );

			// The No Instant Preview performance option was folded into No Images in 2.4
			if ( 'no-preview' === $settings['performance'] ) {
				$settings['performance'] = 'no-images';
			}

			// Make sure the set library is still valid
			if ( ! $this->is_valid_library( $settings['library'] ) ) {
				$settings['library'] = 'chartjs';
			}

			$settings = apply_filters( 'm_chart_get_settings', $settings );

			$this->resolved_settings = $settings;
		}

		if ( $setting && isset( $settings[ $setting ] ) ) {
			return $settings[ $setting ];
		} elseif ( $setting ) {
			return null;
		}

		return $settings;
	}

	/**
	 * Drop the memoized settings so the next get_settings() call re-resolves them
	 *
	 * Called after the settings option is updated
	 */
	public function reset_settings() {
		$this->resolved_settings = null;
	}

	/**
	 * Return an array of available charting libraries
	 *
	 * @return array available chart libraries keyed by slug
	 */
	public function get_libraries() {
		return apply_filters( 'm_chart_get_libraries', $this->libraries );
	}

	/**
	 * Return the chart types that support multiple data sets (multi-sheet tab bar)
	 *
	 * This is the single authoritative source for this list
	 * The value is passed to window.m_chart_admin.multi_sheet_types so the React UI always stays in sync with PHP
	 * Filtered via 'm_chart_multi_sheet_types' so library plugins can add or remove types
	 *
	 * @return array
	 */
	public function get_multi_sheet_types() {
		return apply_filters( 'm_chart_multi_sheet_types', [
			'scatter',
			'bubble',
			'radar',
			'radar-area',
			'boxplot',
			'violin',
		] );
	}

	/**
	 * Return the current library
	 *
	 * @return string current library
	 */
	public function get_library() {
		if ( isset( $_GET['library'] ) && $this->is_valid_library( $_GET['library'] ) ) {
			return $_GET['library'];
		}

		return $this->get_settings( 'library' );
	}

	/**
	 * Return the locale array
	 *
	 * When PHP's Intl extension is available, labels are generated in each locale's native language using Locale::getDisplayName()
	 * Falls back to the English labels in array-locale-codes.php otherwise
	 *
	 * @return array locales as used by Intl.NumberFormat
	 */
	public function get_locales() {
		$locales = require __DIR__ . '/array-locale-codes.php';

		if ( ! class_exists( 'Locale' ) ) {
			return $locales;
		}

		foreach ( $locales as $code => $english_label ) {
			$native = Locale::getDisplayName( $code, $code );
			
			if ( $native ) {
				$locales[ $code ] = esc_html( $native );
			}
		}

		return $locales;
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

	/**
	 * Do things needed for version 1.7
	 */
	public function upgrade_to_1_7() {
		// Get all charts
		$charts = get_posts(
			[
				'post_type'      => m_chart()->slug,
				'posts_per_page' => -1,
				'post_status'    => 'any',
				'tax_query'      => [
					[
						'taxonomy' => 'post_tag',
						'field'    => 'slug',
						'terms'    => 'highcharts',
						'operator' => 'NOT IN',
					],
				],
			]
		);

		// Add highcharts post_tag to all charts
		foreach ( $charts as $chart ) {
			wp_set_object_terms( $chart->ID, 'highcharts', 'post_tag' );
		}

		// Update version
		update_site_option( 'm_chart_version', '1.7' );
	}

	/**
	 * Do things needed for version 1.7.4
	 */
	public function upgrade_to_1_7_4() {
		// Get all charts tagged with highcharts
		$highcharts_charts = get_posts(
			[
				'post_type'      => m_chart()->slug,
				'posts_per_page' => -1,
				'post_status'    => 'any',
				'tax_query'      => [
					[
						'taxonomy' => 'post_tag',
						'field'    => 'slug',
						'terms'    => 'highcharts',
						'operator' => 'IN',
					],
				],
			]
		);

		foreach ( $highcharts_charts as $chart ) {
			// Add highcharts as a term to the m-chart-library taxonomy
			wp_set_object_terms( $chart->ID, 'highcharts', m_chart()->slug . '-library' );
			// Remove highcharts as a term from the post_tag taxonomy
			wp_remove_object_terms( $chart->ID, 'highcharts', 'post_tag' );
		}

		// Get all charts tagged with chartjs
		$chartjs_charts = get_posts(
			[
				'post_type'      => m_chart()->slug,
				'posts_per_page' => -1,
				'post_status'    => 'any',
				'tax_query'      => [
					[
						'taxonomy' => 'post_tag',
						'field'    => 'slug',
						'terms'    => 'chartjs',
						'operator' => 'IN',
					],
				],
			]
		);

		foreach ( $chartjs_charts as $chart ) {
			// Add chartjs as a term to the m-chart-library taxonomy
			wp_set_object_terms( $chart->ID, 'chartjs', m_chart()->slug . '-library' );
			// Remove chartjs as a term from the post_tag taxonomy
			wp_remove_object_terms( $chart->ID, 'chartjs', 'post_tag' );
		}

		// Update version
		update_site_option( 'm_chart_version', '1.7.4' );
	}
}

/**
 * Plugin object accessor
 */
function m_chart() {
	global $m_chart;

	if ( ! $m_chart instanceof M_Chart ) {
		$m_chart = new M_Chart();
	}

	return $m_chart;
}

/**
 * Freemius SDK accessor
 *
 * Thin global wrapper that delegates to the core class so Freemius ecosystem code and conventions keep working
 * The actual configuration lives in M_Chart::freemius()
 *
 * @return Freemius the Freemius SDK instance for M Chart
 */
function m_chart_fs() {
	return m_chart()->freemius();
}
