<?php
/**
 * Unit tests for M_Chart_Parse parsing helpers.
 *
 * Pure-function tests against the parser without any WP environment.
 */

declare( strict_types=1 );

use PHPUnit\Framework\TestCase;
use Brain\Monkey;
use Brain\Monkey\Functions;

require_once dirname( __DIR__, 3 ) . '/components/class-m-chart-parsed-data-point.php';
require_once dirname( __DIR__, 3 ) . '/components/class-m-chart-parse.php';

final class ParseTest extends TestCase {

	private M_Chart_Parse $parser;

	protected function setUp(): void {
		parent::setUp();
		Monkey\setUp();

		// parse_data() routes its labels and data through apply_filters( 'm_chart_value_labels' / 'm_chart_set_data' / 'm_chart_raw_data' )
		// Stub it as a passthrough so we test the parser, not the filter chain
		Functions\stubs( [
			'apply_filters' => static function ( $hook, $value ) {
				return $value;
			},
		] );

		$this->parser = new M_Chart_Parse();
	}

	protected function tearDown(): void {
		Monkey\tearDown();
		parent::tearDown();
	}

	public function test_parse_data_point_extracts_number_with_dollar_prefix(): void {
		$point = $this->parser->parse_data_point( '$1,234.56' );

		$this->assertTrue( $point->is_numeric() );
		$this->assertSame( 1234.56, $point->value );
		$this->assertSame( '$',     $point->prefix );
		$this->assertSame( '',      $point->suffix );
	}

	public function test_parse_data_point_extracts_number_with_unit_suffix(): void {
		$point = $this->parser->parse_data_point( '42°F' );

		$this->assertTrue( $point->is_numeric() );
		$this->assertSame( 42.0,    $point->value );
		$this->assertSame( '',      $point->prefix );
		$this->assertSame( '°F',    $point->suffix );
	}

	public function test_parse_data_point_handles_prefix_and_suffix_together(): void {
		$point = $this->parser->parse_data_point( '$1,234.56°F' );

		$this->assertTrue( $point->is_numeric() );
		$this->assertSame( 1234.56, $point->value );
		$this->assertSame( '$',     $point->prefix );
		$this->assertSame( '°F',    $point->suffix );
	}

	public function test_parse_data_point_handles_pure_text(): void {
		$point = $this->parser->parse_data_point( 'No value here' );

		$this->assertFalse( $point->is_numeric() );
		$this->assertSame( 'No value here', $point->text );
	}

	public function test_parse_data_point_handles_empty_string(): void {
		$point = $this->parser->parse_data_point( '' );

		$this->assertFalse( $point->is_numeric() );
		$this->assertSame( '', $point->text );
	}

	public function test_clean_data_point_strips_thousands_commas(): void {
		$this->assertSame( 1234567.89, $this->parser->clean_data_point( '1,234,567.89' ) );
	}

	public function test_clean_data_point_returns_string_for_non_numeric(): void {
		$this->assertSame( 'abc', $this->parser->clean_data_point( 'abc' ) );
	}

	public function test_parse_data_with_first_column_labels_rows_direction(): void {
		// 4×3 with text in first column and first row.
		// The parser's heuristic picks LABELS_FIRST_COLUMN because [0][1] is text
		// and [1][0] is text, but [0][0] doesn't matter for the routing
		$data = [
			[ 'X',  'Series A', 'Series B' ],
			[ 'Q1', 10, 20 ],
			[ 'Q2', 11, 21 ],
			[ 'Q3', 12, 22 ],
		];

		$this->parser->parse_data( $data, M_Chart_Parse::PARSE_ROWS );

		$this->assertSame(
			M_Chart_Parse::LABELS_FIRST_COLUMN,
			$this->parser->value_labels_position
		);

		// First column values become labels: ['X', 'Q1', 'Q2', 'Q3']
		$this->assertSame(
			[ 'X', 'Q1', 'Q2', 'Q3' ],
			$this->parser->value_labels
		);
	}

	public function test_parse_data_jagged_rows_with_both_labels(): void {
		// Empty corner cell signals LABELS_BOTH. The parser preserves the jagged
		// shape as-is — it does NOT auto-pad. Downstream code is responsible for
		// handling missing trailing values
		$data = [
			[ '',     'A', 'B', 'C', 'D' ],
			[ 'r1',   1,   2,   3,   4 ],
			[ 'r2',   5,   6,   7,   8 ],
			[ 'r3',   9,   10,  11 ],     // missing D
			[ 'r4',   13,  14 ],          // missing C, D
		];

		$this->parser->parse_data( $data, M_Chart_Parse::PARSE_ROWS );

		$this->assertSame( M_Chart_Parse::LABELS_BOTH, $this->parser->value_labels_position );

		// First row labels (after stripping the corner): ['A', 'B', 'C', 'D']
		$this->assertSame(
			[ 'A', 'B', 'C', 'D' ],
			$this->parser->value_labels[ M_Chart_Parse::LABELS_FIRST_ROW ]
		);

		// First column labels: ['r1', 'r2', 'r3', 'r4']
		$this->assertSame(
			[ 'r1', 'r2', 'r3', 'r4' ],
			$this->parser->value_labels[ M_Chart_Parse::LABELS_FIRST_COLUMN ]
		);

		// set_data preserves jagged shape — full rows are full, short rows stay short
		$widths = array_map( 'count', $this->parser->set_data );
		$this->assertSame( [ 4, 4, 3, 2 ], $widths );
	}

