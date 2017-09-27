<?php

class M_Chart_Admin {
	private $safe_settings = array(
		'performance' => array(
			'default',
			'no-images',
			'no-preview',
		),
	);

	/**
	 * Constructor
	 */
	public function __construct() {
		$this->plugin_url = m_chart()->plugin_url();

		add_action( 'admin_init', array( $this, 'admin_init' ) );
		add_action( 'admin_menu', array( $this, 'admin_menu' ) );
		add_action( 'current_screen', array( $this, 'current_screen' ) );
		add_action( 'admin_footer', array( $this, 'admin_footer' ) );
		add_action( 'wp_ajax_m_chart_export_csv', array( $this, 'ajax_export_csv' ) );
		add_action( 'wp_ajax_m_chart_get_chart_args', array( $this, 'ajax_get_chart_args' ) );
		add_action( 'wp_ajax_m_chart_import_csv', array( $this, 'ajax_import_csv' ) );
		add_action( 'edit_form_before_permalink', array( $this, 'edit_form_before_permalink' ) );
	}

	/**
	 * Register a Shortcake ui if we can and look for save settings submissions
	 */
	public function admin_init() {
		$this->save_settings();

		if ( ! function_exists( 'shortcode_ui_register_for_shortcode' ) ) {
			return;
		}

		shortcode_ui_register_for_shortcode(
			'chart',
			array(
				'label'         => esc_html__( 'Charts', 'm-chart' ),
				'listItemImage' => 'dashicons-chart-pie',
				'attrs'         => array(
					array(
						'label' => esc_html__( 'Chart', 'm-chart' ),
						'attr'  => 'id',
						'type'  => 'post_select',
						'query' => array(
							'post_type'   => m_chart()->slug,
							'post_status' => 'publish',
						),
					),
				),
			)
		);
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
			array( $this, 'm_chart_settings' )
		);
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
		if (
			   ! isset( $_POST[ m_chart()->slug ] )
			|| ! wp_verify_nonce( $_POST[ m_chart()->slug ]['nonce'], m_chart()->slug . '-save-settings' )
		) {
			return;
		}

		$validated_settings = array();
		$submitted_settings = $_POST[ m_chart()->slug ];

		foreach ( m_chart()->settings as $setting => $default ) {
			if ( ! isset( $submitted_settings[ $setting ] ) ) {
				$validated_settings[ $setting ] = $default;
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
			} elseif ( 'lang_settings' == $setting ) {
				// The language settinsg require a bit more checking
				foreach ( m_chart()->settings['lang_settings'] as $lang_setting => $lang_default ) {
					$lang_value = $submitted_settings['lang_settings'][ $lang_setting ];

					if ( 'numericSymbols' == $lang_setting ) {
						// The numeric symbols are input as a comma seperated string so we'll deal with that here
						$numeric_symbols = explode( ',', $lang_value );
						$safe_symbols = array();

						foreach ( $numeric_symbols as $symbol ) {
							$safe_symbols[] = trim( $symbol );
						}

						$validated_settings[ $setting ][ $lang_setting ] = $safe_symbols;
					} elseif ( 'numericSymbolMagnitude' == $lang_setting ) {
						// Only want positive numbers for the numericSymbolMagnitude value
						if ( is_numeric( $lang_value ) && 0 < $lang_value ) {
							$validated_settings[ $setting ][ $lang_setting ] = absint( $lang_value );
						} else {
							$validated_settings[ $setting ][ $lang_setting ] = $lang_default;
						}
					} else {
						// The rest of the language settings are all single character values
						$validated_settings[ $setting ][ $lang_setting ] = sanitize_text_field( substr( $lang_value, 0, 1 ) );
					}
				}
			} else {
				// Make sure the value is safe before attempting to save it
				if ( preg_match('#^[a-zA-Z0-9-_]+$#', $submitted_settings[ $setting ] ) ) {
					$validated_settings[ $setting ] = $submitted_settings[ $setting ];
				} else {
					$validated_settings[ $setting ] = $default;
				}
			}
		}

