<?php
/**
 * Integration tests for M_Chart::unicode_aware_stripslashes()
 *
 * Core stopped using this helper in 2.2.2, the M Chart Highcharts Library still prints its chart args through it:
 *
 *     const chartArgs = <?php echo $this->unicode_aware_stripslashes( json_encode( $args, JSON_HEX_QUOT ) ); ?>;
 *
 * The helper ran stripslashes() over the JSON text, which turned "<\/script>" back into "</script>" and removed
 * the backslash json_encode() puts in front of a typed one, so a Contributor's subtitle or a pair of label cells
 * could end the script element or the string and run script for whoever viewed the chart
 * That library is no longer maintained, so the fix is here
 */

declare( strict_types=1 );

final class UnicodeAwareStripslashesTest extends WP_UnitTestCase {

	/**
	 * What the Highcharts Library does with its args before printing them
	 */
	private function printed( array $args ): string {
		return m_chart()->unicode_aware_stripslashes( json_encode( $args, JSON_HEX_QUOT ) );
	}

	/**
	 * The library addslashes() its titles, which is what the helper was written to undo
	 */
	private function as_the_library_escapes_a_title( string $title ): string {
		return addslashes( stripslashes( html_entity_decode( $title, ENT_QUOTES, 'UTF-8' ) ) );
	}

	private function assert_safe_inside_a_script_element( string $printed ): void {
		$this->assertStringNotContainsString( '<', $printed );
		$this->assertStringNotContainsString( '>', $printed );
		$this->assertStringNotContainsString( '&', $printed );
		$this->assertStringNotContainsString( "'", $printed );
		$this->assertNotNull( json_decode( $printed ), 'Still valid JSON: ' . $printed );
	}

	public function test_a_subtitle_cannot_close_the_script_element(): void {
		// Typed with entities, so it gets past the tag stripping on save
		$typed   = '&lt;/script&gt;&lt;script&gt;alert(document.domain)&lt;/script&gt;';
		$printed = $this->printed( [ 'subtitle' => [ 'text' => $this->as_the_library_escapes_a_title( $typed ) ] ] );

		$this->assert_safe_inside_a_script_element( $printed );
		$this->assertStringNotContainsString( '</script', strtolower( $printed ) );

		// The text itself is unchanged, it is only encoded
		$this->assertSame( '</script><script>alert(document.domain)</script>', json_decode( $printed )->subtitle->text );
	}

	public function test_a_label_ending_in_a_backslash_cannot_end_the_string_it_is_in(): void {
		$printed = $this->printed( [ 'xAxis' => [ 'categories' => [ 'x\\', ']}};alert(document.domain);//' ] ] ] );

		$this->assert_safe_inside_a_script_element( $printed );

		$decoded = json_decode( $printed );

		$this->assertSame( [ 'x\\', ']}};alert(document.domain);//' ], $decoded->xAxis->categories, 'Two labels, exactly as typed' );
	}

	public function test_an_html_comment_opener_is_encoded(): void {
		$printed = $this->printed( [ 'title' => [ 'text' => '<!--<script>' ] ] );

		$this->assert_safe_inside_a_script_element( $printed );
		$this->assertStringNotContainsString( '<!--', $printed );
	}

	public static function titles(): array {
		return [
			'apostrophe'      => [ "Women's sales" ],
			'double quotes'   => [ 'The "big" one' ],
			'ampersand'       => [ 'R&D' ],
			'accents'         => [ 'café €5 ±2°' ],
			'non-latin'       => [ '日本語' ],
			'backslash'       => [ 'C:\\temp' ],
		];
	}

	/**
	 * @dataProvider titles
	 */
	public function test_a_title_the_library_slashed_comes_out_as_typed( string $title ): void {
		$printed = $this->printed( [ 'title' => [ 'text' => $this->as_the_library_escapes_a_title( $title ) ] ] );

		$this->assert_safe_inside_a_script_element( $printed );

		// The library strips slashes from a title before it adds its own, so a typed backslash was already gone by then
		$this->assertSame( stripslashes( $title ), json_decode( $printed )->title->text );
	}

	public function test_cell_text_that_was_never_slashed_keeps_its_backslashes_and_line_breaks(): void {
		$printed = $this->printed( [ 'categories' => [ 'C:\\temp', "two\nlines", "tab\there" ] ] );

		$this->assertSame( [ 'C:\\temp', "two\nlines", "tab\there" ], json_decode( $printed )->categories );
	}

	public function test_objects_and_lists_keep_their_shape_and_numbers_their_type(): void {
		$printed = $this->printed( [
			'empty_list'   => [],
			'empty_object' => new stdClass(),
			'list'         => [ 1, 2.5, true, null ],
			'nested'       => [ 'a' => [ 'b' => [ 'c' ] ] ],
		] );

		$this->assertSame( '{"empty_list":[],"empty_object":{},"list":[1,2.5,true,null],"nested":{"a":{"b":["c"]}}}', $printed );
	}

	public function test_text_that_is_not_json_still_cannot_close_a_script_element(): void {
		$printed = m_chart()->unicode_aware_stripslashes( 'not json </script><script>alert(1)</script> <!-- x' );

		$this->assertStringNotContainsString( '</script', $printed );
		$this->assertStringNotContainsString( '<!--', $printed );
	}

	public function test_plain_json_values_are_returned_as_json(): void {
		$this->assertSame( 'null', m_chart()->unicode_aware_stripslashes( 'null' ) );
		$this->assertSame( '[]', m_chart()->unicode_aware_stripslashes( '[]' ) );
		$this->assertSame( '{}', m_chart()->unicode_aware_stripslashes( '{}' ) );
	}

	public function test_the_library_is_given_a_checked_source_url(): void {
		// Highcharts sets location.href to credits.href on click, with no check of its own
		$chart = self::factory()->post->create( [ 'post_type' => m_chart()->slug, 'post_status' => 'publish' ] );

		update_post_meta( $chart, m_chart()->slug, [ 'library' => 'highcharts', 'source_url' => 'javascript:alert(1)' ] );

		$this->assertSame( '', m_chart()->get_post_meta( $chart, 'source_url' ) );
	}
}