	public function test_label_position_with_year_labels_in_rows_mode(): void {
		// Years as numeric-looking strings in column 0 — historically PHP's is_numeric()
		// trips the heuristic into LABELS_FIRST_ROW which is wrong for this 2-column shape
		$data = [
			[ '2014', 73000000 ],
			[ '2015', 75000000 ],
			[ '2016', 78000000 ],
		];

		$this->parser->parse_data( $data, M_Chart_Parse::PARSE_ROWS );

		$this->assertSame(
			M_Chart_Parse::LABELS_FIRST_COLUMN,
			$this->parser->value_labels_position
		);
		$this->assertSame(
			[ '2014', '2015', '2016' ],
			$this->parser->value_labels
		);
	}

	public function test_label_position_with_string_labels_in_rows_mode_still_works(): void {
		// Regression check — non-numeric labels (existing behavior) still resolve correctly
		$data = [
			[ 'Apr', 10 ],
			[ 'May', 20 ],
			[ 'Jun', 30 ],
		];

		$this->parser->parse_data( $data, M_Chart_Parse::PARSE_ROWS );

		$this->assertSame(
			M_Chart_Parse::LABELS_FIRST_COLUMN,
			$this->parser->value_labels_position
		);
		$this->assertSame(
			[ 'Apr', 'May', 'Jun' ],
			$this->parser->value_labels
		);
	}

	public function test_label_position_with_padded_2col_data_in_rows_mode(): void {
		// Jspreadsheet's minDimensions padding adds trailing empty cells per row
		// effective_max_columns must strip them so the 2-column shape is still detected
		$padded = array_map(
			static fn( $row ) => array_pad( $row, 37, '' ),
			[
				[ '2014', 73000000 ],
				[ '2015', 75000000 ],
				[ '2016', 78000000 ],
			]
		);

		$this->parser->parse_data( $padded, M_Chart_Parse::PARSE_ROWS );

		$this->assertSame(
			M_Chart_Parse::LABELS_FIRST_COLUMN,
			$this->parser->value_labels_position
		);
		$this->assertSame(
			[ '2014', '2015', '2016' ],
			$this->parser->value_labels
		);
	}

	public function test_label_position_with_empty_corner_still_returns_labels_both(): void {
		// Regression check — the multi-series LABELS_BOTH shape is unaffected by the pre-check
		$data = [
			[ '',   'Series A', 'Series B' ],
			[ 'Q1', 10,         15 ],
			[ 'Q2', 20,         25 ],
		];

		$this->parser->parse_data( $data, M_Chart_Parse::PARSE_ROWS );

		$this->assertSame( M_Chart_Parse::LABELS_BOTH, $this->parser->value_labels_position );
		$this->assertSame(
			[ 'Series A', 'Series B' ],
			$this->parser->value_labels[ M_Chart_Parse::LABELS_FIRST_ROW ]
		);
		$this->assertSame(
			[ 'Q1', 'Q2' ],
			$this->parser->value_labels[ M_Chart_Parse::LABELS_FIRST_COLUMN ]
		);
	}

	public function test_label_position_columns_mode_with_2_effective_rows_returns_first_row(): void {
		// Mirror of the rows-mode 2-column case: parse_in=columns + 2 effective rows
		// means row 0 holds labels for the values in row 1
		$data = [
			[ '2014', '2015', '2016', '2017' ],
			[ 100,    110,    120,    130 ],
		];

		$this->parser->parse_data( $data, M_Chart_Parse::PARSE_COLUMNS );

		$this->assertSame(
			M_Chart_Parse::LABELS_FIRST_ROW,
			$this->parser->value_labels_position
		);
		$this->assertSame(
			[ '2014', '2015', '2016', '2017' ],
			$this->parser->value_labels
		);
	}

