<?php
/**
 * Integration tests for the embed document: when it is served and the Content-Security-Policy it is served with
 *
 * The embed is a bare page that prints one chart, meant to be framed by other pages and, if the site allows it, other sites
 * Its policy denies everything by default and then allows what the chart needs: the site's own scripts, the one inline
 * script that carries the response's nonce, and the font services a theme may load from
 * Site owners widen it through filters, so whatever a filter returns must never be able to add a directive of its own
 */

declare( strict_types=1 );

final class IframeEmbedTest extends M_Chart_Integration_Test_Case {

	private const NONCE = '0123456789abcdef0123456789abcdef';

	private const DIRECTIVES = [ 'default-src', 'style-src', 'script-src', 'font-src', 'img-src', 'connect-src', 'frame-ancestors' ];

	private int $chart_id;

	private bool $permalinks_changed = false;

	public function set_up(): void {
		parent::set_up();

		$this->chart_id = $this->create_chart( [ 'post_title' => 'Embedded chart' ] );
	}

	public function tear_down(): void {
		if ( $this->permalinks_changed ) {
			$this->use_permalink_structure( '' );
		}

		parent::tear_down();
	}

	/**
	 * Switch the site's permalink structure the way saving the Permalinks screen and loading the next page does
	 *
	 * A post type only gets pretty permalinks when the structure is already set as it is registered,
	 * so the chart post type is registered again by the plugin's own init()
	 * The option is rolled back with the test's transaction, the rewrite object and the post type are not, tear_down() puts them back
	 */
	private function use_permalink_structure( string $structure ): void {
		$this->permalinks_changed = '' !== $structure;

		$this->set_permalink_structure( $structure );

		unregister_post_type( m_chart()->slug );
		m_chart()->init();

		flush_rewrite_rules();
	}

	/**
	 * The policy split the way a browser reads it: directive name => its sources
	 */
	private function directives( string $policy ): array {
		$directives = [];

		foreach ( explode( ';', $policy ) as $directive ) {
			$sources = preg_split( '/ +/', trim( $directive, ' ' ), -1, PREG_SPLIT_NO_EMPTY );

			if ( ! $sources ) {
				continue;
			}

			$name = array_shift( $sources );

			$this->assertArrayNotHasKey( $name, $directives, "The {$name} directive is in the policy twice" );

			$directives[ $name ] = $sources;
		}

		return $directives;
	}

	private function policy( array $style_urls = [], array $fonts = [] ): array {
		return $this->directives( m_chart()->iframe_csp( self::NONCE, $this->chart_id, $style_urls, $fonts ) );
	}

	/**
	 * Ask for the chart's embed the way a visitor's request does and run the plugin's handler
	 */
	private function request_embed( int $post_id ): void {
		$this->go_to( add_query_arg( [ 'post_type' => m_chart()->slug, 'p' => $post_id, 'embed' => '1' ], home_url( '/' ) ) );

		m_chart()->template_redirect();
	}

	private function assert_embed_refused( int $post_id, int $status, string $message ): void {
		try {
			$this->request_embed( $post_id );
		} catch ( WPDieException $e ) {
			$this->assertSame( $status, $e->getCode() );
			$this->assertStringContainsString( $message, $e->getMessage() );
			$this->assertFalse( m_chart()->is_iframe, 'Nothing after the refusal treats the request as an embed' );

			return;
		}

		$this->fail( 'The embed should have been refused' );
	}

	public function test_the_default_policy_is_exactly_what_the_embed_has_always_sent(): void {
		$this->assertSame(
			"default-src 'none'; style-src 'self' 'unsafe-inline' fonts.googleapis.com use.typekit.net; script-src 'self' 'nonce-" . self::NONCE . "'; font-src 'self' data: fonts.gstatic.com use.typekit.net p.typekit.net; img-src 'self' data:; connect-src 'self'; frame-ancestors 'self';",
			m_chart()->iframe_csp( self::NONCE, $this->chart_id )
		);
	}

	public function test_everything_not_named_in_the_policy_is_denied(): void {
		$policy = $this->policy();

		$this->assertSame( [ "'none'" ], $policy['default-src'] );
		$this->assertSame( self::DIRECTIVES, array_keys( $policy ) );
	}

