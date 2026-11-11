<?php
/**
 * Unit tests for M_Chart_Admin::neutralize_csv_cell.
 *
 * Pins the CSV / formula injection mitigation added during the security
 * remediation pass. Any cell beginning with =, +, -, @, tab, or carriage
 * return must be prefixed with a single quote so spreadsheet apps treat it
 * as a literal string instead of executing it.
 *
 * The one exception is a signed number (-5, +1.5, -$5, -5%), which a
 * spreadsheet only ever reads as that number. Prefixing those turned every
 * negative value in an exported chart into text.
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
			'number then operator' => [ '-5+A1',      "'-5+A1" ],
			'number then reference' => [ '-5A1',      "'-5A1" ],
			'signed reference'   => [ '-A1',          "'-A1" ],
			'absolute reference' => [ '-$A$1',        "'-\$A\$1" ],
			'dde payload'        => [ "-2+3+cmd|' /C calc'!A0", "'-2+3+cmd|' /C calc'!A0" ],
			'phone number'       => [ '+1 555 123',   "'+1 555 123" ],
			'signed call'        => [ '-SUM(1,2)',    "'-SUM(1,2)" ],
			'full-width equals'  => [ '＝1+1',         "'＝1+1" ],
			'byte order mark'    => [ "\u{FEFF}=1+1",   "'\u{FEFF}=1+1" ],
			'zero-width space'   => [ "\u{200B}@SUM(1)", "'\u{200B}@SUM(1)" ],
			'full-width at'      => [ '＠SUM(1)',      "'＠SUM(1)" ],
			// An apostrophe someone typed in front of a trigger gets one more
			// The import takes one off anything shaped like this, so without it the typed one would be lost
			'typed apostrophe'   => [ "'=1+1",         "''=1+1" ],
			'two typed'          => [ "''=1+1",        "'''=1+1" ],
			'typed, then number' => [ "'-5",           "''-5" ],
			'typed, full-width'  => [ "'＝1+1",         "''＝1+1" ],
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
			// A signed number is data: a chart with negative values has to survive an export
			'negative integer'   => [ '-5',           '-5' ],
			'negative decimal'   => [ '-5.25',        '-5.25' ],
			'explicit positive'  => [ '+1.5',         '+1.5' ],
			'negative thousands' => [ '-1,234.56',    '-1,234.56' ],
			'negative currency'  => [ '-$5.00',       '-$5.00' ],
			'negative euro'      => [ '-€5',          '-€5' ],
			'negative percent'   => [ '-5%',          '-5%' ],
			'negative degrees'   => [ '-5°C',         '-5°C' ],
			'negative with unit' => [ '-5 kg',        '-5 kg' ],
			'negative exponent'  => [ '-1.5e3',       '-1.5e3' ],
			'negative float'     => [ -3.5,           '-3.5' ],
			'array is not a cell' => [ [ 'x' ],       '' ],
			// An apostrophe in front of anything that isn't a trigger is just text
			'apostrophe word'    => [ "'tis",          "'tis" ],
			'apostrophe number'  => [ "'90s",          "'90s" ],
			'lone apostrophe'    => [ "'",             "'" ],
		];
	}

	/**
	 * What the export does to a cell, the import undoes: the cell comes back exactly as it was
	 *
	 * @dataProvider cells_for_an_export_and_import
	 */
	public function test_the_import_gives_back_the_cell_the_export_was_given( string $cell ): void {
		$this->assertSame( $cell, M_Chart_Parse::restore_csv_cell( $this->admin->neutralize_csv_cell( $cell ) ) );
	}

	/**
	 * And the cell that goes out can never be read as a formula
	 *
	 * @dataProvider cells_for_an_export_and_import
	 */
	public function test_an_exported_cell_never_starts_with_a_formula_trigger( string $cell ): void {
		$exported = $this->admin->neutralize_csv_cell( $cell );

		if ( M_Chart_Parse::is_signed_number( $cell ) ) {
			$this->assertSame( $cell, $exported );
			return;
		}

		$this->assertDoesNotMatchRegularExpression( '/^[=+\-@\t\r]/', $exported );
	}

	public static function cells_for_an_export_and_import(): array {
		$cells = [
			'=1+1', "'=1+1", "''=1+1", "'''=1+1",
			'-5', "'-5", "''-5", '+1.5', "'+1.5",
			'-2+3', "'-2+3", '@SUM(1)', "'@SUM(1)",
			'＝1+1', "'＝1+1", "\u{FEFF}=1+1", "'\u{FEFF}=1+1",
			"'tis", "'90s", "'", "''", 'plain', '', ' =1+1', "' =1+1",
			"=it's", "'=it's",
		];

		return array_combine( array_map( 'json_encode', $cells ), array_map( static fn( $cell ) => [ $cell ], $cells ) );
	}
}
