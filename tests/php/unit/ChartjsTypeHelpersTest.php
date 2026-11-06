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
			'add_filter'               => true,
			'add_action'               => true,
			'esc_html__'               => static fn( $text ) => $text,
			'get_stylesheet_directory' => '/tmp/theme',
			'get_template_directory'   => '/tmp/theme',
		] );

		// The traits ask core for the multi sheet types, which lives on the plugin singleton the unit tier doesn't load
		$bridge = new class {
			public function get_multi_sheet_types(): array {
				return [ 'scatter', 'bubble', 'radar', 'radar-area', 'boxplot', 'violin' ];
			}
		};

		Functions\when( 'm_chart' )->justReturn( $bridge );
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

	public function test_native_type_maps_known_types_and_leaves_unknown_ones_alone(): void {
		$chartjs = new M_Chart_Chartjs();

		$this->assertSame( 'bar', $chartjs->get_native_type( 'column' ) );
		$this->assertSame( 'polarArea', $chartjs->get_native_type( 'polar' ) );
		$this->assertSame( 'line', $chartjs->get_native_type( 'spline' ) );
		$this->assertSame( 'pro-only', $chartjs->get_native_type( 'pro-only' ) );
	}

	public function test_type_traits_cover_every_type_option_with_the_expected_shape(): void {
		$chartjs = new M_Chart_Chartjs();
		$traits  = $chartjs->get_type_traits();

		$this->assertSame( $chartjs->get_type_options(), array_keys( $traits ) );

		$this->assertTrue( $traits['line']['axes'] );
		$this->assertTrue( $traits['line']['points'] );
		$this->assertTrue( $traits['line']['shared_tooltip'] );
		$this->assertTrue( $traits['line']['y_min'] );

		$this->assertFalse( $traits['pie']['axes'] );
		$this->assertFalse( $traits['radar-area']['axes'], 'axes follow the native type, radar-area renders as radar' );
		$this->assertTrue( $traits['radar-area']['multi_sheet'] );

		$this->assertFalse( $traits['treemap']['legend'] );
		$this->assertTrue( $traits['treemap']['labels'], 'treemap keeps the labels toggle for its native labels' );
		$this->assertTrue( $traits['treemap']['raw_grid'] );

		$this->assertFalse( $traits['boxplot']['labels'] );
		$this->assertTrue( $traits['boxplot']['boxplot_points'] );
		$this->assertTrue( $traits['boxplot']['single_sheet_required'] );
		$this->assertTrue( $traits['boxplot']['constrain_y'] );

		$this->assertTrue( $traits['column']['data_point_colors'] );
		$this->assertTrue( $traits['column']['simple_2d_required'] );
		$this->assertSame( 'bar', $traits['column']['native'] );
		$this->assertSame( 3, $traits['bubble']['data_lines'] );
	}

	public function test_type_has_trait_falls_back_to_defaults_for_unknown_types(): void {
		$chartjs = new M_Chart_Chartjs();

		$this->assertTrue( $chartjs->type_has_trait( 'pro-only', 'axes' ), 'an unknown type renders with axes unless it maps to a native type without them' );
		$this->assertFalse( $chartjs->type_has_trait( 'pro-only', 'points' ) );
		$this->assertFalse( $chartjs->type_has_trait( 'line', 'not-a-trait' ) );
	}
}
