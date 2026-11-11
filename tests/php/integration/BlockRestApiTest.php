<?php
/**
 * Integration tests for the M_Chart_Block REST API
 *
 * Pins the per-post `read_post` capability check on /chart/{id} added in the
 * security remediation pass (was previously the too-generic `edit_posts`),
 * and what the three routes hand the block: the chart picker's list, its search and paging, and the site options
 */

declare( strict_types=1 );

final class BlockRestApiTest extends M_Chart_Integration_Test_Case {

	// How many charts the picker shows per page
	private const PER_PAGE = 9;

	public function set_up(): void {
		parent::set_up();

		// Spin up the REST server so route lookups work
		$this->start_rest_server();
	}

	private function as_role( string $role ): void {
		wp_set_current_user( self::factory()->user->create( [ 'role' => $role ] ) );
	}

	/**
	 * GET a route of the plugin's namespace with query parameters
	 */
	private function get( string $route, array $params = [] ): WP_REST_Response {
		$request = new WP_REST_Request( 'GET', '/m-chart/v1' . $route );

		$request->set_query_params( $params );

		return rest_do_request( $request );
	}

	/**
	 * The chart list as the block receives it, checked to be a successful response first
	 */
	private function charts( array $params = [] ): array {
		$response = $this->get( '/charts', $params );

		$this->assertSame( 200, $response->get_status() );

		return $response->get_data();
	}

	/**
	 * Create published charts titled "<prefix> 1" to "<prefix> n", oldest first
	 */
	private function create_charts( int $count, string $prefix = 'Chart' ): array {
		$ids = [];

		for ( $number = 1; $number <= $count; $number++ ) {
			$ids[] = $this->create_chart( [
				'post_title' => $prefix . ' ' . $number,
				'post_date'  => gmdate( 'Y-m-d H:i:s', strtotime( '2026-01-01 00:00:00' ) + $number * HOUR_IN_SECONDS ),
			] );
		}

		return $ids;
	}

