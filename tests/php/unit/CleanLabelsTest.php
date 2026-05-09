<?php
/**
 * Regression test for the Wordfence M-Chart-194 vulnerability:
 * Authenticated Contributor Stored Cross-Site Scripting via chart labels.
 *
 * Patched in plugin v1.10 (commit adaaf52, 2023-03-18).
 * Reporter: Ngo Thien (@thienbg93)
 * Reference: https://www.wordfence.com/threat-intel/vulnerabilities/wordpress-plugins/m-chart/m-chart-194-authenticated-contributor-stored-cross-site-scripting
 *
 * The vulnerability: M_Chart_Parse::clean_labels() did not escape HTML, so a
 * Contributor could store an XSS payload in any chart label (axis labels, set
 * names, etc.) which executed when the chart rendered.
 *
 * The original fix added esc_html() at the entry point. The current
 * implementation uses html_entity_decode() + a regex tag strip — different
 * approach, but the user-visible contract is the same: no <script>, no event
 * handlers, no javascript: URIs reach the rendered output. This test pins the
 * contract, not the implementation, so it survives future refactors.
 */

declare( strict_types=1 );

use PHPUnit\Framework\TestCase;

require_once dirname( __DIR__, 3 ) . '/components/class-m-chart-parsed-data-point.php';
require_once dirname( __DIR__, 3 ) . '/components/class-m-chart-parse.php';

final class CleanLabelsTest extends TestCase {

	private M_Chart_Parse $parser;

	protected function setUp(): void {
		parent::setUp();
		$this->parser = new M_Chart_Parse();
	}

	/**
	 * @dataProvider xss_payloads
	 */
	public function test_clean_labels_neutralizes_xss( string $payload ): void {
		$cleaned = $this->parser->clean_labels( $payload );

		$this->assertStringNotContainsStringIgnoringCase( '<script', $cleaned, 'Output contains <script tag' );
		$this->assertStringNotContainsStringIgnoringCase( 'onerror=', $cleaned, 'Output contains onerror=' );
		$this->assertStringNotContainsStringIgnoringCase( 'onload=', $cleaned, 'Output contains onload=' );
		$this->assertStringNotContainsStringIgnoringCase( 'onclick=', $cleaned, 'Output contains onclick=' );
		$this->assertStringNotContainsStringIgnoringCase( 'javascript:', $cleaned, 'Output contains javascript: pseudo-protocol' );
		$this->assertStringNotContainsStringIgnoringCase( '<iframe', $cleaned, 'Output contains <iframe tag' );
	}

	public static function xss_payloads(): array {
		return [
			'paired script tag'      => [ '<script>alert(1)</script>' ],
			'script with attrs'      => [ '<script type="text/javascript">alert(1)</script>' ],
			'pre-encoded entities'   => [ '&lt;script&gt;alert(1)&lt;/script&gt;' ],
			'malformed unclosed img' => [ '<img src=x onerror=alert(1)>' ],
			'nested tags'            => [ '<b><script>alert(1)</script></b>' ],
			'javascript: pseudo-uri' => [ '<a href="javascript:alert(1)">click</a>' ],
			'event handler in attr'  => [ '<div onclick="alert(1)">x</div>' ],
			'numeric entity bypass'  => [ '&#x3C;script&#x3E;alert(1)&#x3C;/script&#x3E;' ],
			'iframe injection'       => [ '<iframe src="//evil.example.com"></iframe>' ],
			'svg onload'             => [ '<svg onload=alert(1)>' ],
			'mixed-case bypass'      => [ '<ScRiPt>alert(1)</ScRiPt>' ],
		];
	}

	public function test_clean_labels_preserves_legitimate_content(): void {
		$this->assertSame(
			'Q1 2026 Revenue',
			$this->parser->clean_labels( 'Q1 2026 Revenue' )
		);
	}

	public function test_clean_labels_preserves_unicode(): void {
		$this->assertSame(
			'売上 €1,234',
			$this->parser->clean_labels( '売上 €1,234' )
		);
	}

	public function test_clean_labels_preserves_dollar_amounts_with_comma(): void {
		$this->assertSame(
			'$1,234.56',
			$this->parser->clean_labels( '$1,234.56' )
		);
	}

	public function test_clean_labels_handles_non_string_input(): void {
		$this->assertSame( '42',  $this->parser->clean_labels( 42 ) );
		$this->assertSame( '3.14', $this->parser->clean_labels( 3.14 ) );
		$this->assertSame( '',    $this->parser->clean_labels( null ) );
	}
}
