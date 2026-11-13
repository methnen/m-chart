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

	// The chart text fields that hold free text someone typed, stored HTML encoded (see encode_text())
	// The other string fields (library, type, parse_in, units) are identifiers
	const TEXT_FIELDS = [ 'subtitle', 'x_title', 'y_title', 'source' ];

	// Stamped on a chart's meta when its sheet cells are stored exactly as typed (2.4 on)
	// A row without it may hold HTML entities in its cells, which get_post_meta() decodes for Chart.js charts
	const TEXT_FORMAT = 2;

	public $version           = '2.4.1';
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
		add_filter( 'is_protected_meta', [ $this, 'is_protected_meta' ], 10, 3 );

		// Lives here rather than in the admin class, which isn't loaded when a chart is deleted over REST
		add_action( 'before_delete_post', [ $this, 'before_delete_post' ] );

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
		$this->register_taxonomies();

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
	 * Runs on plugin activation
	 * Seeds the default chart units so they exist before any charts are imported or edited
	 */
	public function activate() {
		// The activation request loads the plugin after init has fired so the taxonomies aren't registered yet
		$this->register_taxonomies();
		$this->generate_unit_terms();
	}

	/**
	 * Registers the units and library taxonomies
	 */
	public function register_taxonomies() {
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

		// Anything but an array isn't chart meta, wp_parse_args() would otherwise read a stored string as a query string
		$post_meta = is_array( $raw_post_meta ) ? $raw_post_meta : [];

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

		$post_meta = $this->harden_post_meta( $post_meta );
		$post_meta = $this->normalize_legacy_data( $post_meta );

		// Cells saved before they were stored as typed can hold HTML entities
		if ( empty( $post_meta['text_format'] ) && $this->library_paints_plain_text( $post_meta['library'] ) ) {
			$post_meta = $this->decode_legacy_cells( $post_meta );
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
	 * Make a stored meta row safe to use whatever wrote it
	 *
	 * validate_post_meta() only runs on this plugin's own save
	 * An import, another plugin or a direct database write can leave any shape of value in the row,
	 * so the types the rest of the plugin relies on are enforced again on the way out
	 * Text is never altered here, only values of the wrong type are replaced
	 *
	 * @param array $post_meta the stored meta with defaults filled in
	 *
	 * @return array
	 */
	private function harden_post_meta( array $post_meta ) {
		// These are used as strings everywhere
		foreach ( [ 'library', 'type', 'parse_in', 'subtitle', 'y_title', 'y_units', 'x_title', 'x_units', 'source', 'source_url', 'theme' ] as $field ) {
			if ( isset( $post_meta[ $field ] ) && ! is_scalar( $post_meta[ $field ] ) ) {
				$post_meta[ $field ] = $this->chart_meta_fields[ $field ] ?? $this->get_settings( 'default_theme' );
			}
		}

		// The source link is opened in the browser, so it gets the same check the save applies
		// esc_url_raw() drops javascript: and the other schemes WordPress doesn't allow and leaves a normal address untouched
		if ( '' !== (string) $post_meta['source_url'] ) {
			$post_meta['source_url'] = esc_url_raw( (string) $post_meta['source_url'] );
		}

		// One name per sheet, each a string
		if ( ! isset( $post_meta['set_names'] ) || ! is_array( $post_meta['set_names'] ) ) {
			$post_meta['set_names'] = [];
		}

		foreach ( $post_meta['set_names'] as $key => $set_name ) {
			$post_meta['set_names'][ $key ] = is_scalar( $set_name ) ? (string) $set_name : '';
		}

		// The sheets are a list of rows of cells
		if ( ! is_array( $post_meta['data'] ?? null ) ) {
			$post_meta['data'] = [];
		}

		if ( isset( $post_meta['data']['sets'] ) ) {
			if ( ! is_array( $post_meta['data']['sets'] ) ) {
				$post_meta['data']['sets'] = [];
			}

			foreach ( $post_meta['data']['sets'] as $key => $sheet ) {
				if ( ! is_array( $sheet ) ) {
					$post_meta['data']['sets'][ $key ] = [];
				}
			}
		}

		return $post_meta;
	}

	/**
	 * Hook: is_protected_meta, keep the chart meta out of generic meta editors
	 *
	 * The key has no leading underscore, so without this anyone who can edit a chart could write the row through
	 * WordPress' own custom field handling (post.php, the add-meta AJAX action, XML-RPC) and skip validate_post_meta()
	 * This plugin's own update_post_meta() calls are unaffected
	 *
	 * @param bool   $protected whether the key is protected
	 * @param string $meta_key  the meta key
	 * @param string $meta_type the object type the meta belongs to
	 *
	 * @return bool
	 */
	public function is_protected_meta( $protected, $meta_key, $meta_type ) {
		if ( 'post' !== $meta_type ) {
			return $protected;
		}

		return in_array( $meta_key, [ $this->slug, $this->slug . '-image' ], true ) ? true : $protected;
	}

	/**
	 * Hook: before_delete_post, remove the generated image of a chart that is being deleted
	 *
	 * WordPress only detaches attachments from a deleted post, so the image would stay in the media library for good
	 *
	 * @param int $post_id WP post ID of the post being deleted
	 */
	public function before_delete_post( $post_id ) {
		if ( $this->slug !== get_post_type( $post_id ) ) {
			return;
		}

		foreach ( $this->get_chart_image_attachments( $post_id ) as $attachment_id ) {
			wp_delete_attachment( $attachment_id, true );
		}
	}

	/**
	 * IDs of the image attachments this plugin generated for a chart
	 *
	 * @param int $post_id WP post ID of the chart
	 *
	 * @return int[]
	 */
	public function get_chart_image_attachments( $post_id ) {
		return get_posts(
			[
				'post_type'      => 'attachment',
				'post_status'    => 'any',
				'posts_per_page' => -1,
				'fields'         => 'ids',
				'post_parent'    => $post_id,
				'meta_key'       => $this->slug . '-image',
			]
		);
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

		// Chart.js paints every string as plain text, so its charts keep text exactly as typed
		// Any other library is assumed to treat strings as HTML and keeps the tag stripping
		$library = is_array( $meta ) && is_string( $meta['library'] ?? null ) && $this->is_valid_library( $meta['library'] )
			? $meta['library']
			: $this->chart_meta_fields['library'];

		$plain = $this->library_paints_plain_text( $library );

		// Filter values so we know the data is clean
		foreach ( $this->chart_meta_fields as $field => $default ) {
			if ( isset( $meta[ $field ] ) ) {
				if ( in_array( $field, [ 'library', 'type', 'parse_in', 'subtitle', 'y_title', 'y_units', 'x_title', 'x_units', 'source', 'source_url' ], true ) && ! is_scalar( $meta[ $field ] ) ) {
					// A text field sent as an array is not a value, the default stands in for it
					$chart_meta[ $field ] = $default;
				} elseif ( 'source_url' == $field && '' != $meta[ $field ] ) {
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
					// One name per sheet, anything that isn't a string becomes an empty name
					$chart_meta[ $field ] = array_map(
						static fn( $set_name ) => is_scalar( $set_name ) ? (string) $set_name : '',
						is_array( $meta[ $field ] ) ? array_values( $meta[ $field ] ) : []
					);
				} elseif ( in_array( $field, [ 'labels', 'shared', 'y_min', 'legend', 'data_point_colors', 'mean_point', 'sample_points', 'constrain_y_axis', 'include_source' ] ) ) {
					$chart_meta[ $field ] = (bool) $meta[ $field ];
				} elseif ( $plain && in_array( $field, self::TEXT_FIELDS, true ) ) {
					// Stored HTML encoded as it always has been, but nothing is stripped, so decode_text() gives back exactly what was typed
					// Slashed in and slashed out like the other fields
					$chart_meta[ $field ] = wp_slash( self::encode_text( self::plain_text( wp_unslash( (string) $meta[ $field ] ) ) ) );
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
		if ( isset( $meta['theme'] ) && is_string( $meta['theme'] ) && preg_match( '#^[a-zA-Z0-9-_]+$#D', $meta['theme'] ) ) {
			$chart_meta['theme'] = $meta['theme'];
		}

		// A caller that passes no sheet data at all still gets the stored shape back
		if ( ! is_array( $chart_meta['data'] ) || ! isset( $chart_meta['data']['sets'] ) ) {
			$chart_meta['data'] = [ 'sets' => [] ];
		}

		// If the data value is not an array we assume it is JSON encoded (i.e. from Jspreadsheet CE)
		if ( ! is_array( $chart_meta['data']['sets'] ) ) {
			$decoded = is_string( $chart_meta['data']['sets'] ) && '' !== $chart_meta['data']['sets']
				? json_decode( stripslashes( $chart_meta['data']['sets'] ) )
				: null;

			$chart_meta['data']['sets'] = is_array( $decoded ) ? $decoded : [];
		}

		// Validate the data array
		// validate_data() returns plain text, the rest of this array is slashed for update_post_meta() so match it
		foreach ( $chart_meta['data']['sets'] as $key => $data ) {
			$chart_meta['data']['sets'][ $key ] = wp_slash( $this->validate_data( $data, $library ) );
		}

		// Never taken from the request: this says how the cells above were just stored
		$chart_meta['text_format'] = self::TEXT_FORMAT;

		// Allow plugins to validate their own custom meta
		// $context tells them whether this is a real save or the admin preview
		$chart_meta = apply_filters( 'm_chart_validate_post_meta', $chart_meta, $meta, $context );

		return $chart_meta;
	}

	/**
	 * Cleans every cell of a raw (unslashed) data array
	 *
	 * For a library that paints plain text (Chart.js) a cell is kept exactly as typed
	 * Every place a cell is printed escapes it for where it is going, so nothing typed can turn into markup,
	 * and "x < y > z" or "<5%" is data like any other
	 *
	 * For any other library, and when no library is given, tags are stripped as they always were
	 * Cells are text, not HTML, so entities kses normalises on the way through are decoded again
	 * Otherwise a cell like "A & B" would come back as "A &amp; B" in the spreadsheet and on the canvas
	 *
	 * The result is plain text either way, callers that store it are responsible for slashing it (see validate_post_meta())
	 *
	 * @param array       $data    an array of data as passed by the user
	 * @param string|null $library the chart's library, null for the conservative behaviour
	 *
	 * @return array of validated data
	 */
	function validate_data( $data, $library = null ) {
		$plain = null !== $library && $this->library_paints_plain_text( $library );

		if ( ! is_array( $data ) ) {
			return $this->validate_data_cell( $data, $plain );
		}

		foreach ( $data as $key => $value ) {
			if ( is_array( $value ) ) {
				$data[ $key ] = $this->validate_data( $value, $library );
			} else {
				$data[ $key ] = $this->validate_data_cell( $value ?? '', $plain );
			}
		}

		return $data;
	}

	/**
	 * Clean a single spreadsheet cell
	 *
	 * wp_kses() is used directly rather than wp_filter_nohtml_kses(), which expects slashed input
	 * and would eat a backslash the user typed ("C:\temp") and hand back quotes with backslashes in front
	 *
	 * @param mixed $value a single cell value
	 * @param bool  $plain whether the cell is kept as typed
	 *
	 * @return string the cleaned cell
	 */
	private function validate_data_cell( $value, $plain = false ) {
		$value = is_scalar( $value ) ? (string) $value : '';

		if ( $plain ) {
			return self::plain_text( $value );
		}

		return html_entity_decode( wp_kses( $value, 'strip' ), ENT_QUOTES | ENT_HTML5, 'UTF-8' );
	}

	/**
	 * Whether a library draws its strings as plain text, so chart text can be stored exactly as typed
	 *
	 * Chart.js draws every string onto the canvas with fillText, nothing typed can become markup there
	 * Any other library is assumed to parse strings as HTML (Highcharts does) and keeps the tag stripping it has always had
	 *
	 * @param string $library a library slug
	 *
	 * @return bool
	 */
	public function library_paints_plain_text( $library ) {
		$plain = 'chartjs' === $library;

		/**
		 * Filter whether a library paints chart text as plain text
		 *
		 * Returning false for chartjs brings back the tag stripping for every chart on the site
		 *
		 * @param bool   $plain   whether text is kept as typed for this library
		 * @param string $library the library slug
		 */
		return (bool) apply_filters( 'm_chart_library_paints_plain_text', $plain, $library );
	}

	/**
	 * Text someone typed, with only what can't be text removed: bytes that aren't valid UTF-8 and control characters
	 *
	 * Tabs and line breaks are kept
	 *
	 * @param string $text
	 *
	 * @return string
	 */
	public static function plain_text( $text ) {
		$text = wp_check_invalid_utf8( (string) $text );

		return (string) preg_replace( '/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/', '', $text );
	}

	/**
	 * Encode typed text for storage in one of the TEXT_FIELDS
	 *
	 * These fields have always been stored HTML encoded ("R&D" as "R&amp;D") and everything that reads them expects that
	 * Every ampersand is encoded, including one that already starts an entity, so decode_text() returns the exact input
	 *
	 * @param string $text
	 *
	 * @return string
	 */
	public static function encode_text( $text ) {
		return htmlspecialchars( (string) $text, ENT_NOQUOTES | ENT_SUBSTITUTE, 'UTF-8', true );
	}

	/**
	 * Turn a stored TEXT_FIELDS value back into the text that was typed
	 *
	 * @param string $text
	 *
	 * @return string
	 */
	public static function decode_text( $text ) {
		return html_entity_decode( (string) $text, ENT_QUOTES, 'UTF-8' );
	}

	/**
	 * Escape plain text for HTML, for values that are stored exactly as typed (cells, labels, set names)
	 *
	 * Unlike esc_html() this encodes an ampersand that already starts an entity,
	 * so a cell typed as "&amp;" or "&lt;b&gt;" shows as typed instead of as "&" or "<b>"
	 *
	 * @param string $text
	 *
	 * @return string
	 */
	public static function esc_text( $text ) {
		return htmlspecialchars( (string) $text, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8', true );
	}

	/**
	 * Decode the HTML entities in the cells of a chart saved before cells were stored as typed
	 *
	 * Charts saved before December 2016 hold kses encoded cells ("A &amp; B") and the label cleaning used to decode
	 * them on every render. Chart.js labels are no longer cleaned, so the decode happens here instead, once, on read
	 *
	 * @param array $post_meta chart meta without the text_format stamp
	 *
	 * @return array
	 */
	public function decode_legacy_cells( array $post_meta ) {
		if ( ! isset( $post_meta['data']['sets'] ) || ! is_array( $post_meta['data']['sets'] ) ) {
			return $post_meta;
		}

		array_walk_recursive( $post_meta['data']['sets'], static function ( &$cell ) {
			if ( is_string( $cell ) && false !== strpos( $cell, '&' ) ) {
				$cell = html_entity_decode( $cell, ENT_QUOTES | ENT_HTML5, 'UTF-8' );
			}
		} );

		return $post_meta;
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

		// A password protected chart stays hidden until the visitor has entered its password
		if ( $this->is_password_locked( $post_id ) ) {
			return '';
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
			// A chart without an image stays false here so the filter below can stand the placeholder in for it
			if ( $image ) {
				$image['width']  = $image['width'] / 2;
				$image['height'] = $image['height'] / 2;
			}

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
		// The table holds the same data as the chart, so it is locked the same way
		if ( $this->is_password_locked( $post_id ) ) {
			return '';
		}

		$post      = get_post( $post_id );
		$post_meta = $this->get_post_meta( $post_id );
		$library   = m_chart()->get_post_meta( $post->ID, 'library' );

		$table = '';

		$multiple = count( $post_meta['data']['sets'] ) > 1 ? true : false;

		foreach ( $post_meta['data']['sets'] as $set => $data ) {
			$classes = $this->slug . '-table ' . $this->slug . '-table-' . $post_id . '-' . $set;

			m_chart()->parse()->parse_data( $data, $post_meta['parse_in'], $this->parse_text_mode( $library ) );

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

		// WordPress has already swapped the content for its password form, leave that in place
		if ( $this->is_password_locked( get_the_ID() ) ) {
			return $content;
		}

		return $this->get_chart();
	}

	/**
	 * Whether a chart is password protected and the current visitor hasn't entered the password
	 *
	 * @param int $post_id WP post ID of the chart
	 *
	 * @return bool
	 */
	public function is_password_locked( $post_id ) {
		// wp-admin screens are already limited to people who can edit the chart
		// A visitor's admin-ajax.php request counts as is_admin() too though, so those are checked like the front end
		if ( is_admin() && ! wp_doing_ajax() ) {
			return false;
		}

		return post_password_required( $post_id );
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

		$permalink = get_permalink( $post_id );

		// The embed endpoint is a path on the end of a pretty permalink
		// A permalink with a query string (plain permalinks: ?m-chart=slug) has no path to add it to, the endpoint's query var asks for the same thing
		$embed_url = false === strpos( (string) $permalink, '?' )
			? trailingslashit( $permalink ) . 'embed/'
			: add_query_arg( 'embed', '1', $permalink );

		$src_url = add_query_arg( $args, $embed_url );

		$defer_lazy = 'enabled' === $this->get_settings( 'defer_rendering' );

		ob_start();
		?>
<iframe id="<?php echo esc_attr( $this->get_container_id( $post_id ) ); ?>"
	class="m-chart-iframe" width="100%" height="<?php echo absint( $post_meta['height'] + 1 ); ?>"
	title="<?php echo esc_attr( get_the_title( $post_id ) ); ?>"
	src="<?php echo esc_url( $src_url ); ?>"<?php echo $defer_lazy ? ' loading="lazy"' : ''; ?>></iframe>
		<?php
		// The share template asks for this iframe again without the share argument, and a caller may leave it out altogether
		if ( 'show' == ( $args['share'] ?? '' ) ) {
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
	 * Clean up JSON that is about to be printed inside a script element
	 *
	 * Core no longer calls this, it is kept for library plugins: the M Chart Highcharts Library prints
	 * json_encode()d chart args through it. It used to run stripslashes() over the JSON text to undo the
	 * addslashes() that library applies to its titles, which also removed the backslash from "<\/script>"
	 * and from a string ending in a backslash, so chart text could close the script element or the string it was in
	 *
	 * The JSON is now decoded, the slashes are taken off the string values themselves and the result is encoded
	 * again with every character that means something to the HTML parser hex-escaped
	 *
	 * @param string $string JSON text (anything else gets the old behaviour, minus the ability to close a script element)
	 *
	 * @return string JSON that is safe inside a script element
	 */
	public function unicode_aware_stripslashes( $string ) {
		$string = (string) $string;
		$data   = json_decode( $string );

		// Not JSON, so there is nothing to rebuild
		// Do what this always did, then make sure the result can't close a script element or open an HTML comment
		if ( null === $data && JSON_ERROR_NONE !== json_last_error() ) {
			$string = stripslashes( preg_replace( '#\\\\u[a-fA-F0-9]{4}#', '\\\\$0', $string ) );

			return str_replace( [ '</', '<!--' ], [ '<\\/', '<\\!--' ], $string );
		}

		$json = wp_json_encode( $this->unslash_json_strings( $data ), JSON_HEX_TAG | JSON_HEX_AMP | JSON_HEX_APOS | JSON_HEX_QUOT );

		return false === $json ? 'null' : $json;
	}

	/**
	 * Undo addslashes() on every string in decoded JSON, keys included
	 *
	 * Only a backslash in front of a quote or another backslash is removed, which is what addslashes() adds
	 * A backslash anywhere else was typed and stays: "C:\temp" keeps its backslash
	 *
	 * @param mixed $value decoded JSON
	 *
	 * @return mixed
	 */
	private function unslash_json_strings( $value ) {
		if ( is_string( $value ) ) {
			return preg_replace( '/\\\\([\'"\\\\])/', '$1', $value );
		}

		if ( is_array( $value ) ) {
			return array_map( [ $this, 'unslash_json_strings' ], $value );
		}

		if ( is_object( $value ) ) {
			$clean = new stdClass();

			foreach ( get_object_vars( $value ) as $key => $item ) {
				$clean->{ $this->unslash_json_strings( (string) $key ) } = $this->unslash_json_strings( $item );
			}

			return $clean;
		}

		return $value;
	}

	/**
	 * Helper function that returns the chart unit terms
	 *
	 * @return array an array of generated and/or compiled unit terms
	 */
	public function get_unit_terms() {
		$terms = get_terms( $this->slug . '-units', [ 'hide_empty' => false ] );

		if ( ! is_array( $terms ) ) {
			$terms = [];
		}

		// Seed the defaults when no unit sits under a group yet
		// An import or a direct save can create flat unit terms before this ever runs so an empty check isn't enough
		$grouped = array_filter( $terms, fn( $term ) => 0 != $term->parent );

		if ( empty( $grouped ) ) {
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
		$groups         = [];
		$used_groups    = [];
		$other          = esc_html__( 'Other', 'm-chart' );

		foreach ( $terms as $unit ) {
			if ( 0 == $unit->parent ) {
				$groups[ $unit->term_id ] = $unit;
			}
		}

		foreach ( $terms as $unit ) {
			if ( 0 != $unit->parent && isset( $groups[ $unit->parent ] ) ) {
				$compiled_terms[ $groups[ $unit->parent ]->name ][] = $unit;
				$used_groups[ $unit->parent ]                        = true;
			}
		}

		// A top level term with nothing under it was created flat by an import or typed straight into a chart
		// List it under Other so it can still be picked
		foreach ( $groups as $term_id => $group ) {
			if ( ! isset( $used_groups[ $term_id ] ) && $group->name !== $other ) {
				$compiled_terms[ $other ][] = $group;
			}
		}

		foreach ( $compiled_terms as &$units ) {
			usort( $units, fn( $a, $b ) => strcasecmp( $a->name, $b->name ) );
		}

		unset( $units );

		ksort( $compiled_terms );

		return $compiled_terms;
	}

	/**
	 * Helper function that populates the unit terms taxonomy with a default set of terms
	 * Safe to run more than once, existing terms are kept and a default unit that exists as a flat term is moved into its group
	 *
	 * @return array an array of every unit term after the defaults were added
	 */
	public function generate_unit_terms() {
		$taxonomy = $this->slug . '-units';

		// Load the default terms array
		$default_terms = require __DIR__ . '/array-default-unit-terms.php';

		foreach ( $default_terms as $group_name => $unit_names ) {
			$group = $this->get_unit_term_by_name( $group_name );

			if ( $group && 0 != $group->parent ) {
				// Someone made a unit out of this name so the group is created as a sibling, WordPress suffixes its slug
				$group = null;
			}

			$group_id = $group ? (int) $group->term_id : 0;

			if ( ! $group_id ) {
				$inserted = wp_insert_term( $group_name, $taxonomy );

				if ( is_wp_error( $inserted ) ) {
					continue;
				}

				$group_id = (int) $inserted['term_id'];
			}

			foreach ( $unit_names as $unit_name ) {
				$unit = $this->get_unit_term_by_name( $unit_name );

				if ( ! $unit ) {
					wp_insert_term( $unit_name, $taxonomy, [ 'parent' => $group_id ] );
				} elseif ( 0 == $unit->parent ) {
					// An import or a direct save created this unit without a group so move it into ours
					wp_update_term( $unit->term_id, $taxonomy, [ 'parent' => $group_id ] );
				}
			}
		}

		$terms = get_terms( $taxonomy, [ 'hide_empty' => false ] );

		return is_array( $terms ) ? $terms : [];
	}

	/**
	 * Finds a unit term by its name
	 *
	 * @param string $name the term name to look for
	 *
	 * @return WP_Term|null the term or null when there isn't one
	 */
	private function get_unit_term_by_name( $name ) {
		$exists = term_exists( $name, $this->slug . '-units' );

		if ( ! is_array( $exists ) ) {
			return null;
		}

		$term = get_term( (int) $exists['term_id'], $this->slug . '-units' );

		return $term instanceof WP_Term ? $term : null;
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

		// The embed has no way to ask for a password, so a protected chart is refused until it has been entered on the chart's own page
		if ( $this->is_password_locked( $post->ID ) ) {
			wp_die(
				esc_html__( 'This chart is password protected', 'm-chart' ),
				esc_html__( 'Chart is password protected', 'm-chart' ),
				[ 'response' => 403 ]
			);
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
	 * Build the Content-Security-Policy the embed document is sent with
	 *
	 * The embed template has already resolved the stylesheets and fonts it is about to print and hands them in,
	 * so their hosts are allowlisted here without running those filters a second time
	 *
	 * @param string $nonce            the per-response nonce the chart's inline script carries
	 * @param int    $post_id          WP post ID of the chart being embedded
	 * @param array  $style_urls       the stylesheet URLs returned by the m_chart_iframe_styles filter
	 * @param array  $font_descriptors the font descriptors returned by the m_chart_iframe_fonts filter
	 *
	 * @return string the policy, without the header name
	 */
	public function iframe_csp( $nonce, $post_id, $style_urls = [], $font_descriptors = [] ) {
		// Default allowed style-src hosts cover the well-known font-service stylesheet origins
		// Site owners using Fontspring, FontAwesome CDN, an internal CDN, etc. can extend via the filter
		$style_hosts = apply_filters( 'm_chart_iframe_csp_style_src', [ 'fonts.googleapis.com', 'use.typekit.net' ], $post_id );
		// Default allowed font-src hosts cover where Google Fonts + Adobe Typekit actually load their .woff2 files from
		$font_hosts = apply_filters( 'm_chart_iframe_csp_font_src', [ 'fonts.gstatic.com', 'use.typekit.net', 'p.typekit.net' ], $post_id );

		// Auto-extract hosts from anything passed through m_chart_iframe_styles
		// Site owners can add a stylesheet URL without also having to register its host in the CSP filter
		foreach ( $style_urls as $style_url ) {
			$host = wp_parse_url( $style_url, PHP_URL_HOST );

			if ( $host ) {
				$style_hosts[] = $host;
			}
		}

		// Auto-extract hosts from m_chart_iframe_fonts font sources too
		// Only the sources render_font_face() will actually print are allowlisted
		foreach ( $font_descriptors as $font ) {
			foreach ( self::font_face_sources( (array) $font ) as $src ) {
				$host = wp_parse_url( $src['url'], PHP_URL_HOST );

				if ( $host ) {
					$font_hosts[] = $host;
				}
			}
		}

		$style_hosts = array_unique( array_filter( $style_hosts ) );
		$font_hosts  = array_unique( array_filter( $font_hosts ) );

		// frame-ancestors controls who's allowed to embed this iframe page
		// Default 'self' permits same-origin embedding; site owners syndicating charts to third-party sites can add origins here
		$frame_ancestors = apply_filters( 'm_chart_iframe_frame_ancestors', [ "'self'" ], $post_id );

		// Whitelist the characters that can appear in a valid CSP source expression
		// esc_attr() is for HTML attributes — it would encode 'self' as &#039;self&#039; here and break the directive
		// Stripping anything outside this character class prevents header injection (CRLF, semicolons) while preserving keywords/hosts/schemes
		$sanitize_csp_source = static function ( $value ) {
			return preg_replace( '/[^A-Za-z0-9.\-_:\/*\'+=@]/', '', (string) $value );
		};

		// style-src uses 'unsafe-inline' (not a nonce) because inline style="..." attributes can't carry a nonce
		// CSS-driven exfiltration vectors (url(), @font-face src, @import) are still blocked by font-src / img-src / connect-src
		// script-src keeps a nonce since the chart template emits a dynamic inline <script> we want strictly gated
		return sprintf(
			"default-src 'none'; style-src 'self' 'unsafe-inline' %s; script-src 'self' 'nonce-%s'; font-src 'self' data: %s; img-src 'self' data:; connect-src 'self'; frame-ancestors %s;",
			implode( ' ', array_map( $sanitize_csp_source, $style_hosts ) ),
			$nonce,
			implode( ' ', array_map( $sanitize_csp_source, $font_hosts  ) ),
			implode( ' ', array_map( $sanitize_csp_source, $frame_ancestors ) )
		);
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
		// The suffix changes whenever what goes into the args changes, so a persistent object cache can't keep serving the old ones
		return absint( $post_id ) . '-chart-args-v2';
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

		// The key used before 2.4, which library plugins that keep their own cached args still write to
		wp_cache_delete( absint( $post_id ) . '-chart-args', $this->slug );
	}

	/**
	 * How M_Chart_Parse should treat label cells for a chart using the given library
	 *
	 * @param string $library a library slug
	 *
	 * @return string M_Chart_Parse::TEXT_PLAIN or M_Chart_Parse::TEXT_LEGACY
	 */
	public function parse_text_mode( $library ) {
		$this->parse();

		return $this->library_paints_plain_text( $library ) ? M_Chart_Parse::TEXT_PLAIN : M_Chart_Parse::TEXT_LEGACY;
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

		// A request can send an array here, which isset() would choke on
		if ( ! is_string( $library ) || ! isset( $libraries[ $library ] ) ) {
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
		// Get the charts that predate library tracking: no highcharts tag yet and no library term either
		// The version option can go missing on a site that is well past 1.7 (a move to multisite is one way),
		// and without the second condition this would then mark every chart on it as a Highcharts chart
		$charts = get_posts(
			[
				'post_type'      => m_chart()->slug,
				'posts_per_page' => -1,
				'post_status'    => 'any',
				'tax_query'      => [
					'relation' => 'AND',
					[
						'taxonomy' => 'post_tag',
						'field'    => 'slug',
						'terms'    => 'highcharts',
						'operator' => 'NOT IN',
					],
					[
						'taxonomy' => m_chart()->slug . '-library',
						'operator' => 'NOT EXISTS',
					],
				],
			]
		);

		// Add highcharts post_tag to those charts
		foreach ( $charts as $chart ) {
			$library = get_post_meta( $chart->ID, m_chart()->slug, true )['library'] ?? 'highcharts';

			// A chart whose own settings name another library was never a pre 1.7 chart
			if ( 'highcharts' !== $library ) {
				continue;
			}

			// Appended, so the tags the chart already has are kept
			wp_set_object_terms( $chart->ID, 'highcharts', 'post_tag', true );
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
