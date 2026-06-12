<?php

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

class M_Chart_Admin {
	private $safe_settings = [
		'performance' => [
			'default',
			'no-images',
			'no-preview',
		],
		'csv_delimiter' => [
			',',
			"\t",
			' ',
			';',
		],
		'defer_rendering' => [
			'',
			'enabled',
		],
	];
	private $plugin_url;

	/**
	 * Constructor
	 */
	public function __construct() {
		$this->plugin_url = m_chart()->plugin_url();

		add_action( 'admin_init', [ $this, 'admin_init' ] );
		add_action( 'admin_menu', [ $this, 'admin_menu' ] );
		// Runs after Freemius adds its own submenu links so we can relabel/reposition the Upgrade link
		// Freemius hooks its menu at WP_FS__LOWEST_PRIORITY so we go one higher
		add_action( 'admin_menu', [ $this, 'admin_submenu_links' ], ( defined( 'WP_FS__LOWEST_PRIORITY' ) ? WP_FS__LOWEST_PRIORITY : 999999998 ) + 1 );
		add_action( 'admin_print_footer_scripts', [ $this, 'admin_print_footer_scripts' ] );
		add_action( 'admin_head', [ $this, 'admin_head' ] );
		add_action( 'current_screen', [ $this, 'current_screen' ] );
		add_action( 'admin_footer', [ $this, 'admin_footer' ] );
		add_action( 'wp_ajax_m_chart_export_csv', [ $this, 'ajax_export_csv' ] );
		add_action( 'wp_ajax_m_chart_get_chart_args', [ $this, 'ajax_get_chart_args' ] );
		add_action( 'wp_ajax_m_chart_import_csv', [ $this, 'ajax_import_csv' ] );
		add_action( 'edit_form_before_permalink', [ $this, 'edit_form_before_permalink' ] );
		add_action( 'manage_' . m_chart()->slug . '_posts_custom_column', [ $this, 'manage_posts_custom_column' ], 10, 2 );
		add_action( 'm_chart_settings_admin', [ $this, 'm_chart_settings_admin' ] );

		add_filter( 'manage_' . m_chart()->slug . '_posts_columns', [ $this, 'manage_posts_columns' ] );
	}

	/**
	 * Look for save settings submissions
	 */
	public function admin_init() {
		$this->save_settings();

		add_action( 'admin_notices', [ $this, 'library_warning' ] );
	}

	/**
	 * Add settings admin page
	 */
	public function admin_menu() {
		add_submenu_page(
			'edit.php?post_type=' . m_chart()->slug,
			esc_html__( 'M Chart Settings', 'm-chart' ),
			esc_html__( 'Settings', 'm-chart' ),
			'manage_options',
			m_chart()->slug . '-settings',
			[ $this, 'm_chart_settings' ]
		);
	}

	/**
	 * Arrange the extra Charts submenu links
	 *
	 * Runs at a priority above Freemius so its pricing link already exists when we relabel and reposition it
	 * Handles the Upgrade link, the Docs link, and the per library Add Chart links all in one place so ordering is predictable
	 */
	public function admin_submenu_links() {
		global $submenu;

		$menu_slug = 'edit.php?post_type=' . m_chart()->slug;

		// Freemius adds its own pricing/upgrade submenu link for free users
		// We relabel it to Upgrade and move it just above the Docs link
		// Parsing the page slug out of the upgrade URL lets us find Freemius's entry without relying on its internals
		// Repositioning leaves the page route registered so the link still works
		$pricing_slug = '';
		$query        = wp_parse_url( m_chart()->freemius()->get_upgrade_url(), PHP_URL_QUERY );

		if ( $query ) {
			parse_str( $query, $query_args );
			$pricing_slug = $query_args['page'] ?? '';
		}

		if ( '' !== $pricing_slug && ! empty( $submenu[ $menu_slug ] ) ) {
			foreach ( $submenu[ $menu_slug ] as $position => $item ) {
				if ( isset( $item[2] ) && $item[2] === $pricing_slug ) {
					unset( $submenu[ $menu_slug ][ $position ] );

					$item[0]                   = esc_html__( 'Upgrade', 'm-chart' );
					$submenu[ $menu_slug ][99] = $item;

					break;
				}
			}
		}

		// Docs link — sits at the bottom of the Charts submenu
		// The third array element is the href; WordPress treats it as a full URL when it includes a scheme
		// target="_blank" is added by admin_print_footer_scripts() since WP's $submenu API doesn't accept link attributes
		$submenu[ $menu_slug ][100] = [
			esc_html__( 'Docs', 'm-chart' ),
			'edit_posts',
			'https://docs.mch.art',
		];

		// If multiple libraries are active we'll give you the option of using each one
		// @TODO As written this will break if there's ever more than 10 active libraries... so yeah
		$libraries = m_chart()->get_libraries();

		if ( 1 < count( $libraries ) ) {
			// Put the default library into the admin menu first
			$args = [
				'post_type' => m_chart()->slug,
				'library'   => m_chart()->get_library(),
			];

			$submenu[ $menu_slug ][10] = [
				'Add ' . $libraries[ m_chart()->get_library() ] . ' Chart',
				'edit_posts',
				add_query_arg( $args, admin_url( 'post-new.php' ) ),
			];

			unset( $libraries[ m_chart()->get_library() ] );

			// Add a Add Chart option for each active library that isn't the current default
			$key = 11;

			foreach ( $libraries as $library => $library_name ) {
				$args = [
					'post_type' => m_chart()->slug,
					'library'   => $library,
				];

				$submenu[ $menu_slug ][ $key ] = [
					'Add ' . $library_name . ' Chart',
					'edit_posts',
					add_query_arg( $args, admin_url( 'post-new.php' ) ),
				];

				$key++;
			}
		}

		// Gotta sort them so they're in the right order
		if ( ! empty( $submenu[ $menu_slug ] ) ) {
			ksort( $submenu[ $menu_slug ] );
		}
	}

