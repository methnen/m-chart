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

// parse_csv() reports a CSV that is too large as a WP_Error, which doesn't exist without WordPress
if ( ! class_exists( 'WP_Error' ) ) {
	class WP_Error {
		public function __construct( public string $code = '', public string $message = '' ) {}

		public function get_error_message(): string {
			return $this->message;
		}
	}
}

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

	public function test_csv_text_is_never_read_as_a_file_path(): void {
		// parseCSV::parse() opens its argument when it is the path of a readable file
		// parse_csv() wraps the text in line breaks so that can't happen, this is the test that keeps the wrap
		$this->assertTrue( is_readable( __FILE__ ) );
		$this->assertSame( [ [ __FILE__ ] ], M_Chart_Parse::parse_csv_string( __FILE__, ',' ) );
		$this->assertSame( [ [ '/etc/hosts' ] ], M_Chart_Parse::parse_csv_string( '/etc/hosts', ',' ) );
	}

	public function test_a_byte_order_mark_is_not_part_of_the_first_cell(): void {
		$this->assertSame( [ [ 'a', 'b' ], [ '1', '2' ] ], M_Chart_Parse::parse_csv_string( "\xEF\xBB\xBFa,b\n1,2", ',' ) );
	}

	public function test_a_windows_1252_file_is_read_as_the_text_it_holds(): void {
		$windows = mb_convert_encoding( "café €5,±2°\nnaïve,1", 'Windows-1252', 'UTF-8' );

		$this->assertFalse( mb_check_encoding( $windows, 'UTF-8' ) );
		$this->assertSame( [ [ 'café €5', '±2°' ], [ 'naïve', '1' ] ], M_Chart_Parse::parse_csv_string( $windows, ',' ) );
	}

	public function test_utf8_text_is_left_alone(): void {
		$this->assertSame( [ [ 'café €5 ±2°', '日本語' ] ], M_Chart_Parse::parse_csv_string( 'café €5 ±2°,日本語', ',' ) );
	}

	public function test_parse_csv_string_gives_no_rows_for_a_csv_past_the_cell_limit(): void {
		// One wide row and many short ones: a few kilobytes that pad out to millions of cells
		$bomb = str_repeat( ',', 1500 ) . "\n" . str_repeat( "x\n", 1500 );

		$this->assertLessThan( 5000, strlen( $bomb ) );

		Functions\stubs( [
			'__'                 => static fn( $text ) => $text,
			'number_format_i18n' => static fn( $number ) => number_format( (float) $number ),
		] );

		$before = memory_get_usage();
		$rows   = M_Chart_Parse::parse_csv_string( $bomb, ',' );

		$this->assertSame( [], $rows );
		// Padding this to 2.25 million cells takes well over 100MB, parsing it takes a few
		$this->assertLessThan( 32 * 1024 * 1024, memory_get_peak_usage() - $before, 'Nothing was padded' );

		$error = M_Chart_Parse::parse_csv( $bomb, ',' );

		$this->assertInstanceOf( WP_Error::class, $error );
		$this->assertStringContainsString( '2,253,001', $error->get_error_message() );
		$this->assertStringContainsString( '500,000', $error->get_error_message() );
	}

	public function test_a_csv_inside_the_cell_limit_is_still_padded(): void {
		$rows = M_Chart_Parse::parse_csv_string( str_repeat( ',', 199 ) . "\n" . str_repeat( "x\n", 100 ), ',' );

		$this->assertCount( 101, $rows );
		$this->assertCount( 200, $rows[100] );
	}

	/**
	 * @dataProvider cells_for_a_round_trip
	 */
	public function test_build_csv_and_parse_csv_round_trip_a_cell( string $cell ): void {
		foreach ( M_Chart_Parse::CSV_DELIMITERS as $delimiter ) {
			$rows = [ [ 'label', $cell, 'after' ], [ $cell, '1', '2' ] ];
			$csv  = M_Chart_Parse::build_csv( $rows, $delimiter );

			$this->assertSame( $rows, M_Chart_Parse::parse_csv_string( $csv, $delimiter ), 'Delimiter ' . json_encode( $delimiter ) );
		}
	}

	public static function cells_for_a_round_trip(): array {
		return [
			'ampersand'       => [ 'R&D' ],
			'angle brackets'  => [ 'x < y > z' ],
			'quotes'          => [ '"quoted" \'single\'' ],
			'typed entity'    => [ '&amp;' ],
			'typed tag'       => [ '<b>bold</b>' ],
			'accents'         => [ 'café €5 ±2°' ],
			'non-latin'       => [ '日本語' ],
			'backslash'       => [ 'C:\\temp' ],
			'negative'        => [ '-5' ],
			'comma'           => [ 'a,b' ],
			'semicolon'       => [ 'a;b' ],
			'tab'             => [ "a\tb" ],
			'inner space'     => [ 'two words' ],
			'line break'      => [ "line one\nline two" ],
			'only a quote'    => [ '"' ],
		];
	}

	public function test_build_csv_quotes_a_cell_holding_any_possible_separator(): void {
		// Written with commas, opened by an application that splits on semicolons: the cell must not come apart
		$csv = M_Chart_Parse::build_csv( [ [ 'x;=1+1;y', 'a,b', "t\tb", 'plain' ] ], ',' );

		$this->assertSame( "\"x;=1+1;y\",\"a,b\",\"t\tb\",plain\r\n", $csv );
	}

	public function test_build_csv_ends_every_row_with_a_full_line_break(): void {
		$this->assertSame( "a,b\r\n1,2\r\n", M_Chart_Parse::build_csv( [ [ 'a', 'b' ], [ 1, 2 ] ], ',' ) );
		$this->assertSame( '', M_Chart_Parse::build_csv( [], ',' ) );
	}

	public function test_restore_csv_cell_removes_only_the_apostrophe_the_export_added(): void {
		$this->assertSame( '=SUM(A1)', M_Chart_Parse::restore_csv_cell( "'=SUM(A1)" ) );
		$this->assertSame( '-2+3', M_Chart_Parse::restore_csv_cell( "'-2+3" ) );
		$this->assertSame( '＝1+1', M_Chart_Parse::restore_csv_cell( "'＝1+1" ) );
		$this->assertSame( "\u{FEFF}=1+1", M_Chart_Parse::restore_csv_cell( "'\u{FEFF}=1+1" ) );

		// An apostrophe in front of anything else was typed
		$this->assertSame( "'tis", M_Chart_Parse::restore_csv_cell( "'tis" ) );
		$this->assertSame( "'90s", M_Chart_Parse::restore_csv_cell( "'90s" ) );
		$this->assertSame( "'", M_Chart_Parse::restore_csv_cell( "'" ) );
		$this->assertSame( 12, M_Chart_Parse::restore_csv_cell( 12 ) );
	}

	public function test_is_signed_number(): void {
		foreach ( [ '-5', '+5', '-5.25', '-1,234.56', '-$5', '-€ 5', '-5%', '-5°C', '-5 kg', '-1e5', '-1.5E-3' ] as $number ) {
			$this->assertTrue( M_Chart_Parse::is_signed_number( $number ), $number );
		}

		foreach ( [ '-', '+', '-A1', '-5+1', '-5A1', '-5 A1', '-5(1)', '-5|x', '5', '=5', '-5 below zero', "-5\n=1+1", '-5;=1+1' ] as $other ) {
			$this->assertFalse( M_Chart_Parse::is_signed_number( $other ), $other );
		}
	}
}
