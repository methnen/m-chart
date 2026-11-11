<?php
/**
 * The plugin's version is written in three places that have to be bumped together
 *
 * The deploy reads the version from readme.txt, WordPress reads it from the plugin header,
 * and the plugin's own upgrade check and asset cache busting read it from the main class
 * A release with only some of them bumped ships under one version while saying it is another
 */

declare( strict_types=1 );

use PHPUnit\Framework\TestCase;

final class VersionConsistencyTest extends TestCase {

	private static function read( string $file ): string {
		return (string) file_get_contents( dirname( __DIR__, 3 ) . '/' . $file );
	}

	private static function capture( string $pattern, string $text, string $what ): string {
		self::assertSame( 1, preg_match( $pattern, $text, $match ), "Could not find {$what}" );

		return trim( $match[1] );
	}

	private static function header_version(): string {
		return self::capture( '/^Version:\s*(\S+)/m', self::read( 'm-chart.php' ), 'the Version header in m-chart.php' );
	}

	private static function stable_tag(): string {
		return self::capture( '/^Stable tag:\s*(\S+)/m', self::read( 'readme.txt' ), 'the Stable tag in readme.txt' );
	}

	public function test_plugin_header_and_readme_agree(): void {
		$this->assertSame( self::stable_tag(), self::header_version(), 'The Version header in m-chart.php and the Stable tag in readme.txt differ' );
	}

	public function test_main_class_agrees_with_the_plugin_header(): void {
		$class = self::capture( '/public \$version\s*=\s*\'([^\']+)\'/', self::read( 'components/class-m-chart.php' ), 'public $version in components/class-m-chart.php' );

		$this->assertSame( self::header_version(), $class, 'M_Chart::$version and the Version header in m-chart.php differ' );
	}

	public function test_the_changelog_has_an_entry_for_the_stable_tag(): void {
		$this->assertMatchesRegularExpression(
			'/^= ' . preg_quote( self::stable_tag(), '/' ) . ' =$/m',
			self::read( 'readme.txt' ),
			'readme.txt has no changelog entry for its own Stable tag'
		);
	}

	public function test_minimum_php_is_the_same_in_the_header_and_the_readme(): void {
		$header = self::capture( '/^Requires PHP:\s*(\S+)/m', self::read( 'm-chart.php' ), 'Requires PHP in m-chart.php' );
		$readme = self::capture( '/^Requires PHP:\s*(\S+)/m', self::read( 'readme.txt' ), 'Requires PHP in readme.txt' );

		$this->assertSame( $readme, $header );
	}

	public function test_generated_readme_is_current(): void {
		// README.md is generated from readme.txt by npm run build:readme, a forgotten rebuild leaves the old version on GitHub
		$this->assertStringContainsString(
			'### ' . self::stable_tag() . ' ###',
			self::read( 'README.md' ),
			'README.md has no changelog heading for the Stable tag, run npm run build:readme'
		);
	}
}