	public function test_detect_labels_position_is_a_pure_static_mirror_of_parse_data(): void {
		$cases = [
			[ [ [ '2014', 73000000 ], [ '2015', 75000000 ] ], M_Chart_Parse::PARSE_ROWS, M_Chart_Parse::LABELS_FIRST_COLUMN ],
			[ [ [ 'Apr', 10 ], [ 'May', 20 ] ], M_Chart_Parse::PARSE_ROWS, M_Chart_Parse::LABELS_FIRST_COLUMN ],
			[ array_map( static fn( $row ) => array_pad( $row, 37, '' ), [ [ '2014', 1 ], [ '2015', 2 ] ] ), M_Chart_Parse::PARSE_ROWS, M_Chart_Parse::LABELS_FIRST_COLUMN ],
			[ [ [ '', 'Series A', 'Series B' ], [ 'Q1', 10, 15 ] ], M_Chart_Parse::PARSE_ROWS, M_Chart_Parse::LABELS_BOTH ],
			[ [ [ '2014', '2015', '2016' ], [ 100, 110, 120 ] ], M_Chart_Parse::PARSE_COLUMNS, M_Chart_Parse::LABELS_FIRST_ROW ],
			[ [ [ 'X', 'Y' ], [ 1, 2 ], [ 3, 4 ] ], M_Chart_Parse::PARSE_COLUMNS, M_Chart_Parse::LABELS_FIRST_ROW ],
			[ [ [ '' ], [ '' ] ], M_Chart_Parse::PARSE_ROWS, M_Chart_Parse::LABELS_BOTH ],
			[ [], M_Chart_Parse::PARSE_ROWS, M_Chart_Parse::LABELS_NONE ],
		];

		foreach ( $cases as [ $data, $parse_in, $expected ] ) {
			$this->assertSame( $expected, M_Chart_Parse::detect_labels_position( $data, $parse_in ) );

			if ( [] === $data ) {
				continue;
			}

			$this->parser->parse_data( $data, $parse_in );
			$this->assertSame( $expected, $this->parser->value_labels_position, 'static and instance detection must agree' );
		}
	}

	public function test_detect_labels_position_does_not_touch_parser_state(): void {
		$this->parser->parse_data( [ [ 'Apr', 10 ], [ 'May', 20 ] ], M_Chart_Parse::PARSE_ROWS );

		M_Chart_Parse::detect_labels_position( [ [ '', 'A' ], [ 'Q1', 1 ] ], M_Chart_Parse::PARSE_ROWS );

		$this->assertSame( M_Chart_Parse::LABELS_FIRST_COLUMN, $this->parser->value_labels_position );
		$this->assertSame( [ 'Apr', 'May' ], $this->parser->value_labels );
	}

	public function test_dropped_sets_lists_all_null_series_in_rows_mode(): void {
		$data = [
			[ '',   'Jan', 'Feb' ],
			[ 'A',  1,     2 ],
			[ 'B',  'n/a', '-' ],
			[ 'C',  3,     4 ],
		];

		$this->parser->parse_data( $data, M_Chart_Parse::PARSE_ROWS );

		$this->assertSame( [ 1 ], $this->parser->get_dropped_sets() );
		$this->assertSame( [ 0, 2 ], array_keys( $this->parser->set_data ) );
	}

	public function test_dropped_sets_lists_all_null_series_in_columns_mode(): void {
		$data = [
			[ '',    'A', 'B',   'C' ],
			[ 'Jan', 1,   'n/a', 3 ],
			[ 'Feb', 2,   '-',   4 ],
		];

		$this->parser->parse_data( $data, M_Chart_Parse::PARSE_COLUMNS );

		$this->assertSame( [ 1 ], $this->parser->get_dropped_sets() );
	}

	public function test_dropped_sets_resets_between_parses(): void {
		$this->parser->parse_data( [ [ '', 'Jan' ], [ 'A', 'n/a' ], [ 'B', 1 ] ], M_Chart_Parse::PARSE_ROWS );
		$this->assertSame( [ 0 ], $this->parser->get_dropped_sets() );

		$this->parser->parse_data( [ [ 'Apr', 10 ], [ 'May', 20 ] ], M_Chart_Parse::PARSE_ROWS );
		$this->assertSame( [], $this->parser->get_dropped_sets() );
	}

	public function test_a_number_too_large_to_be_a_float_stays_text(): void {
		// 320 nines overflow floatval() to INF, which json_encode() refuses and so took the whole chart and its editor down
		$huge = str_repeat( '9', 320 );

		$this->assertSame( $huge, $this->parser->clean_data_point( $huge ) );

		$point = $this->parser->parse_data_point( $huge );

		$this->assertNull( $point->value );
		$this->assertSame( $huge, $point->text );
		$this->assertNotFalse( json_encode( $point ) );
	}

	public function test_a_large_but_finite_number_is_still_a_number(): void {
		$big = '1' . str_repeat( '0', 300 );

		$this->assertSame( 1e300, $this->parser->clean_data_point( $big ) );
		$this->assertSame( 1e300, $this->parser->parse_data_point( $big )->value );
	}
}
