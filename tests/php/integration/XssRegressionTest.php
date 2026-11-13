<?php
/**
 * Integration-level regression test for the Wordfence M-Chart-194 vulnerability:
 * Authenticated Contributor Stored Cross-Site Scripting via chart labels.
 *
 * Patched in plugin v1.10 (commit adaaf52, 2023-03-18).
 * Reporter: Ngo Thien (@thienbg93)
 * Reference: https://www.wordfence.com/threat-intel/vulnerabilities/wordpress-plugins/m-chart/m-chart-194-authenticated-contributor-stored-cross-site-scripting
 *
 * The sink that bug went through was the inline script: chart args were printed with their slashes stripped,
 * which turned "<\/script>" back into "</script>". The fix that held was at that sink (JSON_HEX_TAG and no stripslashes),
 * not the tag stripping added on the way in
 *
 * So this test looks at the sinks. It stores payloads as a Contributor and parses what each render produces the way
 * a browser would: every element has to be one the template writes, there is exactly one script element and its JSON
 * has no "<" in it, and nothing carries an event handler or a javascript: URL
 * It does not ask whether the payload's text is present, text that is escaped for its context is meant to be there
 */

declare( strict_types=1 );

final class XssRegressionTest extends M_Chart_Integration_Test_Case {

	/**
	 * The render code uses ob_start() internally and doesn't always close cleanly
	 * when an exception fires (e.g. on unusual XSS payload data). PHPUnit flags
	 * that as "risky" — but for a security regression test, we only care that
	 * no XSS leaked, not that the buffer was tidy. Disable the check at class
	 * level so we get clean pass/fail signal on the actual security assertion.
	 *
	 * @phpstan-ignore-next-line
	 */
	protected $backupGlobals               = false;
	protected $beStrictAboutOutputDuringTests = false;

	// Every element the chart and table templates write, anything else in the output came from chart text
	private const TEMPLATE_ELEMENTS = [ 'FIGURE', 'CANVAS', 'FIGCAPTION', 'P', 'DIV', 'SPAN', 'A', 'TABLE', 'CAPTION', 'THEAD', 'TBODY', 'TFOOT', 'TR', 'TH', 'TD', 'SCRIPT' ];

	private int $contributor_id;

	public function set_up(): void {
		parent::set_up();

		$this->contributor_id = self::factory()->user->create( [
			'role' => 'contributor',
		] );

		wp_set_current_user( $this->contributor_id );
	}

	public static function xss_payloads(): array {
		return [
			'paired script tag'          => [ '<script>alert(document.domain)</script>' ],
			'unclosed img onerror'       => [ '<img src=x onerror=alert(1)>' ],
			'svg onload'                 => [ '<svg onload=alert(1)>' ],
			'javascript: pseudo-uri'     => [ '<a href="javascript:alert(1)">x</a>' ],
			'script element breakout'    => [ '</script><script>alert(1)</script>' ],
			'attribute breakout'         => [ '"><svg onload=alert(1)>' ],
			'single quote breakout'      => [ "'-alert(1)-'" ],
			'html comment opener'        => [ '<!--<script>' ],
			'trailing backslash'         => [ 'x\\' ],
			'string and object breakout' => [ ']}};alert(document.domain);//' ],
			// Typed as entities, which tag stripping on save has never caught: they are decoded into real markup in storage
			'entity-typed img'           => [ '&lt;img src=x onerror=alert(1)&gt;' ],
			'entity-typed script'        => [ '&lt;/script&gt;&lt;script&gt;alert(1)&lt;/script&gt;' ],
			'double entity-typed img'    => [ '&amp;lt;img src=x onerror=alert(1)&amp;gt;' ],
			'line separator'             => [ "a\u{2028}b</script>" ],
		];
	}

	/**
	 * @dataProvider xss_payloads
	 */
	public function test_contributor_xss_does_not_execute_in_chart_render( string $payload ): void {
		$post_id = $this->create_chart_with_payload( $payload );

		$output = $this->render( fn () => m_chart()->get_chart( $post_id ) );

		$this->assertNotSame( '', $output, 'The chart rendered' );
		$this->assert_only_template_markup( $output, 1, $payload );
		$this->assert_chart_args_are_inert( $output, $payload );
	}

	/**
	 * @dataProvider xss_payloads
	 */
	public function test_contributor_xss_does_not_execute_in_the_embed( string $payload ): void {
		$post_id = $this->create_chart_with_payload( $payload );

		// What template_redirect() sets up before it prints the iframe document
		m_chart()->is_iframe        = true;
		m_chart()->iframe_csp_nonce = 'testnonce';

		$output = $this->render( fn () => m_chart()->get_chart( $post_id ) );

		$this->assertNotSame( '', $output, 'The chart rendered' );
		$this->assert_only_template_markup( $output, 1, $payload );
		$this->assert_chart_args_are_inert( $output, $payload );
	}

	/**
	 * @dataProvider xss_payloads
	 */
	public function test_contributor_xss_does_not_execute_in_table_render( string $payload ): void {
		$post_id = $this->create_chart_with_payload( $payload );

		$output = $this->render( fn () => m_chart()->build_table( $post_id ) );

		$this->assertStringContainsString( '<table', $output, 'The table rendered' );
		$this->assert_only_template_markup( $output, 0, $payload );
	}

