<?php
/**
 * Integration tests for the data sets the round chart types are given
 *
 * A sheet can be laid out two ways: a label and a value on every line, or names along the top and down the side
 * with a series on every line, which is how a line or column chart is laid out
 * Switching one of those charts to a round type hands the round type the second layout
 *
 * Radar and radar area draw every series, pie, doughnut and polar draw the first
 * Whatever the layout, a point in a data set is never itself a list: Chart.js throws on that for radar and polar,
 * and draws nothing for pie and doughnut
 */

declare( strict_types=1 );

final class RoundChartDataSetsTest extends M_Chart_Integration_Test_Case {

	// A label and a value on every line, the layout the round types have always taken
	private const LABEL_VALUE = [
		[ 'Speed', 85 ],
		[ 'Strength', 70 ],
		[ 'Accuracy', 90 ],
	];

	// Names along the top and down the side, a series on every line
	private const BOTH_EDGES = [
		[ '', 'Speed', 'Strength', 'Accuracy' ],
		[ 'Player A', 85, 70, 90 ],
		[ 'Player B', 72, 88, 65 ],
	];

	public static function radar_types(): array {
		return [
			'radar'      => [ 'radar' ],
			'radar area' => [ 'radar-area' ],
		];
	}

	public static function single_series_types(): array {
		return [
			'pie'      => [ 'pie' ],
			'doughnut' => [ 'doughnut' ],
			'polar'    => [ 'polar' ],
		];
	}

	/**
	 * Chart args for an unsaved chart of the given type holding the given sheets
	 *
	 * @param string $type      a chart type
	 * @param array  $sets      one grid of cells per sheet
	 * @param string $parse_in  rows or columns
	 * @param array  $set_names the sheet names, Sheet 1 and so on when left out
	 *
	 * @return array
	 */
	private function chart_args( string $type, array $sets, string $parse_in = 'rows', array $set_names = [] ): array {
		$stub = new WP_Post( (object) [
			'ID'          => 0,
			'post_title'  => 'Round chart',
			'post_type'   => m_chart()->slug,
			'post_status' => 'auto-draft',
		] );

		if ( [] === $set_names ) {
			foreach ( array_keys( $sets ) as $index ) {
				$set_names[] = 'Sheet ' . ( $index + 1 );
			}
		}

		$meta = m_chart()->validate_post_meta( [
			'library'   => 'chartjs',
			'type'      => $type,
			'parse_in'  => $parse_in,
			'theme'     => '_default',
			'data'      => [ 'sets' => $sets ],
			'set_names' => $set_names,
			'height'    => 400,
		], 'preview' );

		return m_chart()->library( 'chartjs' )->get_chart_args_for_meta( $stub, $meta );
	}

	/**
	 * The name and the values of every data set, which is all these tests compare
	 *
	 * @param array $args chart args
	 *
	 * @return array
	 */
	private function data_sets( array $args ): array {
		$data_sets = [];

		foreach ( $args['data']['datasets'] as $data_set ) {
			$data_sets[] = [
				'label' => $data_set['label'] ?? null,
				'data'  => $data_set['data'],
			];
		}

		return $data_sets;
	}

	/**
	 * Every data set holds plain values, and one raw value for each of them
	 *
	 * @param array $args chart args
	 */
	private function assert_points_are_plain_values( array $args ): void {
		$this->assertTrue( array_is_list( $args['data']['datasets'] ), 'the data sets are a list' );

		foreach ( $args['data']['datasets'] as $index => $data_set ) {
			$this->assertTrue( array_is_list( $data_set['data'] ), "data set $index holds a list of points" );

			foreach ( $data_set['data'] as $point ) {
				$this->assertFalse( is_array( $point ), "a point in data set $index is a value, not a list of values" );
			}

			if ( [] === $data_set['data'] ) {
				continue;
			}

			$this->assertCount( count( $data_set['data'] ), $data_set['rawData'], "data set $index has a raw value for every point" );

			foreach ( $data_set['data'] as $key => $point ) {
				$this->assertInstanceOf( M_Chart_Parsed_Data_Point::class, $data_set['rawData'][ $key ] );
				$this->assertEquals( $point, $data_set['rawData'][ $key ]->value, "the raw value of point $key in data set $index is that point's" );
			}
		}
	}

	/**
	 * @dataProvider radar_types
	 */
	public function test_radar_draws_a_label_and_value_sheet_as_one_shape_named_after_the_sheet( string $type ): void {
		$args = $this->chart_args( $type, [ self::LABEL_VALUE ], 'rows', [ 'Player A' ] );

		$this->assertSame( [ 'Speed', 'Strength', 'Accuracy' ], $args['data']['labels'] );
		$this->assertEquals( [ [ 'label' => 'Player A', 'data' => [ 85, 70, 90 ] ] ], $this->data_sets( $args ) );
		$this->assert_points_are_plain_values( $args );
	}