	/**
	 * Add target="_blank" to the Docs link in the Charts submenu
	 *
	 * WordPress's add_submenu_page() / $submenu API has no concept of link attributes
	 * So we do it via a tiny footer script that runs on every admin page since the menu is global
	 */
	public function admin_print_footer_scripts() {
		?>
<script>
( () => {
	const link = document.querySelector( '#adminmenu a[href="https://docs.mch.art"]' );

	if ( link ) {
		link.setAttribute( 'target', '_blank' );
		link.setAttribute( 'rel', 'noopener noreferrer' );
	}
} )();
</script>
		<?php
	}

	/**
	 * Hook: admin_head — print an inline <style> that renders the Upgrade submenu link as a filled pill button with a trailing trendingUp icon
	 *
	 * Lives inline rather than in the main SCSS bundle because the sidebar renders on every admin page
	 * and that bundle only enqueues on chart screens
	 *
	 * Only printed for free users since that is when the Upgrade link exists
	 * The pill mimics the Pro plugin's menu badge - accent fill via --wp-admin-theme-color, white text, darker accent on hover
	 * The icon is the trendingUp icon from @wordpress/icons masked so background-color: currentColor tints it white to match the text
	 */
	public function admin_head() {
		if ( ! m_chart()->freemius()->is_free_plan() ) {
			return;
		}

		// Full page=m-chart-settings-pricing slug so we don't also match the Settings link
		?>
		<style id="m-chart-menu-upgrade">
			#adminmenu a[href*="page=m-chart-settings-pricing"] {
				display:       inline-block;
				margin:        4px 0 4px 13px;
				/* 
				Using !important to beat WordPress's own submenu link padding (5px 12px)
				the mobile media query overrides this again under 782px so the button can still grow
				*/
				padding:       2px 10px !important;
				border-radius: 2px;
				font-weight:   600;
				background:    var( --wp-admin-theme-color, #3858e9 ) !important;
				color:         #fff !important;
			}

			#adminmenu a[href*="page=m-chart-settings-pricing"]:hover,
			#adminmenu a[href*="page=m-chart-settings-pricing"]:focus {
				background: color-mix( in srgb, var( --wp-admin-theme-color, #3858e9 ), black 10% ) !important;
				color:      #fff !important;
				/* 
				WordPress paints an inset 4px left bar on submenu hover/focus
				We remove it so the button stays clean 
				*/
				box-shadow: none !important;
			}

			#adminmenu a[href*="page=m-chart-settings-pricing"]::after {
				content:          "";
				display:          inline-block;
				width:            18px;
				height:           18px;
				margin-left:      4px;
				vertical-align:   middle;
				background-color: currentColor;
				-webkit-mask:     url("data:image/svg+xml,%3Csvg%20xmlns='http://www.w3.org/2000/svg'%20viewBox='0%200%2024%2024'%3E%3Cpath%20d='M3.445%2016.505a.75.75%200%20001.06.05l5.005-4.55%204.024%203.521%204.716-4.715V14h1.5V8.25H14v1.5h3.19l-3.724%203.723L9.49%209.995l-5.995%205.45a.75.75%200%2000-.05%201.06z'/%3E%3C/svg%3E") no-repeat center / contain;
				mask:             url("data:image/svg+xml,%3Csvg%20xmlns='http://www.w3.org/2000/svg'%20viewBox='0%200%2024%2024'%3E%3Cpath%20d='M3.445%2016.505a.75.75%200%20001.06.05l5.005-4.55%204.024%203.521%204.716-4.715V14h1.5V8.25H14v1.5h3.19l-3.724%203.723L9.49%209.995l-5.995%205.45a.75.75%200%2000-.05%201.06z'/%3E%3C/svg%3E") no-repeat center / contain;
			}

			/* 
			Under 782px WordPress enlarges submenu links for touch with an asymmetric 10px 10px 10px 20px padding
			This keeps the bigger size but matches the left padding to the right so the button looks normal
			*/
			@media screen and ( max-width: 782px ) {
				#adminmenu a[href*="page=m-chart-settings-pricing"] {
					padding: 10px !important;
				}

				#adminmenu a[href*="page=m-chart-settings-pricing"]::after {
					width:  23px;
					height: 23px;
				}
			}
		</style>
		<?php
	}

	/**
	 * Display the M Chart settings admin page
	 */
	public function m_chart_settings() {
		$settings = m_chart()->get_settings();
		require_once __DIR__ . '/templates/m-chart-settings.php';
	}

	/**
	 * Check for and save M Chart settings
	 */
	public function save_settings() {
		if ( ! current_user_can( 'manage_options' ) ) {
			return;
		}

		// Check the nonce
		$nonce = $_POST[ m_chart()->slug ]['nonce'] ?? '';

		if (
			   ! isset( $_POST[ m_chart()->slug ] )
			|| ! wp_verify_nonce( $nonce, m_chart()->slug . '-save-settings' )
		) {
			return;
		}

		$previous_settings  = m_chart()->get_settings();
		$validated_settings = [];
		$submitted_settings = $_POST[ m_chart()->slug ];

		$default_settings = apply_filters( 'm_chart_default_settings', m_chart()->settings );

		foreach ( $default_settings as $setting => $default ) {
			if ( ! isset( $submitted_settings[ $setting ] ) ) {
				$validated_settings[ $setting ] = $default;
				continue;
			}

			// Default chart height is numeric so clamp it to the same range as the per-chart height field
			if ( 'default_height' === $setting ) {
				$validated_settings[ $setting ] = min( 1500, max( 300, absint( $submitted_settings[ $setting ] ) ) );
				continue;
			}

			if ( isset( $this->safe_settings[ $setting ] ) ) {
				// If we've got an array of valid values lets check against that
				$safe_setting = $this->safe_settings[ $setting ];

				if ( in_array( $submitted_settings[ $setting ], $safe_setting, true ) ) {
					$validated_settings[ $setting ] = $submitted_settings[ $setting ];
				} else {
					$validated_settings[ $setting ] = $default;
				}
			} else {
				// Make sure the value is a string and matches the safe pattern before saving it
				// Non-scalar submissions (e.g. an array from a library-plugin-added setting) fall back o the default
				// Plugins that need to persist complex shapes should hook 'm_chart_validated_settings' below to inject their own validated value
				$value = $submitted_settings[ $setting ];

				if ( is_string( $value ) && preg_match( '#^[a-zA-Z0-9-_]+$#', $value ) ) {
					$validated_settings[ $setting ] = $value;
				} else {
					$validated_settings[ $setting ] = $default;
				}
			}
		}

		// Allow third party libraries to further validate the settings
		$validated_settings = apply_filters( 'm_chart_validated_settings', $validated_settings, $submitted_settings );

		update_option( m_chart()->slug, $validated_settings );

		// Only flush rewrite rules when the embed endpoint is actually being toggled
		$previous_embeds = $previous_settings['embeds'] ?? '';
		$current_embeds  = $validated_settings['embeds'] ?? '';

		if ( $previous_embeds !== $current_embeds ) {
			flush_rewrite_rules();
		}

		add_action( 'admin_notices', [ $this, 'save_success' ] );
	}

	/**
	 * Display an admin notice that the settings have been saved
	 */
	public function save_success() {
		?>
<div class="updated notice notice-success">
	<p><?php esc_html_e( 'Settings saved', 'm-chart' ); ?></p>
</div>
		<?php
	}

	/**
	 * Display an admin notice when the site has charts that use Highcharts but M Chart Highcharts Library is not active/installed
	 */
	public function library_warning() {
		if ( is_plugin_active( 'm-chart-highcharts-library/m-chart-highcharts-library.php' ) ) {
			return;
		}

		$highcharts_check = get_posts(
			[
				'post_type'      => m_chart()->slug,
				'posts_per_page' => 1,
				'post_status'    => 'any',
				'tax_query'      => [
					[
						'taxonomy' => m_chart()->slug . '-library',
						'field'    => 'slug',
						'terms'    => 'highcharts',
					],
				],
			]
		);

		if ( ! $highcharts_check ) {
			return;
		}
		?>
<div class="warning notice notice-warning">
	<p>
		<?php
				echo str_replace(
					esc_html__( 'M Chart Highcharts Library', 'm-chart' ),
					'<strong>' . esc_html__( 'M Chart Highcharts Library', 'm-chart' ) . '</strong>',
					esc_html__( 'You have charts that require the M Chart Highcharts Library plugin.', 'm-chart' )
				);
		?>
	</p>
	<p><?php esc_html_e( 'These charts will no longer display unless you install the plugin:', 'm-chart' ); ?></p>
	<p><a href="https://github.com/methnen/m-chart-highcharts-library/"
			class="button-primary"><?php esc_html_e( 'Learn More', 'm-chart' ); ?></a></p>
</div>
		<?php
	}

	/**
	 * Load CSS/Javascript necessary for the interface
	 *
	 * @param object the current screen object as passed by the current_screen action hook
	 */
	public function current_screen( $screen ) {
		if ( m_chart()->slug !== $screen->post_type ) {
			return;
		}

		// Only load these if we are on a post page
		if ( 'post' === $screen->base ) {
			// Jspreadsheet CE — needed by both chartjs (React) and other libraries (jQuery)
			wp_enqueue_style(
				'jspreadsheet',
				$this->plugin_url . '/components/external/jspreadsheet/jspreadsheet.css',
				[],
				m_chart()->version
			);

			wp_enqueue_script(
				'jspreadsheet',
				$this->plugin_url . '/components/external/jspreadsheet/jspreadsheet.js',
				[ 'jsuites' ],
				m_chart()->version
			);

			// jSuites — required by Jspreadsheet
			wp_enqueue_style(
				'jsuites',
				$this->plugin_url . '/components/external/jsuites/jsuites.css',
				[],
				m_chart()->version
			);

			wp_enqueue_script(
				'jsuites',
				$this->plugin_url . '/components/external/jsuites/jsuites.js',
				[],
				m_chart()->version
			);

			// Admin UI React app
			$admin_app_asset = require __DIR__ . '/admin-ui/index.asset.php';

			wp_enqueue_script(
				'm-chart-admin-ui',
				$this->plugin_url . '/components/admin-ui/index.js',
				array_merge( $admin_app_asset['dependencies'], [ 'wp-hooks' ] ),
				$admin_app_asset['version'],
				[ 'strategy' => 'defer' ]
			);

			wp_set_script_translations(
				'm-chart-admin-ui',
				'm-chart',
				plugin_dir_path( __DIR__ ) . 'components/languages/'
			);

			// We need the library and post ID for a bunch of stuff below
			$post_id = isset( $_GET['post'] ) ? (int) $_GET['post'] : '';
			$library = m_chart()->get_library();

			if ( ! empty( $post_id ) ) {
				$library = m_chart()->get_post_meta( absint( $post_id ), 'library' );
			} elseif (
				   'post' === $screen->base
				&& 'add' === $screen->action
				&& isset( $_GET['library'] )
				&& m_chart()->is_valid_library( $_GET['library'] )
			) {
				$library = $_GET['library'];
			}

			if ( 'chartjs' === $library ) {
				// Chart.js libs — enqueued explicitly so the React preview has window.Chart and window
				// MChartHelper available before m-chart-admin-ui runs its plugin registration
				// We load every plugin regardless of immediate need when in the edit view since the user can switch chart types from the picker
				wp_enqueue_script( 'chartjs-helper' );
				wp_enqueue_script( 'chartjs-datalabels' );
				wp_enqueue_script( 'chartjs-treemap' );
				wp_enqueue_script( 'chartjs-boxplot' );
			}

			$post_meta        = m_chart()->get_post_meta( $post_id );
			$spreadsheet_data = empty( $post_meta['data'] ) ? [ [ '' ] ] : $post_meta['data']['sets'];
			unset( $post_meta['data'] ); // passed separately as spreadsheet_data

			// Collect library-specific config for the React admin app
			$type_options      = [];
			$type_option_names = [];
			$themes            = [];

			if ( m_chart()->library( $library ) ) {
				$library_class     = m_chart()->library( $library );
				$type_options      = $library_class->type_options;
				$type_option_names = $library_class->type_option_names;

				foreach ( $library_class->get_themes() as $theme ) {
					$themes[] = [
						'slug' => $theme->slug,
						'name' => $theme->name,
					];
				}
			}

			// Format unit terms as an array of {group, units} for easy JS mapping
			$unit_terms = [];

			foreach ( m_chart()->get_unit_terms() as $group => $units ) {
				$group_units = [];

				foreach ( $units as $unit ) {
					$group_units[] = [ 'name' => $unit->name, 'slug' => $unit->slug ];
				}

				$unit_terms[] = [
					'group' => $group,
					'units' => $group_units,
				];
			}

			$chart_image = m_chart()->get_chart_image( $post_id );

			// Compute initial chart args for the React preview (React-enabled libraries, existing posts only)
			$initial_chart_args = null;

			if ( $post_id && m_chart()->library( $library ) ) {
				$initial_chart_args = m_chart()->library( $library )->get_chart_args(
					$post_id,
					m_chart()->get_chart_default_args,
					true,  // force recompute
					false  // don't store in cache
				);
			}

			// Build CSV delimiter map for React's CsvControls component
			$csv_delimiters = [];
			foreach ( m_chart()->csv_delimiters as $delimiter => $delimiter_name ) {
				$csv_delimiters[ $delimiter ] = $delimiter_name;
			}

			$localize_data = [
				'slug'                    => m_chart()->slug,
				'version'                 => m_chart()->version,
				'refresh_counter'         => 0,
				'allow_form_submission'   => false,
				'request'                 => false,
				'performance'             => m_chart()->get_settings( 'performance' ),
				'image_support'           => apply_filters( 'm_chart_image_support', 'no', $library ),
				'instant_preview_support' => apply_filters( 'm_chart_instant_preview_support', 'no', $library ),
				'image_multiplier'        => m_chart()->get_settings( 'image_multiplier' ),
				'image_width'             => m_chart()->get_settings( 'image_width' ),
				'library'                 => $library,
				'set_names'               => m_chart()->get_post_meta( $post_id, 'set_names' ),
				'post_id'                 => $post_id,
				'nonce'                   => wp_create_nonce( m_chart()->slug . '-save-post' ),
				'ajax_url'                => admin_url( 'admin-ajax.php' ),
				'post_meta'               => $post_meta,
				'spreadsheet_data'        => $spreadsheet_data,
				'type_options'            => $type_options,
				'type_option_names'       => $type_option_names,
				'themes'                  => $themes,
				'unit_terms'              => $unit_terms,
				'image_url'               => $chart_image ? esc_url( $chart_image['url'] ) : '',
				'chart_args'              => $initial_chart_args,
				'csv_delimiters'          => $csv_delimiters,
				'default_delimiter'       => m_chart()->get_settings( 'csv_delimiter' ),
				'multi_sheet_types'       => m_chart()->get_multi_sheet_types(),
			];

			wp_localize_script( 'm-chart-admin-ui', 'm_chart_admin', $localize_data );

			do_action( 'm_chart_admin_scripts', $library, $post_id );
		}

		// Admin panel CSS
		wp_enqueue_style(
			'm-chart-admin',
			$this->plugin_url . '/components/css/m-chart-admin.css',
			[],
			m_chart()->version
		);
	}

	/**
	 * Add all of the metaboxes needed for the data and chart editing interface
	 */
	public function meta_boxes() {
		global $wp_meta_boxes;

		// Remove excerpt from its normal spot in the meta_boxes array so we can put it back in after the spreadsheet
		// Users can move metaboxes, but this helps put things in a reasonable place on the first visit
		$excerpt = $wp_meta_boxes[ m_chart()->slug ][ 'normal' ][ 'core' ][ 'postexcerpt' ];
		unset( $wp_meta_boxes[ m_chart()->slug ][ 'normal' ][ 'core' ][ 'postexcerpt' ] );

		add_meta_box(
			m_chart()->slug . '-spreadsheet',
			esc_html__( 'Data', 'm-chart' ),
			[ $this, 'spreadsheet_meta_box' ],
			m_chart()->slug,
			'normal',
			'high'
		);

		add_meta_box(
			m_chart()->slug,
			esc_html__( 'Chart', 'm-chart' ),
			[ $this, 'chart_meta_box' ],
			m_chart()->slug,
			'normal',
			'high'
		);

		$wp_meta_boxes[ m_chart()->slug ][ 'normal' ][ 'high' ][ 'postexcerpt' ] = $excerpt;

		// We are using our own interface for the units so we can remove the units taxonomy metabox
		remove_meta_box( m_chart()->slug . '-unitsdiv', m_chart()->slug, 'side' );
	}

	/**
	 * Displays the spreadsheet meta box
	 *
	 * @param object the WP post object as returned by the metabox API
	 */
	public function spreadsheet_meta_box( $post ) {
		echo '<div id="m-chart-spreadsheet-root"></div>';
		echo '<textarea name="' . esc_attr( $this->get_field_name( 'data' ) ) . '" class="data hide"></textarea>';
		wp_nonce_field( m_chart()->slug . '-save-post', $this->get_field_name( 'nonce' ) );
	}

	/**
	 * Displays the chart meta box
	 *
	 * @param object the WP post object as returned by the metabox API
	 */
	public function chart_meta_box( $post ) {
		// Force an instance of 1 since we NEVER show more than one chart at a time inside the admin panel
		m_chart()->instance = 1;

		$post_meta = m_chart()->get_post_meta( $post->ID );
		$image     = m_chart()->get_chart_image( $post->ID );
		$settings  = m_chart()->get_settings();

		require_once __DIR__ . '/templates/chart-meta-box.php';
	}

	/**
	 * Insert CSV Import and Export forms into the footer when editing charts
	 */
	public function admin_footer() {
		$screen = get_current_screen();

		if ( 'post' !== $screen->base || m_chart()->slug !== $screen->post_type ) {
			return;
		}
		?>
<script type="text/javascript">
		<?php do_action( 'm_chart_admin_footer_javascript' ); ?>
</script>
		<?php
	}

	/**
	 * Inserts a subtitle field under the title field on the chart edit form
	 *
	 * @param object the WP post object as returned by the metabox API
	 */
	public function edit_form_before_permalink( $post ) {
		if ( m_chart()->slug !== $post->post_type ) {
			return;
		}

		echo '<div id="m-chart-subtitle-root"></div>';
	}

	/**
	 * Display some additional information about a chart
	 *
	 * @param string the name of the custom column being displayed
	 * @param string the $post_id of the post being displayed in this row
	 */
	public function manage_posts_custom_column( $column, $post_id ) {
		if ( m_chart()->slug . '-type' !== $column && m_chart()->slug . '-library' !== $column ) {
			return;
		}

		$library          = m_chart()->get_post_meta( $post_id, 'library' );
		$library_instance = m_chart()->library( $library );

		if ( ! $library_instance || $library_instance->library !== $library ) {
			?>
<span aria-hidden="true">—</span>
<span class="screen-reader-text"><?php echo esc_html__( 'Library not found', 'm-chart' ); ?></span>
			<?php
			return;
		}

		if ( m_chart()->slug . '-type' === $column ) {
			$type      = m_chart()->get_post_meta( $post_id, 'type' );
			$type_name = $library_instance->type_option_names[ $type ];
			?>
<span class="type <?php echo esc_attr( $type ); ?>" title="<?php echo esc_attr( $type_name ); ?>">
			<?php echo esc_html( $type_name ); ?>
</span>
			<?php
		}

		if ( m_chart()->slug . '-library' === $column ) {
			$library_name = $library_instance->library_name;
			?>
<span class="library <?php echo esc_attr( $library ); ?>" title="<?php echo esc_attr( $library_name ); ?>">
			<?php echo esc_html( $library_name ); ?>
</span>
			<?php
		}
	}

	/**
	 * Add the Chart.js admin settings to the M Chart Settings page
	 */
	public function m_chart_settings_admin() {
		$settings = m_chart()->get_settings();
		require __DIR__ . '/templates/m-chart-settings-chartjs.php';
	}

	/**
	 * Add our custom column to the array of columns for charts
	 *
	 * @param array the array of columns
	 *
	 * @return array array of columns with the custom column added
	 */
	public function manage_posts_columns( $columns ) {
		$new_columns = [];

		foreach ( $columns as $column => $name ) {
			$new_columns[ $column ] = $name;

			if ( 'author' === $column || 'coauthors' === $column ) {
				$new_columns[ m_chart()->slug . '-type' ] = 'Type';

				if ( 'yes' === m_chart()->get_settings( 'show_library' ) ) {
					$new_columns[ m_chart()->slug . '-library' ] = 'Library';
				}
			}
		}

		return $new_columns;
	}

	/**
	 * Hook to save_post action and save chart related post meta
	 *
	 * @param int the WP post ID of the post being saved
	 */
	public function save_post( $post_id ) {
		$post = get_post( $post_id );

		// Check that this isn't an autosave
		if ( defined( 'DOING_AUTOSAVE' ) && DOING_AUTOSAVE ) {
			return;
		}

		// Check post type
		if ( ! isset( $post->post_type ) || m_chart()->slug !== $post->post_type ) {
			return;
		}

		// Don't run on post revisions (almost always happens just before the real post is saved)
		if ( wp_is_post_revision( $post->ID ) ) {
			return;
		}

		// Make sure we've got some actual M Chart related data in the $_POST array
		if ( ! isset( $_POST[ m_chart()->slug ] ) ) {
			return;
		}

		// Check the nonce
		$nonce = $_POST[ m_chart()->slug ]['nonce'] ?? '';

		if ( ! wp_verify_nonce( $nonce, m_chart()->slug . '-save-post' ) ) {
			return;
		}

		unset( $_POST[ m_chart()->slug ]['nonce'] );

		// Check the permissions
		if ( ! current_user_can( 'edit_post', $post->ID ) ) {
			return;
		}

		// If there's an image being passed attach it to the chart post
		$this->attach_image();

		// Make sure we don't overwrite existing settings in the case someone hits update too quickly
		if (
			   isset( $_POST[ m_chart()->slug ]['library'] )
			// Make sure the library value is clean and valid before trying to use it
			&& m_chart()->is_valid_library( $_POST[ m_chart()->slug ]['library'] )
		) {
			$library = sanitize_key( $_POST[ m_chart()->slug ]['library'] );

			// Load the library in question in case there's a filter/action we'll need
			m_chart()->library( $library );

			// update_post_meta passes the $_POST values directly to validate_post_meta
			// validate_post_meta returns only valid post meta values and does data validation on each item
			m_chart()->update_post_meta( $post->ID, $_POST[ m_chart()->slug ] );
		}
	}

	/**
	 * Attach a given image to a chart post
	 *
	 * @param int the WP post ID of the post being saved
	 * @param string a base64 encoded string of the image we want to attach
	 */
	public function attach_image() {
		$settings = m_chart()->get_settings();

		// If the performance setting isn't turned to default we don't do this
		if ( 'default' !== $settings['performance'] ) {
			return false;
		}

		if ( ! is_numeric( $_POST['post_ID'] ?? '' ) ) {
			return false;
		}

		$post_id = absint( $_POST['post_ID'] );

		// Make sure the library used on this post supports images
		if ( 'no' === apply_filters( 'm_chart_image_support', 'no', m_chart()->get_post_meta( $post_id, 'library' ) ) ) {
			return false;
		}

		if ( ! current_user_can( 'edit_post', $post_id ) ) {
			return false;
		}

		if ( ! $post = get_post( $post_id ) ) {
			return false;
		}

		$img_data = $_POST[ m_chart()->slug ]['img'] ?? '';

		if ( '' === $img_data ) {
			return false;
		}

		// Decode the image so we can save it
		$decoded_img = base64_decode( str_replace( 'data:image/png;base64,', '', $img_data ) );

		// Reject anything that isn't a real PNG before writing it to disk
		if ( false === $decoded_img || '' === $decoded_img || "\x89PNG\r\n\x1a\n" !== substr( $decoded_img, 0, 8 ) ) {
			return false;
		}

		// Cap the image size at 5MB to keep a runaway client from filling disk
		if ( strlen( $decoded_img ) > 5 * 1024 * 1024 ) {
			return false;
		}

		// Check for an existing attached image
		$attachments = get_posts(
			[
				'post_type'      => 'attachment',
				'posts_per_page' => 1,
				'post_parent'    => $post->ID,
				'meta_key'       => m_chart()->slug . '-image',
			]
		);

		// If an existing image was found delete it
		foreach ( $attachments as $attachment ) {
			wp_delete_attachment( $attachment->ID, true );
		}

		// Upload image to WP
		$file = wp_upload_bits( sanitize_title( $post->post_title . '-' . $post->ID ) . '.png', null, $decoded_img );

		// START acting like media_sideload_image
		preg_match( '/[^\?]+\.(jpe?g|jpe|gif|png)\b/i', $file['file'], $matches );

		$file_array['name']     = basename( $matches[0] );
		$file_array['tmp_name'] = $file['file'];

		if ( is_wp_error( $file ) ) {
			@unlink( $file_array['tmp_name'] );
			$file_array['tmp_name'] = '';
		}

		$img_id = media_handle_sideload( $file_array, $post->ID, $post->post_title );

		if ( is_wp_error( $img_id ) ) {
			@unlink( $file_array['tmp_name'] );
			return $img_id;
		}
		// STOP acting like media_sideload_image

		// Set some meta on the attachment so we know it came from m-chart
		add_post_meta( $img_id, m_chart()->slug . '-image', $post->ID );

		// Set the attachment as the chart's thumbnail
		update_post_meta( $post->ID, '_thumbnail_id', $img_id );
	}

	/**
	 * Parses an incoming CSV file and compiles it into an array
	 *
	 * @return array an array of the data from the imported CSV file ready for use in the chart meta
	 */
	public function ajax_import_csv() {
		$post = get_post( absint( $_POST['post_id'] ?? 0 ) );

		// Check post type
		if ( ! isset( $post->post_type ) || m_chart()->slug !== $post->post_type ) {
			wp_send_json_error( esc_html__( 'Wrong post type', 'm-chart' ) );
		}

		// Check the nonce
		$nonce = $_POST['nonce'] ?? '';

		if ( ! wp_verify_nonce( $nonce, m_chart()->slug . '-save-post' ) ) {
			wp_send_json_error( esc_html__( 'Invalid nonce', 'm-chart' ) );
		}

		// Check the permissions
		if ( ! current_user_can( 'edit_post', $post->ID ) ) {
			wp_send_json_error( esc_html__( 'Wrong post type', 'm-chart' ) );
		}

		// Make sure there's a CSV file
		if ( empty( $_FILES['import_csv_file']['name'] ) ) {
			wp_send_json_error( esc_html__( 'No file to import', 'm-chart' ) );
		}

		// Check upload-level errors first
		if ( UPLOAD_ERR_OK !== ( $_FILES['import_csv_file']['error'] ?? UPLOAD_ERR_NO_FILE ) ) {
			wp_send_json_error( esc_html__( 'File upload error', 'm-chart' ) );
		}

		if ( ! is_uploaded_file( $_FILES['import_csv_file']['tmp_name'] ) ) {
			wp_send_json_error( esc_html__( 'Invalid upload', 'm-chart' ) );
		}

		// Verify both extension AND MIME (some browsers send text/plain for CSV)
		$file_check = wp_check_filetype_and_ext(
			$_FILES['import_csv_file']['tmp_name'],
			$_FILES['import_csv_file']['name'],
			[ 'csv' => 'text/csv', 'csv-alt' => 'text/plain' ]
		);

		if ( 'csv' !== ( $file_check['ext'] ?? '' ) ) {
			wp_send_json_error( esc_html__( 'Only CSV files can be imported', 'm-chart' ) );
		}

		// Do some validation on the CSV file (mirroring what WP does for this sort of thing)
		$csv_file = realpath( $_FILES['import_csv_file']['tmp_name'] );

		if ( ! $csv_file ) {
			wp_send_json_error( esc_html__( 'File path not found', 'm-chart' ) );
		}

		// Cap file size at 2MB to prevent resource exhaustion
		if ( filesize( $csv_file ) > 2 * 1024 * 1024 ) {
			wp_send_json_error( esc_html__( 'CSV file too large (max 2MB)', 'm-chart' ) );
		}

		$csv_data = file_get_contents( $csv_file );

		if ( '' === $csv_data ) {
			wp_send_json_error( esc_html__( 'CSV file was empty', 'm-chart' ) );
		}

		// Get parseCSV library so we can use it to convert the CSV to a nice array
		// Yes, PHP does this natively now but I've run into trouble with malformed CSV that parsCSV handles fine
		require_once __DIR__ . '/external/parsecsv/parsecsv.lib.php';

		$parse_csv = new parseCSV();

		// The "\n" before and after is to deal with CSV files that don't have line breaks above and below the data
		// Which then seems to confuse parseCSV occasionally
		$csv_data = "\n" . trim( $csv_data ) . "\n";

		// Set delimiter but check to make sure it's safe first
		$parse_csv->delimiter = isset( $_POST['csv_delimiter'] ) && in_array( $_POST['csv_delimiter'], $this->safe_settings[ 'csv_delimiter' ] ) ? $_POST['csv_delimiter'] : m_chart()->get_settings( 'csv_delimiter' );

		// Parse the CSV
		$parse_csv->parse( $csv_data );

		// This deals with Google Doc's crappy CSV exports which don't include columns at the end of a row if they are empty
		$data_array = $this->fix_csv_data( $parse_csv->data );

		wp_send_json_success( $data_array );
	}

	/**
	 * Helper function makes sure that the data array has matching numbers of array elements for each row
	 * CSV from some sources (Google Docs) doesn't include columns that are empty when they are at the end of a row (Why Google? WHY?)
	 *
	 * @param array an array of data as returned from the parseCSV class
	 *
	 * @return array the array of data with matching array value counts
	 */
	public function fix_csv_data( $data_array ) {
		$count = 0;

		// Get largest row count
		foreach ( $data_array as $data ) {
			$temp_count = count( $data );

			$count = ( $temp_count > $count ) ? $temp_count : $count;
		}

		// Fix arrays so value counts match
		foreach ( $data_array as $key => $data ) {
			$temp_count = count( $data );

			if ( $temp_count < $count ) {
				$difference = $count - $temp_count;

				for ( $i = 0; $i < $difference; $i++ ) {
					$data_array[ $key ][] = '';
				}
			}
		}

		return $data_array;
	}

	/**
	 * Converts data array into CSV and outputs it to the browser
	 */
	public function ajax_export_csv() {
		$post_id = $_REQUEST['post_id'] ?? '';
		$nonce   = $_REQUEST['nonce'] ?? '';

		if (
			   ! is_numeric( $post_id )
			|| ! wp_verify_nonce( $nonce, m_chart()->slug . '-save-post' )
			|| ! current_user_can( 'edit_post', absint( $post_id ) )
		) {
			wp_die( esc_html__( 'Unauthorized access', 'm-chart' ), esc_html__( 'You do not have permission to do that', 'm-chart' ), [ 'response' => 401 ] );
		}

		$post = get_post( absint( $post_id ) );

		// If the user passed a data value in their request we'll use it after validation
		if ( isset( $_POST['data'] ) && isset( $_POST['title'] ) ) {
			$data      = m_chart()->validate_data( json_decode( stripslashes( $_POST['data'] ) ) );
			$file_name = sanitize_title( $_POST['title'] );
		} else {
			$data      = m_chart()->get_post_meta( $post->ID, 'data' );
			$file_name = sanitize_title( get_the_title( $post->ID ) );
		}

		$set_name = sanitize_title( $_REQUEST['set_name'] ?? '' );

		if ( empty( $data ) ) {
			return;
		}

		// Prevent CSV/formula injection by prefixing any cell that begins with a formula trigger so spreadsheet apps see it as a literal string
		array_walk_recursive( $data, function ( &$cell ) {
			$cell = $this->neutralize_csv_cell( $cell );
		} );

		require_once __DIR__ . '/external/parsecsv/parsecsv.lib.php';
		$parse_csv = new parseCSV();

		// Set delimiter
		$parse_csv->output_delimiter = m_chart()->get_settings( 'csv_delimiter' );

		$parse_csv->output( $file_name . '-' . $set_name . '.csv', $data );
		die;
	}

	/**
	 * Prefix a cell value with a single quote when it starts with a character that Excel/Sheets/Numbers interpret as a formula trigger
	 *
	 * @param mixed $cell The raw cell value
	 * @return string The cell value, prefixed with ' if it would otherwise execute
	 */
	public function neutralize_csv_cell( $cell ) {
		$cell = (string) $cell;

		if ( '' !== $cell && in_array( $cell[0], [ '=', '+', '-', '@', "\t", "\r" ], true ) ) {
			return "'" . $cell;
		}

		return $cell;
	}

	/**
	 * Returns JSON encoded chart args from $_POST values sent from the admin panel
	 *
	 * @return string a JSON encoded string containing all of the chart args needed to update an active chart
	 */
	public function ajax_get_chart_args() {
		// Check the nonce
		$nonce = $_POST['nonce'] ?? '';

		if ( ! wp_verify_nonce( $nonce, m_chart()->slug . '-save-post' ) ) {
			wp_send_json_error( esc_html__( 'Invalid nonce', 'm-chart' ) );
		}

		// Does the post exist? (post_id is 0 for new charts that haven't been saved yet)
		$post_id = absint( $_POST['post_id'] ?? 0 );

		if ( $post_id ) {
			if ( ! $post = get_post( $post_id ) ) {
				wp_send_json_error( esc_html__( 'Invalid post', 'm-chart' ) );
			}

			if ( ! current_user_can( 'edit_post', $post->ID ) ) {
				wp_send_json_error( esc_html__( 'Permission error', 'm-chart' ) );
			}
		} else {
			// New chart — no saved post yet, build a stub so the library can compute chart args
			if ( ! current_user_can( 'edit_posts' ) ) {
				wp_send_json_error( esc_html__( 'Permission error', 'm-chart' ) );
			}

			$post = new WP_Post( (object) [
				'ID'          => 0,
				'post_title'  => '',
				'post_type'   => m_chart()->slug,
				'post_status' => 'auto-draft',
			] );
		}

		// Is this a valid library?
		$library_slug = $_POST['library'] ?? '';

		if ( ! m_chart()->is_valid_library( $library_slug ) ) {
			wp_send_json_error( esc_html__( 'Invalid library', 'm-chart' ) );
		}

		// This does get potentially overwritten later on
		// However, it's necessary for initial load on a new chart
		if ( 'highcharts' === $library_slug ) {
			$library = m_chart()->library( $library_slug );
		}

		$library = apply_filters( 'm_chart_library_class', m_chart()->library_class, $library_slug );

		// Make sure a third-party filter didn't replace the library with something unusable
		if ( ! is_object( $library ) || ! method_exists( $library, 'get_chart_args' ) ) {
			wp_send_json_error( esc_html__( 'Invalid library', 'm-chart' ) );
		}

		// Set these values so that get_chart_args has them already available before we call it
		$library->args             = m_chart()->get_chart_default_args;
		$library->post             = $post;
		$library->post->post_title = sanitize_text_field( $_POST['title'] ?? '' );

		// validate_post_meta returns only valid post meta values and does data validation on each item
		$library->post_meta = m_chart()->validate_post_meta( $_POST['post_meta'] ?? [] );

		wp_send_json_success( $library->get_chart_args( $library->post->ID, $library->args, true, false ) );
	}

	/**
	 * Return a name spaced field name
	 *
	 * @param string the field name we want to name space
	 *
	 * @param string a name spaced field name
	 */
	public function get_field_name( $field_name, $parent_field_name = '' ) {
		if ( '' !== $parent_field_name ) {
			return m_chart()->slug . '[' . $parent_field_name . ']' . '[' . $field_name . ']';
		}

		return m_chart()->slug . '[' . $field_name . ']';
	}

	/**
	 * Return a name spaced field id
	 *
	 * @param string the field id we want to name space
	 *
	 * @param string a name spaced field id
	 */
	public function get_field_id( $field_name ) {
		return m_chart()->slug . '-' . $field_name;
	}
}
