<?php
/**
 * The parser and Chart.js classes must be loaded with the plugin, not on first use
 *
 * Their static helpers are documented as callable from any hook, so a plugin calling one before anything has
 * touched the parser or the library instance must not hit "Class not found"
 * Named so it runs before any test that would load the classes as a side effect
 */

declare( strict_types=1 );

final class AlwaysLoadedClassesTest extends WP_UnitTestCase {

	public function test_parser_and_chartjs_classes_are_loaded_with_the_plugin(): void {
		$this->assertTrue( class_exists( 'M_Chart_Parsed_Data_Point', false ) );
		$this->assertTrue( class_exists( 'M_Chart_Parse', false ) );
		$this->assertTrue( class_exists( 'M_Chart_Chartjs', false ) );

		// And the statics work without an instance
		$this->assertSame( M_Chart_Parse::LABELS_FIRST_COLUMN, M_Chart_Parse::detect_labels_position( [ [ 'Apr', 10 ], [ 'May', 20 ] ], M_Chart_Parse::PARSE_ROWS ) );
		$this->assertSame( 2, M_Chart_Chartjs::get_data_lines_per_series( 'scatter' ) );
		$this->assertSame( [ [ 'a', 'b' ], [ 'c', '' ] ], M_Chart_Parse::fix_csv_data( [ [ 'a', 'b' ], [ 'c' ] ] ) );
	}
}