	public function test_script_may_only_come_from_the_site_or_carry_the_nonce(): void {
		$this->assertSame( [ "'self'", "'nonce-" . self::NONCE . "'" ], $this->policy()['script-src'] );
	}

	public function test_the_nonce_in_the_policy_is_the_one_it_was_given(): void {
		$other = $this->directives( m_chart()->iframe_csp( 'ffffffffffffffffffffffffffffffff', $this->chart_id ) );

		$this->assertSame( [ "'self'", "'nonce-ffffffffffffffffffffffffffffffff'" ], $other['script-src'] );
	}

	public function test_the_chart_printed_in_an_embed_carries_the_nonce_the_policy_allows(): void {
		// What template_redirect() and the embed template set up before the chart is printed
		m_chart()->is_iframe        = true;
		m_chart()->iframe_csp_nonce = self::NONCE;

		$processor = new WP_HTML_Tag_Processor( $this->render( fn () => m_chart()->get_chart( $this->chart_id ) ) );

		$this->assertTrue( $processor->next_tag( 'script' ), 'The chart printed its inline script' );
		$this->assertSame( self::NONCE, $processor->get_attribute( 'nonce' ) );
		$this->assertFalse( $processor->next_tag( 'script' ), 'There is only the one inline script' );
	}

	public function test_only_the_site_itself_may_frame_the_embed_by_default(): void {
		$this->assertSame( [ "'self'" ], $this->policy()['frame-ancestors'] );
	}

	public function test_the_frame_ancestors_filter_decides_who_may_frame_the_embed(): void {
		$seen = [];

		add_filter( 'm_chart_iframe_frame_ancestors', static function ( $ancestors, $post_id ) use ( &$seen ) {
			$seen[] = $post_id;

			return array_merge( $ancestors, [ 'https://partner.example', 'https://*.news.example' ] );
		}, 10, 2 );

		$this->assertSame( [ "'self'", 'https://partner.example', 'https://*.news.example' ], $this->policy()['frame-ancestors'] );
		$this->assertSame( [ $this->chart_id ], $seen, 'The filter is told which chart is being embedded' );
	}

	public function test_a_site_can_stop_all_framing_through_the_filter(): void {
		add_filter( 'm_chart_iframe_frame_ancestors', static fn() => [ "'none'" ] );

		$this->assertSame( [ "'none'" ], $this->policy()['frame-ancestors'] );
	}

	public function test_the_font_services_are_allowed_by_default(): void {
		$policy = $this->policy();

		$this->assertSame( [ "'self'", "'unsafe-inline'", 'fonts.googleapis.com', 'use.typekit.net' ], $policy['style-src'] );
		$this->assertSame( [ "'self'", 'data:', 'fonts.gstatic.com', 'use.typekit.net', 'p.typekit.net' ], $policy['font-src'] );
	}

	public function test_images_and_requests_are_limited_to_the_site(): void {
		$policy = $this->policy();

		$this->assertSame( [ "'self'", 'data:' ], $policy['img-src'] );
		$this->assertSame( [ "'self'" ], $policy['connect-src'] );
	}

	public function test_hosts_added_through_the_style_and_font_filters_are_allowed(): void {
		$seen = [];

		add_filter( 'm_chart_iframe_csp_style_src', static function ( $hosts, $post_id ) use ( &$seen ) {
			$seen['style'] = $post_id;

			return array_merge( $hosts, [ 'cdn.fontspring.example' ] );
		}, 10, 2 );

		add_filter( 'm_chart_iframe_csp_font_src', static function ( $hosts, $post_id ) use ( &$seen ) {
			$seen['font'] = $post_id;

			return array_merge( $hosts, [ 'https://fonts.cdn.example' ] );
		}, 10, 2 );

		$policy = $this->policy();

		$this->assertContains( 'cdn.fontspring.example', $policy['style-src'] );
		$this->assertContains( 'fonts.googleapis.com', $policy['style-src'], 'The defaults stay unless the filter removes them' );
		$this->assertContains( 'https://fonts.cdn.example', $policy['font-src'] );
		$this->assertNotContains( 'cdn.fontspring.example', $policy['font-src'], 'A stylesheet host is not a font host' );
		$this->assertSame( [ 'style' => $this->chart_id, 'font' => $this->chart_id ], $seen );
	}

