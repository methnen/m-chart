<?php
/**
 * Unit tests for M_Chart_Parse::parse_csv_string() and fix_csv_data()
 *
 * The delimiter is always passed explicitly here, the settings fallback needs WordPress
 */

declare( strict_types=1 );

use PHPUnit\Framework\TestCase;
use Brain\Monkey;
use Brain\Monkey\Functions;

require_once dirname( __DIR__, 3 ) . '/components/class-m-chart-parsed-data-point.php';
require_once dirname( __DIR__, 3 ) . '/components/class-m-chart-parse.php';

final class ParseCsvTest extends TestCase {

	protected function setUp(): void {
		parent::setUp();
		Monkey\setUp();

		Functions\stubs( [
			'apply_filters' => static function ( $hook, $value ) {
				return $value;
			},
		] );
	}

	protected function tearDown(): void {
		Monkey\tearDown();
		parent::tearDown();
	}

	public function test_first_row_is_data_not_headings(): void {
		$rows = M_Chart_Parse::parse_csv_string( "Jan,10\nFeb,20\nMar,30", ',' );

		$this->assertSame( [ [ 'Jan', '10' ], [ 'Feb', '20' ], [ 'Mar', '30' ] ], $rows );
	}

	public function test_ragged_rows_are_padded_to_the_widest(): void {
		$rows = M_Chart_Parse::parse_csv_string( "a,b,c\nd\ne,f", ',' );

		$this->assertSame( [ [ 'a', 'b', 'c' ], [ 'd', '', '' ], [ 'e', 'f', '' ] ], $rows );
	}

	public function test_tab_delimiter_and_surrounding_whitespace(): void {
		$rows = M_Chart_Parse::parse_csv_string( "\n\n2014\t100\n2015\t200\n\n", "\t" );

		$this->assertSame( [ [ '2014', '100' ], [ '2015', '200' ] ], $rows );
	}

	public function test_quoted_cells_keep_their_delimiters(): void {
		$rows = M_Chart_Parse::parse_csv_string( "\"Smith, J\",1\n\"Doe, A\",2", ',' );

		$this->assertSame( [ [ 'Smith, J', '1' ], [ 'Doe, A', '2' ] ], $rows );
	}

	public function test_fix_csv_data_pads_and_tolerates_non_array_rows(): void {
		$this->assertSame(
			[ [ 'a', 'b' ], [ 'c', '' ], [ '', '' ] ],
			M_Chart_Parse::fix_csv_data( [ [ 'a', 'b' ], [ 'c' ], 'junk' ] )
		);
		$this->assertSame( [], M_Chart_Parse::fix_csv_data( [] ) );
	}

	public function test_csv_delimiters_constant_matches_the_importer(): void {
		$this->assertSame( [ ',', "\t", ' ', ';' ], M_Chart_Parse::CSV_DELIMITERS );
	}

	public function test_number_symbols_follow_the_locale(): void {
		if ( ! class_exists( 'NumberFormatter' ) ) {
			$this->markTestSkipped( 'intl is not available' );
		}

		$parse = new M_Chart_Parse();

		$this->assertSame( [ 'decimal' => '.', 'thousands' => ',' ], $parse->get_number_symbols( 'en-US' ) );
		$this->assertSame( [ 'decimal' => ',', 'thousands' => '.' ], $parse->get_number_symbols( 'de-DE' ) );
	}
}
