<?php
/**
 * Unit tests for M_Chart_Chartjs::build_venn_regions().
 *
 * The region ORDER assertions here are load-bearing: chartjs-chart-venn maps
 * region i blindly to layout slot i (the sets arrays are ignored for venn
 * positioning) and derives the set count as log2(length + 1). Wrong order or
 * a partial region list silently corrupts or crashes the render.
 */

declare( strict_types=1 );

use PHPUnit\Framework\TestCase;
use Brain\Monkey;
use Brain\Monkey\Functions;

require_once dirname( __DIR__, 3 ) . '/components/class-m-chart-parsed-data-point.php';
require_once dirname( __DIR__, 3 ) . '/components/class-m-chart-parse.php';
require_once dirname( __DIR__, 3 ) . '/components/class-m-chart-chartjs.php';

final class VennRegionsTest extends TestCase {

	private M_Chart_Chartjs $chartjs;

	protected function setUp(): void {
		parent::setUp();
		Monkey\setUp();

		Functions\stubs( [
			'apply_filters' => static function ( $hook, $value ) {
				return $value;
			},
			'add_filter'               => true,
			'add_action'               => true,
			'get_stylesheet_directory' => '/tmp',
			'get_template_directory'   => '/tmp',
			'esc_html__'               => static function ( $text ) {
				return $text;
			},
		] );

		// build_venn_regions reaches parse_data_point through m_chart()->parse()
		$parse  = new M_Chart_Parse();
		$bridge = new class( $parse ) {
			public function __construct( private M_Chart_Parse $parse ) {}

			public function parse(): M_Chart_Parse {
				return $this->parse;
			}
		};

		Functions\when( 'm_chart' )->justReturn( $bridge );

		$this->chartjs = new M_Chart_Chartjs();
	}

	protected function tearDown(): void {
		Monkey\tearDown();
		parent::tearDown();
	}

	/**
	 * Convenience: the sets arrays of every region in output order
	 */
	private function region_sets( array $venn ): array {
		return array_map( static function ( $region ) {
			return $region['sets'];
		}, $venn['regions'] );
	}

	public function test_three_set_region_rows_honor_the_layout_order(): void {
		$venn = $this->chartjs->build_venn_regions( [
			[ 'A', 10 ],
			[ 'B', 8 ],
			[ 'C', 6 ],
			[ 'B & C', 3 ],
			[ 'A & B & C', 1 ],
		], 'rows' );

		// Degree-ascending, lexicographic by set index — the venn layout contract
		$this->assertSame( [
			[ 'A' ], [ 'B' ], [ 'C' ],
			[ 'A', 'B' ], [ 'A', 'C' ], [ 'B', 'C' ],
			[ 'A', 'B', 'C' ],
		], $this->region_sets( $venn ) );

		// 2^3 - 1 regions with the missing intersections zero-filled
		$values = array_column( $venn['regions'], 'value' );
		$this->assertSame( [ 10.0, 8.0, 6.0, 0, 0, 3.0, 1.0 ], $values );
	}

	public function test_four_and_five_set_orderings(): void {
		$rows = [ [ 'A', 1 ], [ 'B', 1 ], [ 'C', 1 ], [ 'D', 1 ] ];
		$venn = $this->chartjs->build_venn_regions( $rows, 'rows' );

		$this->assertSame( [
			[ 'A' ], [ 'B' ], [ 'C' ], [ 'D' ],
			[ 'A', 'B' ], [ 'A', 'C' ], [ 'A', 'D' ], [ 'B', 'C' ], [ 'B', 'D' ], [ 'C', 'D' ],
			[ 'A', 'B', 'C' ], [ 'A', 'B', 'D' ], [ 'A', 'C', 'D' ], [ 'B', 'C', 'D' ],
			[ 'A', 'B', 'C', 'D' ],
		], $this->region_sets( $venn ) );

		$rows[] = [ 'E', 1 ];
		$venn   = $this->chartjs->build_venn_regions( $rows, 'rows' );

		// 2^5 - 1 regions, degrees strictly ascending
		$this->assertCount( 31, $venn['regions'] );

		$degrees = array_map( 'count', $this->region_sets( $venn ) );
		$this->assertSame( $degrees, array_values( $degrees ) );

		$sorted = $degrees;
		sort( $sorted );
		$this->assertSame( $sorted, $degrees );
	}

	public function test_labels_lead_with_set_names_then_region_names(): void {
		$venn = $this->chartjs->build_venn_regions( [
			[ 'A', 4 ],
			[ 'B', 2 ],
			[ 'A & B', 1 ],
		], 'rows' );

		$this->assertSame( [ 'A', 'B', 'A ∩ B' ], $venn['labels'] );
	}