	public function test_a_filter_can_take_the_default_hosts_away(): void {
		add_filter( 'm_chart_iframe_csp_style_src', '__return_empty_array' );
		add_filter( 'm_chart_iframe_csp_font_src', '__return_empty_array' );

		$policy = $this->policy();

		$this->assertSame( [ "'self'", "'unsafe-inline'" ], $policy['style-src'] );
		$this->assertSame( [ "'self'", 'data:' ], $policy['font-src'] );
	}

	public function test_the_host_of_a_stylesheet_the_embed_prints_is_allowed(): void {
		$policy = $this->policy( [ 'https://kit.fonts.example/css?family=Inter', '/local.css', 'https://fonts.googleapis.com/css2?family=Lato' ] );

		$this->assertContains( 'kit.fonts.example', $policy['style-src'] );
		$this->assertSame( 1, count( array_keys( $policy['style-src'], 'fonts.googleapis.com', true ) ), 'A host is listed once' );
		$this->assertNotContains( 'kit.fonts.example', $policy['font-src'] );
	}

	public function test_the_host_of_a_font_the_embed_prints_is_allowed(): void {
		$font = [
			'family' => 'Custom',
			'src'    => [
				[ 'url' => 'https://assets.fonts.example/custom.woff2', 'format' => 'woff2' ],
				[ 'url' => 'http://insecure.fonts.example/custom.woff', 'format' => 'woff' ],
			],
		];

		$policy = $this->policy( [], [ $font ] );

		$this->assertContains( 'assets.fonts.example', $policy['font-src'] );
		$this->assertStringContainsString( 'https://assets.fonts.example/custom.woff2', M_Chart::render_font_face( $font ), 'The same source is in the rule the embed prints' );

		// A source the @font-face rule leaves out is not allowed either
		$this->assertNotContains( 'insecure.fonts.example', $policy['font-src'] );
		$this->assertStringNotContainsString( 'insecure.fonts.example', M_Chart::render_font_face( $font ) );
	}

	public static function hostile_sources(): array {
		return [
			'semicolon and a directive' => [ "evil.example; script-src 'unsafe-inline' *" ],
			'directive on its own'      => [ '; script-src *' ],
			'header line break'         => [ "evil.example\r\nSet-Cookie: session=stolen" ],
			'bare newline'              => [ "evil.example\nscript-src *" ],
			'space separated sources'   => [ 'evil.example https://second.example' ],
			'tab separated sources'     => [ "evil.example\thttps://second.example" ],
			'double quotes'             => [ '"evil.example"; script-src *' ],
			'single quoted keyword'     => [ "'none'; script-src 'unsafe-eval'" ],
			'comma and a second policy' => [ "evil.example, script-src *" ],
			'null byte'                 => [ "evil.example\0; script-src *" ],
			'unicode separators'        => [ "evil.example\u{2028}script-src\u{00A0}*" ],
		];
	}

	public static function hostile_sources_per_filter(): array {
		$cases = [];

		foreach ( [ 'm_chart_iframe_csp_style_src' => 'style-src', 'm_chart_iframe_csp_font_src' => 'font-src', 'm_chart_iframe_frame_ancestors' => 'frame-ancestors' ] as $filter => $directive ) {
			foreach ( self::hostile_sources() as $name => $case ) {
				$cases[ $directive . ': ' . $name ] = [ $filter, $directive, $case[0] ];
			}
		}

		return $cases;
	}

