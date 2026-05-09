<?php
/**
 * Unit tests for M_Chart_Admin::neutralize_csv_cell.
 *
 * Pins the CSV / formula injection mitigation added during the security
 * remediation pass. Any cell beginning with =, +, -, @, tab, or carriage
 * return must be prefixed with a single quote so spreadsheet apps treat it
 * as a literal string instead of executing it.
 *
 * References: OWASP CSV Injection (CWE-1236).
 *
 * The method has no instance-state dependency so we use ReflectionClass
 * to skip the constructor (which calls m_chart() and add_action) and test
 * the function in isolation.
 */

declare( strict_types=1 );

use PHPUnit\Framework\TestCase;

require_once dirname( __DIR__, 3 ) . '/components/class-m-chart-admin.php';

final class NeutralizeCsvCellTest extends TestCase {

	private M_Chart_Admin $admin;

	protected function setUp(): void {
		parent::setUp();

		// Skip the constructor — it requires m_chart() and add_action(),
		// neither of which exist in unit-test mode. neutralize_csv_cell
		// is a pure function, so we don't need a constructed instance.
		$reflection  = new ReflectionClass( M_Chart_Admin::class );
		$this->admin = $reflection->newInstanceWithoutConstructor();
	}

	/**
	 * @dataProvider formula_triggers
	 */
	public function test_neutralizes_formula_trigger( string $cell, string $expected ): void {
		$this->assertSame( $expected, $this->admin->neutralize_csv_cell( $cell ) );
	}

	public static function formula_triggers(): array {
		return [
			'equals sign'        => [ '=SUM(A1)',     "'=SUM(A1)" ],
			'plus sign'          => [ '+1+1',         "'+1+1" ],
			'minus sign'         => [ '-2+3',         "'-2+3" ],
			'at sign'            => [ '@CMD',         "'@CMD" ],
			'tab character'      => [ "\tinjection",  "'\tinjection" ],
			'carriage return'    => [ "\rinjection",  "'\rinjection" ],
			'hyperlink formula'  => [ '=HYPERLINK("https://evil","Click")', "'=HYPERLINK(\"https://evil\",\"Click\")" ],
		];
	}

	/**
	 * @dataProvider safe_cells
	 */
	public function test_leaves_safe_cells_unchanged( mixed $cell, string $expected ): void {
		$this->assertSame( $expected, $this->admin->neutralize_csv_cell( $cell ) );
	}

	public static function safe_cells(): array {
		return [
			'plain word'         => [ 'apple',        'apple' ],
			'numeric string'     => [ '123',          '123' ],
			'integer cast'       => [ 42,             '42' ],
			'float cast'         => [ 3.14,           '3.14' ],
			'empty string'       => [ '',             '' ],
			'spaced equals'      => [ ' =SUM(A1)',    ' =SUM(A1)' ],
			'currency value'     => [ '$1,234.56',    '$1,234.56' ],
			'unicode text'       => [ '売上',          '売上' ],
			'newline content'    => [ "line\nbreak",  "line\nbreak" ],
		];
	}
}