	public function test_combo_order_and_duplicates_normalize_to_one_region(): void {
		$venn = $this->chartjs->build_venn_regions( [
			[ 'A', 4 ],
			[ 'B', 2 ],
			[ 'B & A', 1 ],
			[ 'A & B', 2 ],
		], 'rows' );

		// 'B & A' and 'A & B' are the same region; duplicate rows sum
		$this->assertSame( 3.0, $venn['regions'][2]['value'] );
	}

	public function test_membership_lists_compute_exclusive_counts(): void {
		// One row per set: the set name followed by its members (rows-mode convention)
		$venn = $this->chartjs->build_venn_regions( [
			[ 'Soccer', 'alex', 'casey', 'drew' ],
			[ 'Tennis', 'casey', 'drew', 'jade' ],
		], 'rows' );

		$this->assertSame( [ 'Soccer', 'Tennis' ], $venn['sets'] );

		// alex is Soccer-only; jade is Tennis-only; casey and drew are in both
		$values = array_column( $venn['regions'], 'value' );
		$this->assertSame( [ 1, 1, 2 ], $values );

		// The shared region carries its member names for tooltips
		$this->assertSame( [ 'casey', 'drew' ], $venn['meta'][2]['members'] );
	}

	public function test_euler_drops_zero_total_sets(): void {
		$sheet = [
			[ 'A', 10 ],
			[ 'B', 5 ],
			[ 'C', 0 ],
		];

		$venn = $this->chartjs->build_venn_regions( $sheet, 'rows' );
		$this->assertCount( 7, $venn['regions'] );

		$euler = $this->chartjs->build_venn_regions( $sheet, 'rows', true );
		$this->assertSame( [ 'A', 'B' ], $euler['sets'] );
		$this->assertCount( 3, $euler['regions'] );
	}

	public function test_first_five_sets_win_and_later_sets_are_skipped(): void {
		$venn = $this->chartjs->build_venn_regions( [
			[ 'A', 1 ],
			[ 'B', 1 ],
			[ 'C', 1 ],
			[ 'D', 1 ],
			[ 'E', 1 ],
			[ 'F', 9 ],
			[ 'F & A', 9 ],
		], 'rows' );

		$this->assertSame( [ 'A', 'B', 'C', 'D', 'E' ], $venn['sets'] );
		$this->assertCount( 31, $venn['regions'] );

		// Rows referencing the dropped set F contribute nothing
		$values = array_column( $venn['regions'], 'value' );
		$this->assertSame( 5.0, (float) array_sum( $values ) );
	}

	public function test_region_row_affixes_survive(): void {
		$venn = $this->chartjs->build_venn_regions( [
			[ 'A', '$10' ],
			[ 'B', '$5' ],
		], 'rows' );

		$this->assertSame( '$', $venn['dataset_prefix'] );
		$this->assertSame( 10.0, $venn['regions'][0]['value'] );
	}

	public function test_columns_parse_in_transposes_region_rows(): void {
		$venn = $this->chartjs->build_venn_regions( [
			[ 'A', 'B', 'A & B' ],
			[ 10, 5, 2 ],
		], 'columns' );

		$this->assertSame( [ 'A', 'B' ], $venn['sets'] );
		$this->assertSame( 2.0, $venn['regions'][2]['value'] );
	}

	public function test_columns_parse_in_transposes_membership_lists(): void {
		// Sets run down the columns with the set names in row 0 (columns-mode convention)
		$venn = $this->chartjs->build_venn_regions( [
			[ 'Soccer', 'Tennis' ],
			[ 'alex',   'casey' ],
			[ 'casey',  'drew' ],
			[ 'drew',   'jade' ],
		], 'columns' );

		$this->assertSame( [ 'Soccer', 'Tennis' ], $venn['sets'] );

		// alex is Soccer-only; jade is Tennis-only; casey and drew are in both
		$values = array_column( $venn['regions'], 'value' );
		$this->assertSame( [ 1, 1, 2 ], $values );
	}

	public function test_unusable_sheets_return_null(): void {
		$this->assertNull( $this->chartjs->build_venn_regions( [], 'rows' ) );
		$this->assertNull( $this->chartjs->build_venn_regions( [ [ '' ] ], 'rows' ) );
		// Membership shape where no row has a set name in its first cell
		$this->assertNull( $this->chartjs->build_venn_regions( [ [ '', 'B', 'C' ] ], 'rows' ) );
		// A set name with no members is unusable too
		$this->assertNull( $this->chartjs->build_venn_regions( [ [ 'A', '', '' ] ], 'rows' ) );
	}
}