		update_option( m_chart()->slug, $validated_settings );

		// Make sure the embed endpoint makes it into the rewrite rules
		flush_rewrite_rules();

		add_action( 'admin_notices', array( $this, 'save_success' ) );
	}

	/**
	 * Display an admin notice that the settings have been saved
	 */
	public function save_success() {
		?>
	    <div class="updated notice">
	         <p><?php esc_html_e( 'Settings saved', 'm-chart' ); ?></p>
	     </div>
		<?php
	}

	/**
	 * Load CSS/Javascript necessary for the interface
	 *
	 * @param object the current screen object as passed by the current_screen action hook
	 */
	public function current_screen( $screen ) {
		if ( m_chart()->slug != $screen->post_type ) {
			return;
		}

		// Only load these if we are on a post page
		if ( 'post' == $screen->base ) {
			// jQuery Mobile Touch Events
			wp_enqueue_script(
				'jquery-mobile-touch-events',
				$this->plugin_url . '/components/external/jquery-mobile/jquery-mobile-touch-events.js',
				array(),
				m_chart()->version
			);

			// Handsontable
			wp_enqueue_style(
				'handsontable',
				$this->plugin_url . '/components/external/handsontable/handsontable.css',
				array(),
				m_chart()->version
			);

			wp_enqueue_script(
				'handsontable',
				$this->plugin_url . '/components/external/handsontable/handsontable.js',
				array( 'jquery' ),
				m_chart()->version
			);

			// Handlebars
			wp_enqueue_script(
				'handlebars',
				$this->plugin_url . '/components/external/handlebars/handlebars.js',
				array(),
				m_chart()->version
			);

			// Highcharts export.js is required for the image generation
			wp_enqueue_script(
				'highcharts-exporting',
				$this->plugin_url . '/components/external/highcharts/exporting.js',
				array( 'highcharts', 'jquery' ),
				m_chart()->version
			);

			// canvg and rgbcolo do the SVG -> Canvas conversion
			wp_enqueue_script(
				'rgbcolor',
				$this->plugin_url . '/components/external/canvg/rgbcolor.js',
				array(),
				m_chart()->version
			);

			wp_enqueue_script(
				'canvg',
				$this->plugin_url . '/components/external/canvg/canvg.js',
				array( 'rgbcolor' ),
				m_chart()->version
			);

			// Admin panel JS
			wp_enqueue_script(
				'm-chart-admin',
				$this->plugin_url . '/components/js/m-chart-admin.js',
				array( 'highcharts', 'jquery' ),
				m_chart()->version
			);

			$settings = m_chart()->get_settings();
			$post_id  = isset( $_GET['post'] ) ? absint( $_GET['post'] ) : '';

			wp_localize_script(
				'm-chart-admin',
				'm_chart_admin',
				array(
					'refresh_counter'       => 0,
					'allow_form_submission' => false,
					'request'               => false,
					'performance'           => $settings['performance'],
					'set_names'             => m_chart()->get_post_meta( $post_id, 'set_names' ),
					'delete_comfirm'        => esc_attr__( 'Are you sure you want to delete this spreadsheet?', 'm-chart' ),
				)
			);
		}

		// Admin panel CSS
		wp_enqueue_style(
			'm-chart-admin',
			$this->plugin_url . '/components/css/m-chart-admin.css',
			array(),
			m_chart()->version
		);
	}

	/**
	 * Add all of the metaboxes needed for the data and chart editing interface
	 */
	public function meta_boxes() {
		global $wp_meta_boxes;

		// Remove excerpt from it's normal spot in the meta_boxes array so we can put it back in after the spreadsheet
		// Users can move metaboxes, but this helps put things in a reasonable place on the first visit
		$excerpt = $wp_meta_boxes[ m_chart()->slug ]['normal']['core']['postexcerpt'];
		unset( $wp_meta_boxes[ m_chart()->slug ]['normal']['core']['postexcerpt'] );

		add_meta_box(
			m_chart()->slug . '-spreadsheet',
			esc_html__( 'Data', 'm-chart' ),
			array( $this, 'spreadsheet_meta_box' ),
			m_chart()->slug,
			'normal',
			'high'
		);

		add_meta_box(
			m_chart()->slug,
			esc_html__( 'Chart', 'm-chart' ),
			array( $this, 'chart_meta_box' ),
			m_chart()->slug,
			'normal',
			'high'
		);

		$wp_meta_boxes[ m_chart()->slug ]['normal']['high']['postexcerpt'] = $excerpt;

		// We are using our own interface for the units so we can remove the units taxonomy metabox
		remove_meta_box( m_chart()->slug . '-unitsdiv', m_chart()->slug, 'side' );
	}

	/**
	 * Displays the spread sheet meta box
	 *
	 * @param object the WP post object as returned by the metabox API
	 */
	public function spreadsheet_meta_box( $post ) {
		$post_meta = m_chart()->get_post_meta( $post->ID );

		// Setup default empty sheet data if needed
		$sheet_data = empty( $post_meta['data'] ) ? array( array( '' ) ) : $post_meta['data']['sets'];

		require_once __DIR__ . '/templates/spreadsheet-meta-box.php';
	}

	/**
	 * Displays the chart meta box
	 *
	 * @param object the WP post object as returned by the metabox API
	 */
	public function chart_meta_box( $post ) {
		$chart     = m_chart()->get_chart( $post->ID );
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

		if ( 'post' != $screen->base || m_chart()->slug != $screen->post_type ) {
			return;
		}
		?>
		<form id="<?php echo esc_attr( $this->get_field_id( 'csv-import-form' ) ); ?>" style="display: none;">
			<input type="file" name="import_csv_file" id="<?php echo esc_attr( $this->get_field_id( 'csv-file' ) ); ?>" class="hide" />
		</form>
		<form action="<?php echo esc_url( admin_url( 'admin-ajax.php?action=m_chart_export_csv' ) ); ?>" id="<?php echo esc_attr( $this->get_field_id( 'csv-export-form' ) ); ?>" style="display: none;" method="post">
			<input type="hidden" name="post_id" value="" id="<?php echo esc_attr( $this->get_field_id( 'csv-post-id' ) ); ?>" />
			<input type="hidden" name="data" value="" id="<?php echo esc_attr( $this->get_field_id( 'csv-data' ) ); ?>" />
			<input type="hidden" name="title" value="" id="<?php echo esc_attr( $this->get_field_id( 'csv-title' ) ); ?>" />
			<input type="hidden" name="set_name" value="" id="<?php echo esc_attr( $this->get_field_id( 'csv-set-name' ) ); ?>" />
		</form>
		<script type="text/javascript">
			<?php do_action( 'm_chart_admin_footer_javascript' ); ?>
		</script>
		<?php
	}

	/**
	 * Inserts a subtitle field under the title field on the chart edit form and includes the handlebars templates we'll need
	 *
	 * @param object the WP post object as returned by the metabox API
	 */
	public function edit_form_before_permalink( $post ) {
		if ( m_chart()->slug != $post->post_type ) {
			return;
		}

		$post_meta = m_chart()->get_post_meta( $post->ID );

		require_once __DIR__ . '/templates/subtitle-field.php';
		require_once __DIR__ . '/templates/handlebars.php';
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
		if ( ! isset( $post->post_type ) || m_chart()->slug != $post->post_type ) {
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
		if ( ! wp_verify_nonce( $_POST[ m_chart()->slug ]['nonce'], m_chart()->slug . '-save-post' ) ) {
			return;
		}

		unset( $_POST[ m_chart()->slug ]['nonce'] );

		// Check the permissions
		if ( ! current_user_can( 'edit_post', $post->ID ) ) {
			return;
		}

		// If there's an image being passed attach it to the chart post
		$this->attach_image();

		// Make sure we don't overrwrite existing settings in the case someone hits update too quickly
		if (
			   isset( $_POST[ m_chart()->slug ]['library'] )
			// Make sure the library value is clean and valid before trying to use it
			&& m_chart()->is_valid_library( $_POST[ m_chart()->slug ]['library'] )
		) {
			// Load the library in question in case there's a filter/action we'll need
			if ( 'highcharts' == $_POST[ m_chart()->slug ]['library'] ) {
				m_chart()->highcharts();
			}

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
		if ( 'default' != $settings['performance'] ) {
			return;
		}

		if ( ! is_numeric( $_POST['post_ID'] ) ) {
			return;
		}

		$post_id = absint( $_POST['post_ID'] );

		if ( ! current_user_can( 'edit_post', $post_id ) ) {
			return false;
		}

		if ( ! $post = get_post( $post_id ) ) {
			return false;
		}

		if ( '' == $_POST[ m_chart()->slug ]['img'] ) {
			return false;
		}

		// Decode the image so we can save it
		$decoded_img = base64_decode( str_replace( 'data:image/png;base64,', '', $_POST[ m_chart()->slug ]['img'] ) );

		if ( '' == $decoded_img ) {
			return false;
		}

		// Check for an existing attached image
		$attachments = get_posts(
			array(
				'post_type'      => 'attachment',
				'posts_per_page' => 1,
				'post_parent'    => $post->ID,
				'meta_key'       => m_chart()->slug . '-image',
			)
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
	 * @return array an array fo the data from the imported CSV file ready for use in the chart meta
	 */
	public function ajax_import_csv() {
		$post = get_post( absint( $_POST['post_id'] ) );

		// Check post type
		if ( ! isset( $post->post_type ) || m_chart()->slug != $post->post_type ) {
			wp_send_json_error( esc_html__( 'Wrong post type', 'm-chart' ) );
		}

		// Check the nonce
		if ( ! wp_verify_nonce( $_POST['nonce'], m_chart()->slug . '-save-post' ) ) {
			wp_send_json_error( esc_html__( 'Invalid nonce', 'm-chart' ) );
		}

		// Check the permissions
		if ( ! current_user_can( 'edit_post', $post->ID ) ) {
			wp_send_json_error( esc_html__( 'Wrong post type', 'm-chart' ) );
		}

		// Make sure there's a CSV file
		if ( empty( $_FILES ) || ! isset( $_FILES['import_csv_file']['name'] ) ) {
			wp_send_json_error( esc_html__( 'No file to import', 'm-chart' ) );
		}

		// Make sure the file is a CSV file
		$file_ext = strtolower( pathinfo( $_FILES['import_csv_file']['name'], PATHINFO_EXTENSION ) );

		if ( 'csv' != $file_ext ) {
			wp_send_json_error( esc_html__( 'Only CSV files can be imported ', 'm-chart' ) );
		}

		// Do some validation on the CSV file (mirroring what WP does for this sort of thing)
		$csv_file = realpath( $_FILES['import_csv_file']['tmp_name'] );

		if ( ! $csv_file ) {
			wp_send_json_error( esc_html__( 'File path not found', 'm-chart' ) );
		}

		$csv_data = file_get_contents( $csv_file );

		if ( '' == $csv_data ) {
			wp_send_json_error( esc_html__( 'CSV file was empty', 'm-chart' ) );
		}

		// Get parseCSV library so we can use it to convert the CSV to a nice array
		// Yes, PHP does this natively now but I've run into trouble with malformed CSV that parsCSV handles fine
		require_once __DIR__ . '/external/parsecsv/parsecsv.lib.php';

		$parse_csv = new parseCSV();

		// The "\n" before and after is to deal with CSV files that don't have line breaks above and below the data
		// Which then seems to confuse parseCSV occasionally
		$parse_csv->parse( "\n" . trim( $csv_data ) . "\n" );

		// This deals with Google Doc's crappy CSV exports which don't include columns at the end of a row if they are empty
		$data_array = $this->fix_csv_data_array( $parse_csv->data );

		wp_send_json_success( $data_array );
	}

	/**
	 * Helper function makes sure that the data array has matching numbers of array elements for each row
	 * CSV from some sources (Google Docs) doesn't include columns that are empty when they are at the end of a row (Why Google? WHY?)
	 *
	 * @param array an array of data as returned from the parseCSV class
	 *
	 * @param array the array of data with matching array value counts
	 */
	public function fix_csv_data_array( $data_array ) {
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
	 * Converts data array into CSV outputs it to the browser
	 */
	public function ajax_export_csv() {
		// Purposely using $_REQUEST here since this method can work via a GET and POST request
		// POST requests are used when passing the data value since it's too big to pass via GET
		if ( ! is_numeric( $_REQUEST['post_id'] )  || ! current_user_can( 'edit_post', absint( $_REQUEST['post_id'] ) ) ) {
			wp_die( 'Unauthorized access', 'You do not have permission to do that', array( 'response' => 401 ) );
		}

		$post = get_post( absint( $_REQUEST['post_id'] ) );

		// If the user passed a data value in their request we'll use it after validation
		if ( isset( $_POST['data'] ) && isset( $_POST['title'] ) ) {
			$data      = m_chart()->validate_data( json_decode( stripslashes( $_POST['data'] ) ) );
			$file_name = sanitize_title( $_POST['title'] );
		}
		else {
			$data      = m_chart()->get_post_meta( $post->ID, 'data' );
			$file_name = sanitize_title( get_the_title( $post->ID ) );
		}

		$set_name = sanitize_title( $_REQUEST['set_name'] );

		if ( empty( $data ) ) {
			return;
		}

		require_once __DIR__ . '/external/parsecsv/parsecsv.lib.php';
		$parse_csv = new parseCSV();

		$parse_csv->output( $file_name . '-' . $set_name . '.csv', $data );
		die;
	}

	/**
	 * Returns JSON encoded chart args from $_POST values sent from the admin panel
	 *
	 * @return string a JSON encoded string containing all of the chart args needed to update an active chart
	 */
	public function ajax_get_chart_args() {
		// Check the nonce
		if ( ! wp_verify_nonce( $_POST['nonce'], m_chart()->slug . '-save-post' ) ) {
			wp_send_json_error( esc_html__( 'Invalid nonce', 'm-chart' ) );
		}

		// Does the post exist?
		if ( ! $post = get_post( absint( $_POST['post_id'] ) ) ) {
			wp_send_json_error( esc_html__( 'Invalid post', 'm-chart' ) );
		}

		// Can the user edit this post?
		if ( ! current_user_can( 'edit_post', $post->ID ) ) {
			wp_send_json_error( esc_html__( 'Permission error', 'm-chart' ) );
		}

		// Is this a valid library?
		if ( ! m_chart()->is_valid_library( $_POST['library'] ) ) {
			wp_send_json_error( esc_html__( 'Invalid library', 'm-chart' ) );
		}

		if ( 'highcharts' == $_POST['library'] ) {
			$library = m_chart()->highcharts();
		}

		// Set these values so that get_chart_args has them already available before we call it
		$library->args = m_chart()->get_chart_default_args;
		$library->post = $post;
		$library->post->post_title = sanitize_text_field( $_POST['title'] );

		// validate_post_meta returns only valid post meta values and does data validation on each item
		$library->post_meta = m_chart()->validate_post_meta( $_POST['post_meta'] );

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
		if ( '' != $parent_field_name ) {
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
