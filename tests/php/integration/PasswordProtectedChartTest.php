<?php
/**
 * Integration tests for password protected charts
 *
 * A chart published with a post password has the status "publish", so every check that only looked at the status
 * handed the chart to anyone: the chart's own page (the_content filter replaced WordPress's password form),
 * the shortcode, the iframe embed, and the block's REST routes
 *
 * The chart must stay hidden until the visitor has entered the password, the same as any other protected post
 */

declare( strict_types=1 );

final class PasswordProtectedChartTest extends M_Chart_Integration_Test_Case {

	private const PASSWORD = 'hunter2';
	private const MARKER   = 'SECRETROW';

	private int $protected_id;
	private int $open_id;

	public function set_up(): void {
		parent::set_up();

		$this->protected_id = $this->create_marked_chart( [ 'post_password' => self::PASSWORD, 'post_title' => 'Protected chart' ] );
		$this->open_id      = $this->create_marked_chart( [ 'post_title' => 'Open chart' ] );

		wp_set_current_user( 0 );
		unset( $_COOKIE[ 'wp-postpass_' . COOKIEHASH ] );
	}

	private function create_marked_chart( array $post_args ): int {
		return $this->create_chart( $post_args, [
			'subtitle' => 'sub ' . self::MARKER,
			'data'     => [ 'sets' => [ [ [ '', 'A', 'B' ], [ self::MARKER, 1, 2 ] ] ] ],
		] );
	}

	/**
	 * What WordPress stores in the visitor's cookie once they submit the right password
	 */
	private function enter_password(): void {
		require_once ABSPATH . WPINC . '/class-phpass.php';

		$_COOKIE[ 'wp-postpass_' . COOKIEHASH ] = ( new PasswordHash( 8, true ) )->HashPassword( self::PASSWORD );
	}

	private function render_the_content( int $post_id ): string {
		global $post;

		$post = get_post( $post_id );
		setup_postdata( $post );

		return (string) apply_filters( 'the_content', get_the_content() );
	}

	public function test_open_chart_still_renders(): void {
		$this->assertStringContainsString( self::MARKER, (string) m_chart()->get_chart( $this->open_id ) );
		$this->assertStringContainsString( self::MARKER, (string) m_chart()->build_table( $this->open_id ) );
	}

	public function test_get_chart_returns_nothing_without_the_password(): void {
		$this->assertSame( '', m_chart()->get_chart( $this->protected_id ) );
		$this->assertSame( '', m_chart()->get_chart( $this->protected_id, [ 'show' => 'table' ] ) );
		$this->assertSame( '', m_chart()->get_chart( $this->protected_id, [ 'show' => 'image' ] ) );
	}

	public function test_build_table_returns_nothing_without_the_password(): void {
		$this->assertSame( '', m_chart()->build_table( $this->protected_id ) );
	}

	public function test_shortcode_returns_nothing_without_the_password(): void {
		$this->assertSame( '', (string) do_shortcode( '[m-chart id="' . $this->protected_id . '"]' ) );
		$this->assertSame( '', (string) do_shortcode( '[m-chart id="' . $this->protected_id . '" show="table"]' ) );
	}

	public function test_the_content_keeps_the_password_form(): void {
		$content = $this->render_the_content( $this->protected_id );

		$this->assertStringContainsString( 'post-password-form', $content );
		$this->assertStringNotContainsString( self::MARKER, $content );
		$this->assertStringNotContainsString( 'chartArgs', $content );
	}

	public function test_chart_shows_once_the_password_has_been_entered(): void {
		$this->enter_password();

		$this->assertStringContainsString( self::MARKER, (string) m_chart()->get_chart( $this->protected_id ) );
		$this->assertStringContainsString( self::MARKER, (string) m_chart()->build_table( $this->protected_id ) );
		$this->assertStringContainsString( self::MARKER, $this->render_the_content( $this->protected_id ) );
	}

	public function test_a_logged_in_user_is_still_asked_for_the_password_on_the_front_end(): void {
		wp_set_current_user( self::factory()->user->create( [ 'role' => 'administrator' ] ) );

		// The same as WordPress does for any protected post, the role makes no difference
		$this->assertSame( '', m_chart()->get_chart( $this->protected_id ) );
	}

	public function test_embed_refuses_a_protected_chart(): void {
		m_chart()->update_setting( 'embeds', 'enabled' );

		$this->go_to( add_query_arg( [ 'post_type' => m_chart()->slug, 'p' => $this->protected_id, 'embed' => '1' ], home_url( '/' ) ) );

		try {
			m_chart()->template_redirect();
			$this->fail( 'The embed should have refused the chart' );
		} catch ( WPDieException $e ) {
			$this->assertStringContainsString( 'password protected', $e->getMessage() );
		}
	}

	public function test_is_password_locked_is_checked_on_visitor_ajax_requests(): void {
		// admin-ajax.php is is_admin() even for a logged out visitor
		set_current_screen( 'admin-ajax' );
		add_filter( 'wp_doing_ajax', '__return_true' );

		$this->assertTrue( is_admin() );
		$this->assertTrue( m_chart()->is_password_locked( $this->protected_id ) );
		$this->assertFalse( m_chart()->is_password_locked( $this->open_id ) );
	}

	public function test_rest_chart_route_hides_a_protected_chart_from_a_subscriber(): void {
		$this->start_rest_server();

		wp_set_current_user( self::factory()->user->create( [ 'role' => 'subscriber' ] ) );

		$response = rest_do_request( new WP_REST_Request( 'GET', '/m-chart/v1/chart/' . $this->protected_id ) );

		$this->assertSame( 404, $response->get_status() );

		// Someone who can edit the chart still gets it, the block editor needs it
		wp_set_current_user( self::factory()->user->create( [ 'role' => 'editor' ] ) );

		$response = rest_do_request( new WP_REST_Request( 'GET', '/m-chart/v1/chart/' . $this->protected_id ) );

		$this->assertSame( 200, $response->get_status() );
		$this->assertSame( $this->protected_id, $response->get_data()['id'] );
	}

	public function test_rest_charts_list_leaves_protected_charts_out_for_a_contributor(): void {
		$this->start_rest_server();

		wp_set_current_user( self::factory()->user->create( [ 'role' => 'contributor' ] ) );

		$ids = wp_list_pluck( rest_do_request( new WP_REST_Request( 'GET', '/m-chart/v1/charts' ) )->get_data()['posts'], 'id' );

		$this->assertContains( $this->open_id, $ids );
		$this->assertNotContains( $this->protected_id, $ids );

		wp_set_current_user( self::factory()->user->create( [ 'role' => 'editor' ] ) );

		$ids = wp_list_pluck( rest_do_request( new WP_REST_Request( 'GET', '/m-chart/v1/charts' ) )->get_data()['posts'], 'id' );

		$this->assertContains( $this->protected_id, $ids );
	}
}