	/**
	 * Give a chart the image the editor would have captured for it
	 */
	private function attach_image( int $chart_id, int $width, int $height ): int {
		$image_id = self::factory()->attachment->create_object( 'rest-chart-' . $chart_id . '.png', $chart_id, [ 'post_mime_type' => 'image/png' ] );

		wp_update_attachment_metadata( $image_id, [ 'width' => $width, 'height' => $height, 'file' => 'rest-chart-' . $chart_id . '.png' ] );
		update_post_meta( $chart_id, '_thumbnail_id', $image_id );

		return $image_id;
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

	public function test_charts_list_has_the_total_and_one_entry_per_chart(): void {
		$ids = $this->create_charts( 3 );

		$this->as_role( 'author' );

		$data = $this->charts();

		$this->assertSame( [ 'found_posts', 'posts' ], array_keys( $data ) );
		$this->assertSame( 3, $data['found_posts'] );
		$this->assertCount( 3, $data['posts'] );
		$this->assertSame( array_reverse( $ids ), array_column( $data['posts'], 'id' ), 'Newest first' );
	}

	public function test_each_chart_in_the_list_has_the_fields_the_picker_shows(): void {
		$chart_id = $this->create_chart( [ 'post_title' => 'Quarterly sales' ], [ 'type' => 'pie', 'subtitle' => 'By region' ] );

		$this->as_role( 'author' );

		$chart = $this->charts()['posts'][0];

		$this->assertSame( [ 'id', 'title', 'subtitle', 'url', 'type', 'height', 'width' ], array_keys( $chart ) );
		$this->assertSame( $chart_id, $chart['id'] );
		$this->assertSame( 'Quarterly sales', $chart['title'] );
		$this->assertSame( 'By region', $chart['subtitle'] );
		$this->assertSame( 'pie', $chart['type'] );
	}

	public function test_a_chart_without_an_image_gets_an_empty_url_and_the_default_size(): void {
		$this->create_chart();

		$this->as_role( 'author' );

		$chart = $this->charts()['posts'][0];

		$this->assertSame( '', $chart['url'] );
		$this->assertSame( 1200, $chart['width'] );
		$this->assertSame( 800, $chart['height'] );
	}

	public function test_a_chart_with_an_image_gets_its_address_and_size(): void {
		$chart_id = $this->create_chart();
		$image_id = $this->attach_image( $chart_id, 1800, 1000 );

		$this->as_role( 'author' );

		$chart = $this->charts()['posts'][0];

		$this->assertSame( wp_get_attachment_url( $image_id ), $chart['url'] );
		$this->assertSame( 1800, $chart['width'] );
		$this->assertSame( 1000, $chart['height'] );

		// The single chart route describes the chart the same way
		$this->assertSame( $chart, $this->get( '/chart/' . $chart_id )->get_data() );
	}

	public function test_the_image_is_left_out_while_images_are_switched_off(): void {
		$this->attach_image( $this->create_chart(), 1800, 1000 );

		m_chart()->update_setting( 'performance', 'no-images' );

		$this->as_role( 'author' );

		$chart = $this->charts()['posts'][0];

		$this->assertSame( '', $chart['url'] );
		$this->assertSame( 1200, $chart['width'] );
		$this->assertSame( 800, $chart['height'] );
	}

	public function test_title_and_subtitle_arrive_encoded_and_decode_to_what_was_typed(): void {
		$typed = 'R&D <b>x</b> "q"';

		$this->create_chart( [ 'post_title' => 'Sales & marketing' ], [ 'subtitle' => $typed ] );

		$this->as_role( 'author' );

		$chart = $this->charts()['posts'][0];

		// The block runs both through decodeEntities() and prints them as text
		$this->assertStringNotContainsString( '<', $chart['subtitle'] );
		$this->assertSame( $typed, html_entity_decode( $chart['subtitle'], ENT_QUOTES | ENT_HTML5 ) );
		$this->assertSame( 'Sales & marketing', html_entity_decode( $chart['title'], ENT_QUOTES | ENT_HTML5 ) );
	}

	public function test_a_chart_without_chart_settings_is_listed_with_empty_fields(): void {
		$chart_id = self::factory()->post->create( [ 'post_type' => m_chart()->slug, 'post_status' => 'publish', 'post_title' => 'Bare' ] );

		$this->as_role( 'author' );

		$chart = $this->charts()['posts'][0];

		$this->assertSame( $chart_id, $chart['id'] );
		$this->assertSame( '', $chart['subtitle'] );
		$this->assertSame( '', $chart['type'] );
	}

	public function test_only_published_charts_are_listed(): void {
		$published = $this->create_chart();

		$this->create_chart( [ 'post_status' => 'draft' ] );
		$this->create_chart( [ 'post_status' => 'pending' ] );
		$this->create_chart( [ 'post_status' => 'private' ] );
		$this->create_chart( [ 'post_status' => 'trash' ] );

		// A published post of another type, even one carrying chart settings
		update_post_meta( self::factory()->post->create(), m_chart()->slug, $this->validated_meta() );

		// An administrator could read every one of them, the list is still only what a post can show
		$this->as_role( 'administrator' );

		$data = $this->charts();

		$this->assertSame( [ $published ], array_column( $data['posts'], 'id' ) );
		$this->assertSame( 1, $data['found_posts'] );
	}

	public function test_the_list_is_empty_when_there_are_no_charts(): void {
		$this->as_role( 'author' );

		$this->assertSame( [ 'found_posts' => 0, 'posts' => [] ], $this->charts() );
	}

	public function test_a_subscriber_cannot_list_charts_or_read_the_options(): void {
		$this->create_chart();

		$this->as_role( 'subscriber' );

		$this->assertSame( 403, $this->get( '/charts' )->get_status() );
		$this->assertSame( 403, $this->get( '/options' )->get_status() );
	}

	public function test_a_contributor_can_list_charts_and_read_the_options(): void {
		$this->create_chart();

		$this->as_role( 'contributor' );

		$this->assertSame( 200, $this->get( '/charts' )->get_status() );
		$this->assertSame( 200, $this->get( '/options' )->get_status() );
	}

	public function test_search_finds_charts_by_title(): void {
		$match = $this->create_chart( [ 'post_title' => 'Rainfall in Lisbon' ] );

		$this->create_chart( [ 'post_title' => 'Temperature in Porto' ] );
		$this->create_charts( 3, 'Other' );

		$this->as_role( 'author' );

		$data = $this->charts( [ 's' => 'rainfall' ] );

		$this->assertSame( [ $match ], array_column( $data['posts'], 'id' ) );
		$this->assertSame( 1, $data['found_posts'], 'The total is of the matches, not of every chart' );
	}

	public function test_search_with_no_match_returns_an_empty_list(): void {
		$this->create_charts( 2 );

		$this->as_role( 'author' );

		$this->assertSame( [ 'found_posts' => 0, 'posts' => [] ], $this->charts( [ 's' => 'zzzznomatchzzzz' ] ) );
	}

	public function test_an_empty_search_lists_everything(): void {
		$this->create_charts( 2 );

		$this->as_role( 'author' );

		$this->assertSame( 2, $this->charts( [ 's' => '' ] )['found_posts'] );
		$this->assertSame( 2, $this->charts( [ 's' => '   ' ] )['found_posts'] );
	}

	public function test_search_does_not_reach_charts_that_are_not_published(): void {
		$this->create_chart( [ 'post_title' => 'Secret forecast', 'post_status' => 'draft' ] );
		$this->create_chart( [ 'post_title' => 'Secret budget', 'post_status' => 'private' ] );

		$this->as_role( 'administrator' );

		$this->assertSame( [ 'found_posts' => 0, 'posts' => [] ], $this->charts( [ 's' => 'Secret' ] ) );
	}

	public static function searches_that_match_nothing(): array {
		return [
			'sql quote'           => [ "' OR 1=1 -- " ],
			'sql wildcard'        => [ '%' ],
			'sql wildcard in text' => [ 'P%n' ],
			'sql single wildcard' => [ 'Pl_in' ],
			'union'               => [ "x' UNION SELECT user_pass FROM wp_users -- " ],
			'markup around text'  => [ '<b>nothing here</b>' ],
		];
	}

	/**
	 * @dataProvider searches_that_match_nothing
	 */
	public function test_search_text_is_only_ever_matched_as_text( string $search ): void {
		$this->create_charts( 2, 'Plain' );

		$this->as_role( 'author' );

		$this->assertSame( [ 'found_posts' => 0, 'posts' => [] ], $this->charts( [ 's' => $search ] ) );
	}

	public static function searches_that_are_not_a_search(): array {
		return [
			'only markup'    => [ '<script></script>' ],
			'a list'         => [ [ 'a', 'b' ] ],
			'only spaces'    => [ " \t\n " ],
			'far too long'   => [ str_repeat( 'a', 5000 ) ],
		];
	}

	/**
	 * @dataProvider searches_that_are_not_a_search
	 */
	public function test_a_search_with_nothing_usable_in_it_lists_the_published_charts( $search ): void {
		$ids = $this->create_charts( 2, 'Plain' );

		$this->create_chart( [ 'post_status' => 'draft' ] );

		$this->as_role( 'author' );

		$data = $this->charts( [ 's' => $search ] );

		$this->assertSame( array_reverse( $ids ), array_column( $data['posts'], 'id' ) );
		$this->assertSame( 2, $data['found_posts'] );
	}

	public function test_the_list_comes_nine_charts_to_a_page(): void {
		$ids = array_reverse( $this->create_charts( self::PER_PAGE * 2 + 2 ) );

		$this->as_role( 'author' );

		$first  = $this->charts();
		$second = $this->charts( [ 'page' => 2 ] );
		$third  = $this->charts( [ 'page' => 3 ] );

		$this->assertSame( array_slice( $ids, 0, self::PER_PAGE ), array_column( $first['posts'], 'id' ) );
		$this->assertSame( array_slice( $ids, self::PER_PAGE, self::PER_PAGE ), array_column( $second['posts'], 'id' ) );
		$this->assertSame( array_slice( $ids, self::PER_PAGE * 2 ), array_column( $third['posts'], 'id' ) );

		foreach ( [ $first, $second, $third ] as $page ) {
			$this->assertSame( self::PER_PAGE * 2 + 2, $page['found_posts'], 'Every page reports the same total' );
		}
	}

	public function test_page_one_is_the_default(): void {
		$this->create_charts( self::PER_PAGE + 1 );

		$this->as_role( 'author' );

		$this->assertSame( $this->charts(), $this->charts( [ 'page' => 1 ] ) );
		$this->assertSame( $this->charts(), $this->charts( [ 'page' => '1' ] ) );
	}

	public function test_a_page_past_the_last_one_is_empty(): void {
		$this->create_charts( self::PER_PAGE + 1 );

		$this->as_role( 'author' );

		$this->assertSame( [], $this->charts( [ 'page' => 3 ] )['posts'] );
		$this->assertSame( [], $this->charts( [ 'page' => 999999 ] )['posts'] );
	}

	public function test_paging_applies_to_a_search(): void {
		$this->create_charts( self::PER_PAGE + 2, 'Wind' );
		$this->create_charts( 3, 'Rain' );

		$this->as_role( 'author' );

		$second = $this->charts( [ 's' => 'Wind', 'page' => 2 ] );

		$this->assertSame( self::PER_PAGE + 2, $second['found_posts'] );
		$this->assertCount( 2, $second['posts'] );
		$this->assertStringStartsWith( 'Wind', $second['posts'][0]['title'] );
	}

	public static function pages_that_are_not_a_page_number(): array {
		return [
			'zero'            => [ '0' ],
			'negative'        => [ '-1' ],
			'a word'          => [ 'next' ],
			'empty'           => [ '' ],
			'number and text' => [ '2abc' ],
			'a list'          => [ [ '2' ] ],
			'sql'             => [ '1; DROP TABLE wp_posts' ],
			'less than one'   => [ '0.5' ],
		];
	}

	/**
	 * @dataProvider pages_that_are_not_a_page_number
	 */
	public function test_a_page_that_is_not_a_positive_number_is_a_bad_request( $page ): void {
		$this->create_charts( 2 );

		$this->as_role( 'author' );

		$response = $this->get( '/charts', [ 'page' => $page ] );

		$this->assertSame( 400, $response->get_status() );
		$this->assertSame( 'rest_invalid_param', $response->get_data()['code'] );
	}

	public static function page_numbers_too_large_to_multiply(): array {
		return [
			'beyond any integer'          => [ '99999999999999999999999999' ],
			'the largest integer'         => [ (string) PHP_INT_MAX ],
			// One page further than nine charts a page can be counted in an integer
			'just past what can be paged' => [ (string) ( intdiv( PHP_INT_MAX, self::PER_PAGE ) + 2 ) ],
		];
	}

	/**
	 * @dataProvider page_numbers_too_large_to_multiply
	 */
	public function test_an_enormous_page_number_is_an_empty_page_not_an_error( string $page ): void {
		$this->create_charts( 2 );

		$this->as_role( 'author' );

		$this->assertSame( [], $this->charts( [ 'page' => $page ] )['posts'] );
	}

	public function test_the_options_route_tells_the_block_about_the_site(): void {
		$this->as_role( 'author' );

		$response = $this->get( '/options' );

		$this->assertSame( 200, $response->get_status() );

		$data = $response->get_data();

		$this->assertSame( [ 'siteurl', 'image_support', 'posts_available' ], array_keys( $data ) );
		$this->assertSame( get_option( 'siteurl' ), $data['siteurl'] );
		$this->assertTrue( $data['image_support'], 'Images are generated unless the site switched them off' );
		$this->assertFalse( $data['posts_available'], 'There are no charts yet' );
	}

	public function test_a_logged_out_visitor_is_refused_by_every_route(): void {
		$chart_id = $this->create_chart();

		wp_set_current_user( 0 );

		// The path as register_rest_route() stores it, so each request does reach its permission check
		foreach ( [ '/options', '/charts', '/chart/' . $chart_id ] as $route ) {
			$response = $this->get( $route );

			$this->assertSame( 401, $response->get_status(), $route );
			$this->assertSame( 'rest_forbidden', $response->get_data()['code'], $route );
		}
	}

	public function test_the_options_say_when_images_are_switched_off(): void {
		m_chart()->update_setting( 'performance', 'no-images' );

		$this->as_role( 'author' );

		$this->assertFalse( $this->get( '/options' )->get_data()['image_support'] );
	}

	public function test_the_options_say_when_there_is_a_chart_to_pick(): void {
		$this->as_role( 'author' );

		$this->create_chart( [ 'post_status' => 'draft' ] );

		$this->assertFalse( $this->get( '/options' )->get_data()['posts_available'], 'A draft can\'t be put in a post' );

		$this->create_chart();

		$this->assertTrue( $this->get( '/options' )->get_data()['posts_available'] );
	}

	public function test_the_options_agree_with_the_list_about_a_password_protected_chart(): void {
		$this->create_chart( [ 'post_password' => 'hunter2' ] );

		// A contributor is not shown protected charts in the list
		$this->as_role( 'contributor' );

		$this->assertSame( 0, $this->charts()['found_posts'] );

		// So the block must not be told there is a chart to pick
		$this->assertFalse( $this->get( '/options' )->get_data()['posts_available'] );

		// Someone who can edit every chart is shown it in the list, and told so
		$this->as_role( 'editor' );

		$this->assertSame( 1, $this->charts()['found_posts'] );
		$this->assertTrue( $this->get( '/options' )->get_data()['posts_available'] );
	}
}
