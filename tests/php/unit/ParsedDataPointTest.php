<?php
/**
 * Unit tests for M_Chart_Parsed_Data_Point value object.
 *
 * Pins the readonly contract introduced in PHP 8.1 — any future refactor that
 * removes readonly or adds setters will fail this test.
 */

declare( strict_types=1 );

use PHPUnit\Framework\TestCase;

require_once dirname( __DIR__, 3 ) . '/components/class-m-chart-parsed-data-point.php';

final class ParsedDataPointTest extends TestCase {

	public function test_numeric_factory_returns_numeric_data_point(): void {
		$point = M_Chart_Parsed_Data_Point::numeric( 42.5 );

		$this->assertTrue( $point->is_numeric() );
		$this->assertSame( 42.5, $point->value );
		$this->assertSame( '',   $point->prefix );
		$this->assertSame( '',   $point->suffix );
		$this->assertSame( '',   $point->text );
	}

	public function test_numeric_factory_carries_prefix_and_suffix(): void {
		$point = M_Chart_Parsed_Data_Point::numeric( 100.0, '$', '°F' );

		$this->assertSame( 100.0, $point->value );
		$this->assertSame( '$',   $point->prefix );
		$this->assertSame( '°F',  $point->suffix );
	}

	public function test_text_factory_returns_non_numeric_data_point(): void {
		$point = M_Chart_Parsed_Data_Point::text( 'N/A' );

		$this->assertFalse( $point->is_numeric() );
		$this->assertNull(  $point->value );
		$this->assertSame( 'N/A', $point->text );
	}

	public function test_text_factory_handles_empty_string(): void {
		$point = M_Chart_Parsed_Data_Point::text( '' );

		$this->assertFalse( $point->is_numeric() );
		$this->assertSame( '', $point->text );
	}

	public function test_text_factory_default_is_empty(): void {
		$point = M_Chart_Parsed_Data_Point::text();

		$this->assertFalse( $point->is_numeric() );
		$this->assertSame( '', $point->text );
	}

	public function test_constructor_is_private(): void {
		$reflection  = new ReflectionClass( M_Chart_Parsed_Data_Point::class );
		$constructor = $reflection->getConstructor();

		$this->assertTrue( $constructor->isPrivate(), 'Constructor must be private — use the named factories' );
	}

	public function test_readonly_properties_cannot_be_reassigned(): void {
		$point = M_Chart_Parsed_Data_Point::numeric( 1.0 );

		$this->expectException( Error::class );
		$this->expectExceptionMessageMatches( '/Cannot modify readonly property/i' );

		// PHP 8.1+ readonly: this assignment must throw
		$point->value = 999.0;
	}
}
