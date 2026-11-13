<?php
/**
 * Integration tests for the chart meta row when it didn't come through the plugin's own save
 *
 * validate_post_meta() is the only place chart meta is cleaned, and it only runs on the plugin's save
 * The "m-chart" key had no protection, so anyone who could edit a chart could write the row raw through
 * WordPress' custom field handling. An import or a direct database write can do the same
 *
 * Two layers are pinned here: the key is protected, and whatever is in the row is safe to read and render
 */

declare( strict_types=1 );

final class MetaHardeningTest extends M_Chart_Integration_Test_Case {

	protected $backupGlobals                  = false;
	protected $beStrictAboutOutputDuringTests = false;

	private const HTML = '<img src=x onerror=alert(1)> </script><script>alert(2)</script> "><svg onload=alert(3)>';

	private int $contributor;

	public function set_up(): void {
		parent::set_up();

		$this->contributor = self::factory()->user->create( [ 'role' => 'contributor' ] );

		wp_set_current_user( $this->contributor );
	}

	private function create_bare_chart( string $status = 'draft' ): int {
		return self::factory()->post->create( [
			'post_type'   => m_chart()->slug,
			'post_status' => $status,
			'post_author' => $this->contributor,
		] );
	}

	private function hostile_row(): array {
		return [
			'library'        => 'chartjs',
			'type'           => 'column',
			'parse_in'       => 'rows',
			'labels'         => 1,
			'legend'         => 1,
			'include_source' => 1,
			'height'         => '400"><svg onload=alert(3)>',
			'theme'          => '../' . self::HTML,
			'subtitle'       => 'SUB ' . self::HTML,
			'y_title'        => 'YT ' . self::HTML,
			'x_title'        => 'XT ' . self::HTML,
			'y_units'        => 'no-such-unit ' . self::HTML,
			'x_units'        => 'no-such-unit',
			'source'         => 'SRC ' . self::HTML,
			'source_url'     => 'javascript:alert(5)//"><svg onload=alert(3)>',
			'set_names'      => [ 'SN0 ' . self::HTML, [ 'nested' ] ],
			'data'           => [ 'sets' => [
				[ [ '', 'H1 ' . self::HTML, 'H2' ], [ 'R1 ' . self::HTML, '1', 'C ' . self::HTML ], [ 'R2', '3', '4' ] ],
				'not a sheet',
			] ],
		];
	}

	public function test_the_chart_meta_keys_are_protected(): void {
		$this->assertTrue( is_protected_meta( 'm-chart', 'post' ) );
		$this->assertTrue( is_protected_meta( 'm-chart-image', 'post' ) );
		$this->assertFalse( is_protected_meta( 'some-other-key', 'post' ) );

		// Not for other object types
		$this->assertFalse( is_protected_meta( 'm-chart', 'user' ) );
	}

	public function test_a_chart_editor_cannot_write_the_row_through_meta_capabilities(): void {
		$chart = $this->create_bare_chart();

		// What XML-RPC and the add-meta AJAX action ask before they write a custom field
		$this->assertTrue( current_user_can( 'edit_post', $chart ) );
		$this->assertFalse( current_user_can( 'add_post_meta', $chart, 'm-chart' ) );
		$this->assertFalse( current_user_can( 'edit_post_meta', $chart, 'm-chart' ) );
		$this->assertFalse( current_user_can( 'delete_post_meta', $chart, 'm-chart' ) );
	}

	public function test_the_custom_field_form_handler_refuses_the_row(): void {
		require_once ABSPATH . 'wp-admin/includes/post.php';

		$chart = $this->create_bare_chart();

		// What post.php passes on when a save carries a new custom field
		$_POST['metakeyinput'] = 'm-chart';
		$_POST['metavalue']    = $this->hostile_row();

		$this->assertFalse( add_meta( $chart ) );
		$this->assertSame( '', get_post_meta( $chart, 'm-chart', true ) );
	}

	public function test_a_hostile_row_is_given_safe_types_on_read(): void {
		$chart = $this->create_bare_chart( 'publish' );

		// Straight into the database, the way an import would
		update_post_meta( $chart, 'm-chart', wp_slash( $this->hostile_row() ) );

		$meta = m_chart()->get_post_meta( $chart );

		$this->assertSame( '', $meta['source_url'], 'A javascript: link never leaves storage' );
		$this->assertSame( [ 'SN0 ' . self::HTML, '' ], $meta['set_names'] );
		$this->assertSame( [], $meta['data']['sets'][1], 'A sheet that is not a list of rows becomes an empty sheet' );

		// Text is not altered, only escaped where it is printed
		$this->assertSame( 'SUB ' . self::HTML, $meta['subtitle'] );
	}