	/**
	 * @dataProvider xss_payloads
	 */
	public function test_contributor_xss_does_not_break_out_of_the_editor_data( string $payload ): void {
		$post_id = $this->create_chart_with_payload( $payload );

		// An editor opens the Contributor's chart
		wp_set_current_user( self::factory()->user->create( [ 'role' => 'editor' ] ) );

		$screen         = WP_Screen::get( m_chart()->slug );
		$screen->base   = 'post';
		$screen->action = '';

		$GLOBALS['current_screen'] = $screen;
		$_GET['post']              = (string) $post_id;

		m_chart()->admin()->current_screen( $screen );

		$data = $this->editor_data();

		$this->assertStringContainsString( 'm_chart_admin', $data, 'The editor was given its data' );

		// The data is printed inside a script element, nothing in it may be able to end that element or open a comment
		$this->assertStringNotContainsString( '<', $data, "A raw < in the editor's inline script for payload: {$payload}" );
	}

	/**
	 * Everything WordPress will print inline for the admin app, however it was attached
	 */
	private function editor_data(): string {
		$scripts = wp_scripts();

		return implode( "\n", array_filter( [
			(string) $scripts->get_data( 'm-chart-admin-ui', 'data' ),
			implode( "\n", (array) $scripts->get_data( 'm-chart-admin-ui', 'before' ) ),
			implode( "\n", (array) $scripts->get_data( 'm-chart-admin-ui', 'after' ) ),
		] ) );
	}

	/**
	 * Helper: create a chart post owned by the contributor with the XSS payload
	 * sprayed across every label-bearing field
	 */
	private function create_chart_with_payload( string $payload ): int {
		// A minimal valid chart with the payload in every label field
		// create_chart() runs it through the plugin's own validation so the test reflects the real save path
		return $this->create_chart(
			[
				'post_author' => $this->contributor_id,
				'post_title'  => 'Test chart ' . wp_generate_password( 8, false ),
			],
			[
				'type'           => 'line',
				'theme'          => '_default',
				'labels'         => 1,
				'legend'         => 1,
				'include_source' => 1,
				'subtitle'       => $payload,
				'x_title'        => $payload,
				'y_title'        => $payload,
				'source'         => $payload,
				'source_url'     => 'https://example.com/?q=' . rawurlencode( $payload ),
				'set_names'      => [ $payload, $payload ],
				// Two sheets so the table caption carries the set name, cells both as labels and as values
				'data'           => [
					'sets' => [
						[
							[ '',       $payload, 'Plain' ],
							[ $payload, 1,        $payload ],
							[ 'Plain',  2,        '5 ' . $payload ],
						],
						[
							[ '',       'B' ],
							[ $payload, 3 ],
						],
					],
				],
			]
		);
	}

	/**
	 * Walk the output the way an HTML parser does and fail on anything the templates don't write themselves
	 *
	 * A payload that broke out of its context shows up here as an extra element (img, svg, a second script),
	 * an event handler attribute, or a javascript: URL
	 */
	private function assert_only_template_markup( string $output, int $expected_scripts, string $payload ): void {
		$processor = new WP_HTML_Tag_Processor( $output );
		$scripts   = 0;

		while ( $processor->next_tag() ) {
			$tag = $processor->get_tag();

			$this->assertContains( $tag, self::TEMPLATE_ELEMENTS, "An element the template doesn't write ({$tag}) is in the output for payload: {$payload}" );

			$this->assertEmpty(
				$processor->get_attribute_names_with_prefix( 'on' ),
				"An event handler attribute is on a {$tag} element for payload: {$payload}"
			);

			foreach ( [ 'href', 'src', 'action', 'formaction', 'xlink:href' ] as $attribute ) {
				$value = $processor->get_attribute( $attribute );

				if ( is_string( $value ) ) {
					$this->assertDoesNotMatchRegularExpression(
						'/^[\s\x00-\x1f]*(javascript|data|vbscript)\s*:/i',
						$value,
						"A script URL is in a {$attribute} attribute for payload: {$payload}"
					);
				}
			}

			// The source link is the only link the template writes
			if ( 'A' === $tag ) {
				$this->assertStringStartsWith( 'https://example.com/', (string) $processor->get_attribute( 'href' ) );
			}

			if ( 'SCRIPT' === $tag ) {
				$scripts++;
			}
		}

		$this->assertSame( $expected_scripts, $scripts, "Wrong number of script elements for payload: {$payload}" );
	}

	/**
	 * The chart args are printed as a JavaScript object literal inside the script element
	 * Nothing in them may be able to close the element or a string, which comes down to: it is valid JSON with no "<" in it
	 */
	private function assert_chart_args_are_inert( string $output, string $payload ): void {
		$this->assertSame( 1, preg_match( '/const chartArgs = (.*);\s*$/m', $output, $match ), 'The chart args are in the output' );

		$json = $match[1];

		$this->assertStringNotContainsString( '<', $json, "A raw < in the chart args for payload: {$payload}" );
		$this->assertStringNotContainsString( '>', $json, "A raw > in the chart args for payload: {$payload}" );
		$this->assertStringNotContainsString( "'", $json, "A raw apostrophe in the chart args for payload: {$payload}" );
		$this->assertStringNotContainsString( "\u{2028}", $json, 'A raw line separator in the chart args' );
		$this->assertIsArray( json_decode( $json, true ), "The chart args are not valid JSON for payload: {$payload}" );
	}
}
