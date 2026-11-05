<?php
/**
 * Integration tests for M_Chart::render_font_face() and font_face_sources()
 *
 * The iframe template renders every m_chart_iframe_fonts descriptor through these, so each slot has to be allowlisted
 * Runs against the real esc_url() / esc_html() so the https-only source rule is the one WordPress enforces
 */

declare( strict_types=1 );

final class FontFaceTest extends WP_UnitTestCase {

	public function test_renders_a_valid_descriptor(): void {
		$css = M_Chart::render_font_face( [
			'family'  => 'Inter',
			'weight'  => '700',
			'style'   => 'italic',
			'display' => 'block',
			'src'     => [
				[ 'url' => 'https://fonts.example.com/inter.woff2', 'format' => 'WOFF2' ],
				[ 'url' => 'http://insecure.example.com/inter.woff', 'format' => 'woff' ],
			],
		] );

		$this->assertStringContainsString( "font-family: 'Inter'", $css );
		$this->assertStringContainsString( "url('https://fonts.example.com/inter.woff2') format('woff2')", $css );
		$this->assertStringNotContainsString( 'insecure.example.com', $css, 'non https sources are dropped' );
		$this->assertStringContainsString( 'font-weight: 700; font-style: italic; font-display: block;', $css );
		$this->assertStringNotContainsString( 'unicode-range', $css );
	}

	public function test_rejects_an_unusable_family_or_missing_sources(): void {
		$this->assertSame( '', M_Chart::render_font_face( [ 'family' => '<>"\'', 'src' => [ [ 'url' => 'https://x.example/f.woff2' ] ] ] ), 'a family with no allowed characters left is unusable' );
		$this->assertStringContainsString( "font-family: 'script'", M_Chart::render_font_face( [ 'family' => '<script>', 'src' => [ [ 'url' => 'https://x.example/f.woff2' ] ] ] ), 'disallowed characters are stripped, not fatal' );
		$this->assertSame( '', M_Chart::render_font_face( [ 'family' => 'Inter', 'src' => [ [ 'url' => 'javascript:alert(1)' ] ] ] ) );
		$this->assertSame( '', M_Chart::render_font_face( [ 'family' => 'Inter' ] ) );
	}

	public function test_invalid_enum_values_fall_back_and_unicode_range_is_validated(): void {
		$font = [
			'family'        => 'Inter',
			'weight'        => '650',
			'style'         => 'wavy',
			'display'       => 'later',
			'unicode_range' => 'U+0000-00FF, U+0131',
			'src'           => [ [ 'url' => 'https://x.example/f.woff2' ] ],
		];

		$css = M_Chart::render_font_face( $font );

		$this->assertStringContainsString( 'font-weight: 400; font-style: normal; font-display: swap; unicode-range: U+0000-00FF, U+0131;', $css );

		$font['unicode_range'] = 'U+0000; } body { display: none';

		$this->assertStringNotContainsString( 'unicode-range', M_Chart::render_font_face( $font ) );
	}

	public function test_font_face_sources_is_what_the_csp_and_the_rule_share(): void {
		$sources = M_Chart::font_face_sources( [
			'src' => [
				[ 'url' => 'https://a.example/f.woff2', 'format' => 'woff2' ],
				'not-an-array',
				[ 'url' => 'ftp://b.example/f.woff' ],
				[ 'url' => 'https://c.example/f.ttf' ],
			],
		] );

		$this->assertSame(
			[
				[ 'url' => 'https://a.example/f.woff2', 'format' => 'woff2' ],
				[ 'url' => 'https://c.example/f.ttf', 'format' => '' ],
			],
			$sources
		);
	}
}
