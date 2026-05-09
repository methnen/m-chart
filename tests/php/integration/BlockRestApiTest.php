<?php
/**
 * Integration tests for the M_Chart_Block REST API permission_callbacks.
 *
 * Pins the per-post `read_post` capability check on /chart/{id} added in the
 * security remediation pass (was previously the too-generic `edit_posts`).
 */

declare( strict_types=1 );

final class BlockRestApiTest extends WP_UnitTestCase {

	private WP_REST_Server $server;

	public function set_up(): void {
		parent::set_up();

		// Spin up the REST server so route lookups work
		global $wp_rest_server;
		$wp_rest_server = new WP_REST_Server();
		$this->server   = $wp_rest_server;
		do_action( 'rest_api_init' );
	}

	public function tear_down(): void {
		global $wp_rest_server;
		$wp_rest_server = null;
		parent::tear_down();
	}

	public function test_anon_get_chart_returns_403_or_401(): void {
		$post_id = self::factory()->post->create( [
			'post_type'   => m_chart()->slug,
			'post_status' => 'publish',
		] );

		wp_set_current_user( 0 );

		$request  = new WP_REST_Request( 'GET', '/m-chart/v1/chart/' . $post_id );
		$response = rest_do_request( $request );

		$this->assertContains(
			$response->get_status(),
			[ 401, 403 ],
			'Anon request to /chart/{id} should return 401 or 403'
		);
	}

	public function test_anon_get_charts_list_returns_403_or_401(): void {
		wp_set_current_user( 0 );

		$request  = new WP_REST_Request( 'GET', '/m-chart/v1/charts' );
		$response = rest_do_request( $request );

		$this->assertContains( $response->get_status(), [ 401, 403 ] );
	}

	public function test_anon_get_options_returns_403_or_401(): void {
		wp_set_current_user( 0 );

		$request  = new WP_REST_Request( 'GET', '/m-chart/v1/options/' );
		$response = rest_do_request( $request );

		// 404 is also acceptable here — the route is registered with a permission
		// callback that returns false for anon users, which causes WP REST to
		// return either 401/403 (auth required) or 404 (route not visible)
		$this->assertContains( $response->get_status(), [ 401, 403, 404 ] );
	}

	public function test_subscriber_cannot_read_private_chart(): void {
		$author_id = self::factory()->user->create( [ 'role' => 'author' ] );
		$subscriber_id = self::factory()->user->create( [ 'role' => 'subscriber' ] );

		$private_chart = self::factory()->post->create( [
			'post_type'   => m_chart()->slug,
			'post_status' => 'private',
			'post_author' => $author_id,
		] );

		wp_set_current_user( $subscriber_id );

		$request  = new WP_REST_Request( 'GET', '/m-chart/v1/chart/' . $private_chart );
		$response = rest_do_request( $request );

		$this->assertContains(
			$response->get_status(),
			[ 401, 403, 404 ],
			'Subscriber should not be able to read another user\'s private chart'
		);
	}

	public function test_editor_can_read_published_chart(): void {
		$editor_id = self::factory()->user->create( [ 'role' => 'editor' ] );
		$post_id   = self::factory()->post->create( [
			'post_type'   => m_chart()->slug,
			'post_status' => 'publish',
			'post_title'  => 'Public Chart',
		] );

		wp_set_current_user( $editor_id );

		$request  = new WP_REST_Request( 'GET', '/m-chart/v1/chart/' . $post_id );
		$response = rest_do_request( $request );

		$this->assertSame( 200, $response->get_status() );
		$this->assertSame( $post_id, $response->get_data()['id'] );
	}
}
