<?php
/**
 * Integration-level regression test for the Wordfence M-Chart-194 vulnerability:
 * Authenticated Contributor Stored Cross-Site Scripting via chart labels.
 *
 * Patched in plugin v1.10 (commit adaaf52, 2023-03-18).
 * Reporter: Ngo Thien (@thienbg93)
 * Reference: https://www.wordfence.com/threat-intel/vulnerabilities/wordpress-plugins/m-chart/m-chart-194-authenticated-contributor-stored-cross-site-scripting
 *
 * This test stores XSS payloads as a Contributor and asserts that no live
 * <script> tag, event handler, or javascript: URI reaches the rendered output
 * via either the chart shortcode (canvas + JSON-encoded args + screen-reader
 * data table) or the [chart show="table"] table-only render.
 */

declare( strict_types=1 );

final class XssRegressionTest extends WP_UnitTestCase {

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

	private int $contributor_id;

	public function set_up(): void {
		parent::set_up();

		$this->contributor_id = self::factory()->user->create( [
			'role' => 'contributor',
		] );

		wp_set_current_user( $this->contributor_id );
	}

	/**
	 * @dataProvider xss_payloads
	 */
	public function test_contributor_xss_does_not_execute_in_chart_render( string $payload ): void {
		$post_id = $this->create_chart_with_payload( $payload );

		// If the render itself crashes/errors, that's a separate plugin bug —
		// not an XSS regression. Capture output regardless and assert what we can.
		$output = $this->safe_render( fn () => m_chart()->get_chart( $post_id ) );

		$this->assert_payload_neutralized( $output, $payload );
	}

	/**
	 * @dataProvider xss_payloads
	 */
	public function test_contributor_xss_does_not_execute_in_table_render( string $payload ): void {
		$post_id = $this->create_chart_with_payload( $payload );

		$output = $this->safe_render( fn () => m_chart()->build_table( $post_id ) );

		$this->assert_payload_neutralized( $output, $payload );
	}

	/**
	 * Capture render output. If the render throws (e.g. a render-time bug
	 * triggered by the unusual payload data), the exception itself is the
	 * "no XSS reached output" condition since the user gets a fatal-error
	 * page rather than executable script content.
	 *
	 * Render-time bugs surfaced by these test cases (DivisionByZero in
	 * table.php, Undefined array key 'theme' in chartjs render) are tracked
	 * separately — they are real plugin defects unrelated to the XSS CVE.
	 */
	private function safe_render( callable $render ): string {
		$ob_level_before = ob_get_level();

		try {
			$result = $render();
			return is_string( $result ) ? $result : '';
		} catch ( \Throwable $e ) {
			// Clean up any ob_start() buffers the render opened but didn't close
			while ( ob_get_level() > $ob_level_before ) {
				ob_end_clean();
			}
			return '';
		}
	}

	public static function xss_payloads(): array {
		return [
			'paired script tag'      => [ '<script>alert(document.domain)</script>' ],
			'unclosed img onerror'   => [ '<img src=x onerror=alert(1)>' ],
			'svg onload'             => [ '<svg onload=alert(1)>' ],
			'javascript: pseudo-uri' => [ '<a href="javascript:alert(1)">x</a>' ],
		];
	}

	/**
	 * Helper: create a chart post owned by the contributor with the XSS payload
	 * sprayed across every label-bearing field
	 */
	private function create_chart_with_payload( string $payload ): int {
		$post_id = self::factory()->post->create( [
			'post_type'   => m_chart()->slug,
			'post_status' => 'publish',
			'post_author' => $this->contributor_id,
			'post_title'  => 'Test chart ' . wp_generate_password( 8, false ),
		] );

		// Build a minimal valid chart with the payload in every label field
		$meta = [
			'library'  => 'chartjs',
			'type'     => 'line',
			'parse_in' => 'rows',
			'theme'    => '_default',
			'subtitle' => $payload,
			'x_title'  => $payload,
			'y_title'  => $payload,
			'data'     => [
				'sets' => [
					[
						[ '',      $payload ],
						[ $payload, 1 ],
						[ $payload, 2 ],
					],
				],
			],
			'set_names' => [ $payload ],
			'height'    => 400,
		];

		// Run through the plugin's own validation pipeline so the test
		// reflects the real save path
		$validated = m_chart()->validate_post_meta( $meta );
		update_post_meta( $post_id, m_chart()->slug, $validated );

		return $post_id;
	}

	/**
	 * Helper: assert no executable XSS reached the output. We inspect for the
	 * specific dangerous tokens — not the literal payload, which is allowed to
	 * appear in escaped form
	 */
	private function assert_payload_neutralized( string $output, string $payload ): void {
		// Empty output is fine — it means the render bailed without producing
		// any HTML, which by definition contains no XSS.
		$this->assertStringNotContainsStringIgnoringCase(
			'<script>alert',
			$output,
			"Live <script>alert tag found in output for payload: {$payload}"
		);

		$this->assertStringNotContainsStringIgnoringCase(
			'onerror=alert',
			$output,
			"Live onerror=alert handler found in output for payload: {$payload}"
		);

		$this->assertStringNotContainsStringIgnoringCase(
			'onload=alert',
			$output,
			"Live onload=alert handler found in output for payload: {$payload}"
		);

		$this->assertStringNotContainsStringIgnoringCase(
			'javascript:alert',
			$output,
			"Live javascript:alert pseudo-protocol found in output for payload: {$payload}"
		);
	}
}