	/**
	 * @dataProvider hostile_sources_per_filter
	 */
	public function test_a_hostile_value_from_a_filter_cannot_add_or_change_a_directive( string $filter, string $directive, string $hostile ): void {
		$clean = $this->policy();

		add_filter( $filter, static fn( $sources ) => array_merge( $sources, [ $hostile ] ) );

		$raw    = m_chart()->iframe_csp( self::NONCE, $this->chart_id );
		$policy = $this->directives( $raw );

		// A line break would start a new header, a comma a second policy and a semicolon another directive
		$this->assertDoesNotMatchRegularExpression( '/[\r\n\0,]/', $raw, 'The policy is one policy on one header line' );
		$this->assertSame( count( self::DIRECTIVES ), substr_count( $raw, ';' ), 'No directive separator was added' );
		$this->assertSame( self::DIRECTIVES, array_keys( $policy ), 'No directive was added' );

		foreach ( self::DIRECTIVES as $name ) {
			if ( $name === $directive ) {
				continue;
			}

			$this->assertSame( $clean[ $name ], $policy[ $name ], "The {$name} directive was changed" );
		}

		// Whatever is left of the value is at most one more source in the directive the filter belongs to
		$added = array_values( array_diff( $policy[ $directive ], $clean[ $directive ] ) );

		$this->assertSame( $clean[ $directive ], array_slice( $policy[ $directive ], 0, count( $clean[ $directive ] ) ), 'The sources that were there are untouched' );
		$this->assertLessThanOrEqual( 1, count( $policy[ $directive ] ) - count( $clean[ $directive ] ), 'The value became more than one source: ' . implode( ' | ', $added ) );
	}

	public function test_a_hostile_stylesheet_or_font_url_cannot_add_a_directive(): void {
		$clean = $this->policy();

		$policy = $this->policy(
			[ "https://evil.example;script-src%20*/a.css", "https://evil.example\r\nX-Injected: 1/a.css", 'https://second.example x.example/a.css' ],
			[ [ 'family' => 'X', 'src' => [ [ 'url' => "https://evil.example;script-src *\r\n/x.woff2" ] ] ] ]
		);

		$this->assertSame( self::DIRECTIVES, array_keys( $policy ) );
		$this->assertSame( $clean['script-src'], $policy['script-src'] );
		$this->assertSame( $clean['default-src'], $policy['default-src'] );
		$this->assertSame( $clean['frame-ancestors'], $policy['frame-ancestors'] );
	}

	public function test_the_embed_is_refused_while_embeds_are_switched_off(): void {
		$this->assertSame( '', m_chart()->get_settings( 'embeds' ), 'Embeds are off until a site owner turns them on' );

		$this->assert_embed_refused( $this->chart_id, 403, 'not enabled' );
	}

	public function test_the_embed_is_refused_once_embeds_are_switched_off_again(): void {
		m_chart()->update_setting( 'embeds', 'enabled' );
		m_chart()->update_setting( 'embeds', '' );

		$this->assert_embed_refused( $this->chart_id, 403, 'not enabled' );
	}

	public static function statuses_a_visitor_cannot_see(): array {
		return [
			'draft'   => [ 'draft' ],
			'pending' => [ 'pending' ],
			'private' => [ 'private' ],
			'future'  => [ 'future' ],
			'trash'   => [ 'trash' ],
		];
	}

	/**
	 * @dataProvider statuses_a_visitor_cannot_see
	 */
	public function test_the_embed_is_refused_for_a_chart_a_visitor_cannot_see( string $status ): void {
		m_chart()->update_setting( 'embeds', 'enabled' );

		$post_args = [ 'post_status' => $status ];

		if ( 'future' === $status ) {
			$post_args['post_date'] = gmdate( 'Y-m-d H:i:s', time() + YEAR_IN_SECONDS );
		}

		$this->assert_embed_refused( $this->create_chart( $post_args ), 404, 'could not be found' );
	}

	public function test_the_embed_is_refused_for_a_chart_that_does_not_exist(): void {
		m_chart()->update_setting( 'embeds', 'enabled' );

		$this->assert_embed_refused( $this->chart_id + 9999, 404, 'could not be found' );
	}

	public function test_the_embed_is_refused_for_a_password_protected_chart(): void {
		m_chart()->update_setting( 'embeds', 'enabled' );

		$this->assert_embed_refused( $this->create_chart( [ 'post_password' => 'hunter2' ] ), 403, 'password protected' );
	}

	public function test_a_chart_page_that_is_not_an_embed_is_left_to_wordpress(): void {
		$this->go_to( add_query_arg( [ 'post_type' => m_chart()->slug, 'p' => $this->chart_id ], home_url( '/' ) ) );

		m_chart()->template_redirect();

		$this->assertFalse( m_chart()->is_iframe );
	}

