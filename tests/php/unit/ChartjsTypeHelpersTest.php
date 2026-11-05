<?php
/**
 * Unit tests for the static chart type helpers on M_Chart_Chartjs
 *
 * These are pure lookups behind filters, so they run without WordPress
 */

declare( strict_types=1 );

use PHPUnit\Framework\TestCase;
use Brain\Monkey;
use Brain\Monkey\Functions;

require_once dirname( __DIR__, 3 ) . '/components/class-m-chart-chartjs.php';

final class ChartjsTypeHelpersTest extends TestCase {

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

	public function test_raw_grid_types_lists_the_types_that_bypass_the_parser(): void {
		$this->assertSame(
			[ 'boxplot', 'violin', 'treemap', 'venn', 'euler' ],
			M_Chart_Chartjs::get_raw_grid_types()
		);
	}

	public function test_data_lines_per_series_by_type(): void {
		$this->assertSame( 2, M_Chart_Chartjs::get_data_lines_per_series( 'scatter' ) );
		$this->assertSame( 3, M_Chart_Chartjs::get_data_lines_per_series( 'bubble' ) );
		$this->assertSame( 1, M_Chart_Chartjs::get_data_lines_per_series( 'line' ) );
		$this->assertSame( 1, M_Chart_Chartjs::get_data_lines_per_series( 'not-a-type' ) );
	}

	public function test_data_lines_per_series_never_drops_below_one(): void {
		Functions\stubs( [
			'apply_filters' => static function ( $hook, $value ) {
				return 'm_chart_data_lines_per_series' === $hook ? 0 : $value;
			},
		] );

		$this->assertSame( 1, M_Chart_Chartjs::get_data_lines_per_series( 'line' ) );
	}
}