	public function test_an_ordinary_source_url_is_left_exactly_as_stored(): void {
		$chart = $this->create_bare_chart( 'publish' );

		foreach ( [ 'https://example.com/path?a=1&b=2#frag', 'http://example.com/', 'mailto:someone@example.com', '/relative/path' ] as $url ) {
			update_post_meta( $chart, 'm-chart', [ 'library' => 'chartjs', 'source_url' => $url ] );

			$this->assertSame( $url, m_chart()->get_post_meta( $chart, 'source_url' ) );
		}
	}

	public function test_a_row_that_is_not_an_array_is_treated_as_no_meta(): void {
		$chart = $this->create_bare_chart( 'publish' );

		// wp_parse_args() used to read this as a query string and fill the fields from it
		update_post_meta( $chart, 'm-chart', 'type=pie&subtitle=injected&height=99999' );

		$meta = m_chart()->get_post_meta( $chart );

		$this->assertSame( 'line', $meta['type'] );
		$this->assertSame( '', $meta['subtitle'] );
		$this->assertSame( [], $meta['set_names'] );
	}

	public function test_a_hostile_row_renders_without_markup_or_errors(): void {
		$chart = $this->create_bare_chart( 'publish' );

		update_post_meta( $chart, 'm-chart', wp_slash( $this->hostile_row() ) );

		wp_set_current_user( 0 );

		$output = (string) m_chart()->get_chart( $chart );

		$this->assertNotSame( '', $output, 'The chart still renders' );

		// Nothing typed into the row became an element or an attribute
		$this->assertStringNotContainsString( '<img', $output );
		$this->assertStringNotContainsString( '<svg', $output );
		$this->assertSame( 1, substr_count( $output, '<script' ), 'Only the chart script itself' );
		$this->assertSame( 1, substr_count( $output, '</script>' ) );

		// The height reaches the page as a number in both places it is printed
		$this->assertMatchesRegularExpression( '/<canvas[^>]* height="400"[^>]* style="height: 400px;/', $output );

		$this->assertSame( 1, preg_match( '/const chartArgs = (\{.*\});\s*$/m', $output, $match ) );

		$args = json_decode( $match[1], true );

		$this->assertIsArray( $args, 'The chart args are valid JSON' );
		$this->assertSame( '', $args['options']['plugins']['mchart']['source_url'] );

		// A unit that isn't a real term adds nothing to the axis title
		$this->assertStringNotContainsString( 'no-such-unit', (string) $args['options']['scales']['x']['title']['text'] );
	}

	public function test_validate_post_meta_copes_with_values_of_the_wrong_type(): void {
		$validated = m_chart()->validate_post_meta( [
			'library'    => [ 'chartjs' ],
			'type'       => [ 'line' ],
			'subtitle'   => [ 'array', 'not', 'text' ],
			'source_url' => [ 'https://example.com' ],
			'theme'      => [ '_default' ],
			'set_names'  => 'not an array',
			'data'       => 7,
		] );

		$this->assertSame( 'chartjs', $validated['library'] );
		$this->assertSame( 'line', $validated['type'] );
		$this->assertSame( '', $validated['subtitle'] );
		$this->assertSame( '', $validated['source_url'] );
		$this->assertSame( [], $validated['set_names'] );
		$this->assertSame( [], $validated['data']['sets'] );
		$this->assertArrayNotHasKey( 'theme', $validated );
	}

	public function test_set_names_keep_their_text_and_lose_only_non_strings(): void {
		$validated = m_chart()->validate_post_meta( [ 'set_names' => [ 3 => 'R&D <x>', 7 => [ 'nested' ], 9 => 12 ] ] );

		$this->assertSame( [ 'R&D <x>', '', '12' ], $validated['set_names'] );
	}

	public function test_is_valid_library_rejects_anything_that_is_not_a_string(): void {
		$this->assertTrue( m_chart()->is_valid_library( 'chartjs' ) );
		$this->assertFalse( m_chart()->is_valid_library( [ 'chartjs' ] ) );
		$this->assertFalse( m_chart()->is_valid_library( null ) );
		$this->assertFalse( m_chart()->is_valid_library( 0 ) );
	}
}