	public function test_the_embed_of_another_post_type_is_left_to_wordpress(): void {
		// WordPress has its own embed endpoint for posts, the plugin's handler only answers for charts
		$this->go_to( add_query_arg( [ 'p' => self::factory()->post->create(), 'embed' => '1' ], home_url( '/' ) ) );

		m_chart()->template_redirect();

		$this->assertFalse( m_chart()->is_iframe );
	}

	/**
	 * The address of the iframe a page shows the chart in
	 */
	private function iframe_src( int $post_id ): string {
		$processor = new WP_HTML_Tag_Processor( (string) m_chart()->get_chart( $post_id ) );

		$this->assertTrue( $processor->next_tag( 'iframe' ), 'The chart is shown in an iframe' );

		return (string) $processor->get_attribute( 'src' );
	}

	public function test_a_chart_on_a_page_becomes_an_iframe_when_embeds_are_on(): void {
		m_chart()->update_setting( 'embeds', 'enabled' );

		$html      = (string) m_chart()->get_chart( $this->chart_id );
		$processor = new WP_HTML_Tag_Processor( $html );

		$this->assertTrue( $processor->next_tag( 'iframe' ) );
		$this->assertSame( 'Embedded chart', $processor->get_attribute( 'title' ) );
		$this->assertSame( '401', $processor->get_attribute( 'height' ), 'The chart height and a pixel so the iframe never scrolls' );
		$this->assertFalse( ( new WP_HTML_Tag_Processor( $html ) )->next_tag( 'script' ), 'The chart itself is only printed inside the embed' );
		$this->assertFalse( ( new WP_HTML_Tag_Processor( $html ) )->next_tag( 'canvas' ) );
	}

	public function test_a_chart_on_a_page_is_printed_in_place_while_embeds_are_off(): void {
		$html = (string) m_chart()->get_chart( $this->chart_id );

		$this->assertFalse( ( new WP_HTML_Tag_Processor( $html ) )->next_tag( 'iframe' ) );
		$this->assertTrue( ( new WP_HTML_Tag_Processor( $html ) )->next_tag( 'canvas' ) );
	}

	public static function permalink_structures(): array {
		return [
			'plain permalinks'        => [ '' ],
			'post name'               => [ '/%postname%/' ],
			'post name, no end slash' => [ '/%postname%' ],
			'index.php in the path'   => [ '/index.php/%year%/%postname%/' ],
		];
	}

	/**
	 * @dataProvider permalink_structures
	 */
	public function test_the_iframe_points_at_an_address_wordpress_reads_as_the_charts_embed( string $structure ): void {
		$this->use_permalink_structure( $structure );

		m_chart()->update_setting( 'embeds', 'enabled' );

		$src = $this->iframe_src( $this->chart_id );

		$this->go_to( $src );

		// What template_redirect() looks at to decide the request is a chart's embed
		$query = $GLOBALS['wp_query']->query;

		$this->assertSame( $this->chart_id, get_queried_object_id(), 'The address leads to the chart: ' . $src );
		$this->assertSame( m_chart()->slug, $query['post_type'] ?? null, 'The address is a chart request: ' . $src );
		$this->assertArrayHasKey( 'embed', $query, 'The address asks for the embed: ' . $src );
	}

	public function test_the_iframe_address_is_the_embed_path_on_a_pretty_permalink(): void {
		$this->use_permalink_structure( '/%postname%/' );

		m_chart()->update_setting( 'embeds', 'enabled' );

		$this->assertStringStartsWith( home_url( '/chart/embedded-chart/embed/?' ), $this->iframe_src( $this->chart_id ) );
	}

	public function test_the_iframe_address_carries_the_arguments_the_chart_was_asked_for(): void {
		m_chart()->update_setting( 'embeds', 'enabled' );

		$processor = new WP_HTML_Tag_Processor( (string) m_chart()->get_chart( $this->chart_id, [ 'show' => 'chart', 'width' => '640' ] ) );

		$this->assertTrue( $processor->next_tag( 'iframe' ) );

		parse_str( (string) wp_parse_url( (string) $processor->get_attribute( 'src' ), PHP_URL_QUERY ), $query );

		$this->assertSame( '640', $query['width'] );
		$this->assertSame( 'chart', $query['show'] );
	}
}