	/**
	 * @dataProvider radar_types
	 */
	public function test_radar_draws_one_shape_for_each_label_and_value_sheet( string $type ): void {
		$second = [ [ 'Speed', 72 ], [ 'Strength', 88 ], [ 'Accuracy', 65 ] ];
		$args   = $this->chart_args( $type, [ self::LABEL_VALUE, $second ], 'rows', [ 'Player A', 'Player B' ] );

		$this->assertSame( [ 'Speed', 'Strength', 'Accuracy' ], $args['data']['labels'] );

		$this->assertEquals(
			[
				[ 'label' => 'Player A', 'data' => [ 85, 70, 90 ] ],
				[ 'label' => 'Player B', 'data' => [ 72, 88, 65 ] ],
			],
			$this->data_sets( $args )
		);

		$this->assert_points_are_plain_values( $args );
	}

	/**
	 * @dataProvider radar_types
	 */
	public function test_radar_draws_every_series_of_a_sheet_with_names_on_both_edges( string $type ): void {
		$args = $this->chart_args( $type, [ self::BOTH_EDGES ] );

		$this->assertSame( [ 'Speed', 'Strength', 'Accuracy' ], $args['data']['labels'] );

		$this->assertEquals(
			[
				[ 'label' => 'Player A', 'data' => [ 85, 70, 90 ] ],
				[ 'label' => 'Player B', 'data' => [ 72, 88, 65 ] ],
			],
			$this->data_sets( $args )
		);

		$this->assert_points_are_plain_values( $args );
	}

	/**
	 * @dataProvider radar_types
	 */
	public function test_radar_reads_the_series_down_the_columns_when_parsing_columns( string $type ): void {
		$args = $this->chart_args( $type, [ self::BOTH_EDGES ], 'columns' );

		$this->assertSame( [ 'Player A', 'Player B' ], $args['data']['labels'] );

		$this->assertEquals(
			[
				[ 'label' => 'Speed', 'data' => [ 85, 72 ] ],
				[ 'label' => 'Strength', 'data' => [ 70, 88 ] ],
				[ 'label' => 'Accuracy', 'data' => [ 90, 65 ] ],
			],
			$this->data_sets( $args )
		);

		$this->assert_points_are_plain_values( $args );
	}

	/**
	 * @dataProvider radar_types
	 */
	public function test_radar_draws_a_single_series_from_a_sheet_with_names_on_both_edges( string $type ): void {
		$args = $this->chart_args( $type, [ array_slice( self::BOTH_EDGES, 0, 2 ) ] );

		$this->assertEquals( [ [ 'label' => 'Player A', 'data' => [ 85, 70, 90 ] ] ], $this->data_sets( $args ) );
		$this->assert_points_are_plain_values( $args );
	}

	/**
	 * @dataProvider radar_types
	 */
	public function test_radar_puts_the_sheet_name_in_front_of_the_series_name_when_there_are_several_sheets( string $type ): void {
		$args = $this->chart_args( $type, [ self::BOTH_EDGES, self::BOTH_EDGES, self::LABEL_VALUE ], 'rows', [ '2023', '2024', 'Target' ] );

		$this->assertSame(
			[ '2023: Player A', '2023: Player B', '2024: Player A', '2024: Player B', 'Target' ],
			array_column( $this->data_sets( $args ), 'label' ),
			'a label and value sheet keeps its sheet name alone'
		);

		$this->assert_points_are_plain_values( $args );
	}

	/**
	 * @dataProvider radar_types
	 */
	public function test_radar_leaves_out_a_series_with_no_numbers_and_the_rest_keep_their_names( string $type ): void {
		$sheet = [
			[ '', 'Speed', 'Strength' ],
			[ 'Player A', 'n/a', 'n/a' ],
			[ 'Player B', 72, 88 ],
		];

		$args = $this->chart_args( $type, [ $sheet ] );

		$this->assertEquals( [ [ 'label' => 'Player B', 'data' => [ 72, 88 ] ] ], $this->data_sets( $args ) );
		$this->assert_points_are_plain_values( $args );
	}

