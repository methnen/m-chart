<?php
/**
 * Base class for the integration tests
 *
 * WP_UnitTestCase rolls the database back and restores the hook table after every test, the plugin object lives on
 * So everything the plugin object remembers between calls, and every hook one of its lazily created objects added,
 * is put back to a known state here rather than in each test class
 *
 * The file name doesn't end in Test.php, so PHPUnit never collects it as a test
 * tests/php/bootstrap.php loads it for the integration tier only
 */

declare( strict_types=1 );

/**
 * Thrown in place of a redirect, the message is where it was going and the code is the HTTP status
 */
final class M_Chart_Test_Redirect extends Exception {}

abstract class M_Chart_Integration_Test_Case extends WP_UnitTestCase {

	public function set_up(): void {
		parent::set_up();

		// The Chart.js instance is created lazily and its hooks don't survive WP_UnitTestCase's hook restore
		m_chart()->library( 'chartjs' )->register_hooks();

		$this->reset_plugin_state();
	}

	public function tear_down(): void {
		$this->reset_plugin_state();
		$this->reset_request();

		parent::tear_down();
	}

	/**
	 * Put back what the plugin object memoises or flags for the length of a request
	 *
	 * The settings option is rolled back with the test's transaction, the settings m_chart() has resolved are not
	 * is_iframe and the nonce are what template_redirect() and the embed template leave behind
	 * The instance counter numbers the charts printed on one page and is part of every element id
	 * The data an editor screen hands the admin app stays attached to its script handle
	 */
	protected function reset_plugin_state(): void {
		m_chart()->reset_settings();
		m_chart()->set_preview_request( false );

		m_chart()->is_iframe        = false;
		m_chart()->iframe_csp_nonce = '';
		m_chart()->instance         = 1;

		// $wp_scripts is not reset between tests, and the admin app's handle carries the chart data of whichever editor screen was opened last
		wp_scripts()->remove( 'm-chart-admin-ui' );
	}

	/**
	 * Empty the request the plugin reads from and leave the admin screen
	 *
	 * WP_UnitTestCase empties $_GET, $_POST and $_REQUEST before a test, not after it,
	 * and only newer versions of it reset the current screen
	 */
	protected function reset_request(): void {
		// Everything the plugin reads: its own form fields, post, post_type, library, m-chart-migrated,
		// the AJAX handlers' post_id, nonce, data, title, set, set_name and csv_delimiter, and the nonce fields core checks
		$_GET     = [];
		$_POST    = [];
		$_REQUEST = [];
		$_FILES   = [];

		unset( $_COOKIE[ 'wp-postpass_' . COOKIEHASH ], $_SERVER['HTTP_REFERER'] );

		wp_reset_postdata();

		// is_admin() is false again once there is no screen
		foreach ( [ 'current_screen', 'taxnow', 'typenow' ] as $global ) {
			$GLOBALS[ $global ] = null;
		}

		// A REST server a test started with start_rest_server()
		$GLOBALS['wp_rest_server'] = null;
	}

	/**
	 * Start a REST server with the plugin's routes registered, so rest_do_request() can reach them
	 *
	 * tear_down() takes it away again
	 */
	protected function start_rest_server(): WP_REST_Server {
		global $wp_rest_server;

		$wp_rest_server = new WP_REST_Server();

		do_action( 'rest_api_init' );

		return $wp_rest_server;
	}

	/**
	 * Re-attach one of M_Chart_Admin's hooks
	 *
	 * The admin object is created lazily and adds its hooks in its constructor, so they are only there for the first
	 * test that touches it
	 * Without this a wp_ajax_ or admin_post_ action fires with nothing listening
	 *
	 * @param string $hook          the action or filter name
	 * @param string $method        the M_Chart_Admin method that handles it
	 * @param int    $priority      the priority the constructor uses
	 * @param int    $accepted_args how many arguments the method takes
	 */
	protected function add_admin_hook( string $hook, string $method, int $priority = 10, int $accepted_args = 1 ): void {
		add_filter( $hook, [ m_chart()->admin(), $method ], $priority, $accepted_args );
	}

	/**
	 * Run a request handler that ends in a redirect and return where it sent the browser
	 *
	 * A handler like that calls wp_safe_redirect() and then exit, which would end the test run
	 * The wp_redirect filter is the last thing that runs before the header is sent, throwing from it stops the handler there
	 * A handler that refuses the request with wp_die() throws WPDieException instead, which is left for the test to catch
	 *
	 * @param callable $request the code that runs the handler
	 *
	 * @return string the address of the redirect
	 */
	protected function catch_redirect( callable $request ): string {
		$stop = static function ( $location, $status ) {
			throw new M_Chart_Test_Redirect( (string) $location, (int) $status );
		};

		add_filter( 'wp_redirect', $stop, PHP_INT_MAX, 2 );

		try {
			$request();
		} catch ( M_Chart_Test_Redirect $redirect ) {
			return $redirect->getMessage();
		} finally {
			remove_filter( 'wp_redirect', $stop, PHP_INT_MAX );
		}

		$this->fail( 'The request did not redirect' );
	}

	/**
	 * Create a chart whose meta went through the plugin's own validation
	 *
	 * @param array $post_args overrides for the post: post_status, post_author, post_password and so on
	 * @param array $meta      overrides for the chart meta, given as typed (not slashed)
	 *
	 * @return int the chart's post ID
	 */
	protected function create_chart( array $post_args = [], array $meta = [] ): int {
		$post_id = self::factory()->post->create( array_merge( [
			'post_type'   => m_chart()->slug,
			'post_status' => 'publish',
		], $post_args ) );

		update_post_meta( $post_id, m_chart()->slug, $this->validated_meta( $meta ) );

		return $post_id;
	}

	/**
	 * Chart meta as validate_post_meta() would store it
	 *
	 * validate_post_meta() expects what a form post gives it: text slashed, the sheets not
	 *
	 * @param array $meta overrides for the default column chart, given as typed
	 *
	 * @return array validated meta, ready for update_post_meta()
	 */
	protected function validated_meta( array $meta = [] ): array {
		$meta = array_merge( [
			'library'  => 'chartjs',
			'type'     => 'column',
			'parse_in' => 'rows',
			'height'   => 400,
			'data'     => [ 'sets' => [ [ [ '', 'A', 'B' ], [ 'Row', 1, 2 ] ] ] ],
		], $meta );

		$data = $meta['data'];

		unset( $meta['data'] );

		$meta         = wp_slash( $meta );
		$meta['data'] = $data;

		return m_chart()->validate_post_meta( $meta );
	}

	/**
	 * Run something that renders and return what it produced, whether it returned the markup or printed it
	 *
	 * A render that throws fails the test, and any output buffer it opened and left behind is closed first
	 *
	 * @param callable $render the code that renders
	 *
	 * @return string what was printed followed by what was returned
	 */
	protected function render( callable $render ): string {
		$level = ob_get_level();

		ob_start();

		try {
			$returned = $render();
		} catch ( \Throwable $e ) {
			while ( ob_get_level() > $level ) {
				ob_end_clean();
			}

			$this->fail( 'The render threw: ' . $e->getMessage() );
		}

		$printed = '';

		while ( ob_get_level() > $level ) {
			$printed = ob_get_clean() . $printed;
		}

		return $printed . ( is_string( $returned ) ? $returned : '' );
	}
}
