<?php
/**
 * Unit tests for M_Chart_Admin::is_chart_image()
 *
 * The chart image arrives from the browser as base64 and is stored as a media attachment
 * It used to be accepted on its first eight bytes alone, so a Contributor, who can't upload media,
 * could store 5MB of anything they liked as a .png by saving a chart
 */

declare( strict_types=1 );

use PHPUnit\Framework\TestCase;
use Brain\Monkey;
use Brain\Monkey\Functions;

require_once dirname( __DIR__, 3 ) . '/components/class-m-chart-admin.php';

final class ChartImageTest extends TestCase {

	private const SIGNATURE = "\x89PNG\r\n\x1a\n";

	protected function setUp(): void {
		parent::setUp();
		Monkey\setUp();

		Functions\stubs( [
			'apply_filters' => static fn( $hook, $value ) => $value,
		] );
	}

	protected function tearDown(): void {
		Monkey\tearDown();
		parent::tearDown();
	}

	/**
	 * A real PNG of the given size, built by hand so the test doesn't need GD
	 */
	private function png( int $width, int $height ): string {
		$chunk = static function ( string $type, string $data ): string {
			return pack( 'N', strlen( $data ) ) . $type . $data . pack( 'N', crc32( $type . $data ) );
		};

		// 8 bit greyscale, one filter byte per row
		$raw = str_repeat( "\x00" . str_repeat( "\xff", $width ), $height );

		return self::SIGNATURE
			. $chunk( 'IHDR', pack( 'NNCCCCC', $width, $height, 8, 0, 0, 0, 0 ) )
			. $chunk( 'IDAT', gzcompress( $raw ) )
			. $chunk( 'IEND', '' );
	}

	public function test_a_real_png_is_accepted(): void {
		$this->assertTrue( M_Chart_Admin::is_chart_image( $this->png( 4, 3 ) ) );
	}

	public function test_the_signature_followed_by_anything_else_is_rejected(): void {
		$this->assertFalse( M_Chart_Admin::is_chart_image( self::SIGNATURE . str_repeat( 'JUNK-NOT-A-PNG ', 2000 ) ) );
		$this->assertFalse( M_Chart_Admin::is_chart_image( self::SIGNATURE . '<?php echo 1;' ) );
	}

	public function test_other_image_types_and_non_images_are_rejected(): void {
		// A 1x1 GIF
		$gif = base64_decode( 'R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7' );

		$this->assertFalse( M_Chart_Admin::is_chart_image( $gif ) );
		$this->assertFalse( M_Chart_Admin::is_chart_image( '' ) );
		$this->assertFalse( M_Chart_Admin::is_chart_image( false ) );
		$this->assertFalse( M_Chart_Admin::is_chart_image( [ 'not', 'a', 'string' ] ) );
	}

	public function test_a_png_claiming_absurd_dimensions_is_rejected(): void {
		// Only the header is checked for the size, so the claimed dimensions are what count
		$chunk = static fn( string $type, string $data ): string => pack( 'N', strlen( $data ) ) . $type . $data . pack( 'N', crc32( $type . $data ) );

		$huge = self::SIGNATURE . $chunk( 'IHDR', pack( 'NNCCCCC', 60000, 60000, 8, 0, 0, 0, 0 ) ) . $chunk( 'IEND', '' );

		$this->assertFalse( M_Chart_Admin::is_chart_image( $huge ) );
	}

	public function test_more_than_five_megabytes_is_rejected(): void {
		$this->assertFalse( M_Chart_Admin::is_chart_image( $this->png( 4, 3 ) . str_repeat( "\x00", 5 * 1024 * 1024 ) ) );
	}
}