	/**
	 * @dataProvider radar_types
	 */
	public function test_radar_names_a_series_that_has_no_name_after_its_sheet( string $type ): void {
		$sheet = [
			[ '', 'Speed', 'Strength' ],
			[ 'Player A', 85, 70 ],
			[ '', 72, 88 ],
		];

		$one_sheet  = $this->chart_args( $type, [ $sheet ], 'rows', [ 'Squad' ] );
		$two_sheets = $this->chart_args( $type, [ $sheet, self::LABEL_VALUE ], 'rows', [ 'Squad', 'Target' ] );

		$this->assertSame( [ 'Player A', 'Squad' ], array_column( $this->data_sets( $one_sheet ), 'label' ) );
		$this->assertSame( [ 'Squad: Player A', 'Squad', 'Target' ], array_column( $this->data_sets( $two_sheets ), 'label' ) );
	}

	/**
	 * @dataProvider radar_types
	 */
	public function test_radar_gives_every_series_its_own_colour_and_keeps_what_was_typed_around_its_numbers( string $type ): void {
		$sheet = [
			[ '', 'Speed', 'Strength' ],
			[ 'Player A', '$85', '$70' ],
			[ 'Player B', '72%', '88%' ],
		];

		$args = $this->chart_args( $type, [ $sheet ] );

		// The palette the chart was built with, which a theme can set
		$this->assertNotSame( $args['colors'][0], $args['colors'][1] );
		$this->assertSame( [ $args['colors'][0], $args['colors'][1] ], array_column( $args['data']['datasets'], 'borderColor' ) );

		$this->assertSame( '$', $args['data']['datasets'][0]['rawData'][0]->prefix );
		$this->assertSame( '%', $args['data']['datasets'][1]['rawData'][1]->suffix );
		$this->assert_points_are_plain_values( $args );
	}

	/**
	 * @dataProvider single_series_types
	 */
	public function test_a_single_series_type_draws_a_label_and_value_sheet_as_it_always_has( string $type ): void {
		$args = $this->chart_args( $type, [ self::LABEL_VALUE ] );

		$this->assertSame( [ 'Speed', 'Strength', 'Accuracy' ], $args['data']['labels'] );
		$this->assertCount( 1, $args['data']['datasets'] );
		$this->assertEquals( [ 85, 70, 90 ], $args['data']['datasets'][0]['data'] );
		$this->assert_points_are_plain_values( $args );
	}

	/**
	 * @dataProvider single_series_types
	 */
	public function test_a_single_series_type_draws_the_first_series_of_a_sheet_with_names_on_both_edges( string $type ): void {
		$args = $this->chart_args( $type, [ self::BOTH_EDGES ] );

		$this->assertSame( [ 'Speed', 'Strength', 'Accuracy' ], $args['data']['labels'] );
		$this->assertCount( 1, $args['data']['datasets'] );
		$this->assertEquals( [ 85, 70, 90 ], $args['data']['datasets'][0]['data'] );
		$this->assert_points_are_plain_values( $args );
	}

	/**
	 * @dataProvider single_series_types
	 */
	public function test_a_single_series_type_reads_the_first_series_down_the_first_column_when_parsing_columns( string $type ): void {
		$args = $this->chart_args( $type, [ self::BOTH_EDGES ], 'columns' );

		$this->assertSame( [ 'Player A', 'Player B' ], $args['data']['labels'] );
		$this->assertCount( 1, $args['data']['datasets'] );
		$this->assertEquals( [ 85, 72 ], $args['data']['datasets'][0]['data'] );
		$this->assert_points_are_plain_values( $args );
	}

	/**
	 * @dataProvider single_series_types
	 */
	public function test_a_single_series_type_draws_the_next_series_when_the_first_has_no_numbers( string $type ): void {
		$sheet = [
			[ '', 'Speed', 'Strength' ],
			[ 'Player A', 'n/a', 'n/a' ],
			[ 'Player B', '$72', '$88' ],
		];

		$args = $this->chart_args( $type, [ $sheet ] );

		$this->assertEquals( [ 72, 88 ], $args['data']['datasets'][0]['data'] );
		$this->assertSame( '$', $args['data']['datasets'][0]['rawData'][0]->prefix );
		$this->assert_points_are_plain_values( $args );
	}

	/**
	 * @dataProvider single_series_types
	 * @dataProvider radar_types
	 */
	public function test_a_sheet_with_names_on_both_edges_and_no_numbers_gives_an_empty_data_set( string $type ): void {
		$sheet = [
			[ '', 'Speed', 'Strength' ],
			[ 'Player A', 'n/a', 'n/a' ],
		];

		$args = $this->chart_args( $type, [ $sheet ] );

		$this->assertCount( 1, $args['data']['datasets'] );
		$this->assertSame( [], $args['data']['datasets'][0]['data'] );
	}
}
