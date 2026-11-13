<?php
/**
 * Keeps the list of vendored libraries honest
 *
 * The libraries in components/external are copied in by hand, so GitHub can't see them
 * tests/external-libraries lists each one at its vendored version, which is what Dependabot reads to raise
 * security alerts and to open a pull request when a library has a new release
 *
 * That list is only worth having while it is true, so this fails when it and the files disagree:
 * a Dependabot pull request stays red until the new files are copied in,
 * and a hand update that forgets the list is caught here
 */

declare( strict_types=1 );

use PHPUnit\Framework\TestCase;

final class VendoredLibrariesTest extends TestCase {

	// Where each library records its version: file under components/external, and a pattern whose first group is the version
	private const NPM = [
		'chart.js'                       => [ 'chartjs/chart.js',                     '/Chart\.js v([\d.]+)/' ],
		'chartjs-plugin-datalabels'      => [ 'chartjs/chartjs-plugin-datalabels.js', '/chartjs-plugin-datalabels v([\d.]+)/' ],
		'chartjs-chart-treemap'          => [ 'chartjs/chartjs-chart-treemap.min.js', '/chartjs-chart-treemap v([\d.]+)/' ],
		'@sgratzl/chartjs-chart-boxplot' => [ 'chartjs/chartjs-chart-boxplot.min.js', '/chartjs-chart-boxplot v([\d.]+)/' ],
		'chartjs-chart-venn'             => [ 'chartjs/chartjs-chart-venn.min.js',    '/chartjs-chart-venn v([\d.]+)/' ],
		'jspreadsheet-ce'                => [ 'jspreadsheet/jspreadsheet.js',         '/jspreadsheet-ce@([\d.]+)/' ],
		'jsuites'                        => [ 'jsuites/jsuites.js',                   '/jsuites@([\d.]+)/' ],
	];

	private const COMPOSER = [
		'freemius/wordpress-sdk' => [ 'freemius/start.php',        '/\$this_sdk_version\s*=\s*\'([\d.]+)\'/' ],
		'parsecsv/php-parsecsv'  => [ 'parsecsv/parsecsv.lib.php', '/parsecsv\/php-parsecsv ([\d.]+)/' ],
	];

	private static function root(): string {
		return dirname( __DIR__, 3 );
	}

	private static function manifest( string $file ): array {
		return json_decode( file_get_contents( self::root() . '/tests/external-libraries/' . $file ), true, 512, JSON_THROW_ON_ERROR );
	}

	/**
	 * The version a vendored file says it is, read from the top of the file where the banner lives
	 */
	private static function vendored_version( string $file, string $pattern ): ?string {
		$head = (string) file_get_contents( self::root() . '/components/external/' . $file, false, null, 0, 4096 );

		return 1 === preg_match( $pattern, $head, $match ) ? $match[1] : null;
	}

	public static function npm_libraries(): array {
		return array_map( static fn( $name ) => [ $name ], array_combine( array_keys( self::NPM ), array_keys( self::NPM ) ) );
	}

	public static function composer_libraries(): array {
		return array_map( static fn( $name ) => [ $name ], array_combine( array_keys( self::COMPOSER ), array_keys( self::COMPOSER ) ) );
	}

	public function test_the_npm_list_names_exactly_the_libraries_checked_here(): void {
		$listed = array_keys( self::manifest( 'package.json' )['dependencies'] );
		$known  = array_keys( self::NPM );

		sort( $listed );
		sort( $known );

		$this->assertSame( $known, $listed, 'A library was added to or removed from tests/external-libraries/package.json without telling this test where its version is' );
	}

	public function test_the_composer_list_names_exactly_the_libraries_checked_here(): void {
		$listed = array_keys( self::manifest( 'composer.json' )['require'] );
		$known  = array_keys( self::COMPOSER );

		sort( $listed );
		sort( $known );

		$this->assertSame( $known, $listed, 'A library was added to or removed from tests/external-libraries/composer.json without telling this test where its version is' );
	}

	/**
	 * @dataProvider npm_libraries
	 */
	public function test_npm_library_is_listed_at_its_vendored_version( string $name ): void {
		[ $file, $pattern ] = self::NPM[ $name ];

		$listed   = self::manifest( 'package.json' )['dependencies'][ $name ] ?? null;
		$vendored = self::vendored_version( $file, $pattern );

		$this->assertNotNull( $vendored, "components/external/{$file} has no version banner, add one (see DEVELOPERS.md)" );
		$this->assertSame( $vendored, $listed, "{$name} is {$vendored} in components/external/{$file} but tests/external-libraries/package.json lists {$listed}" );
	}

	/**
	 * @dataProvider npm_libraries
	 */
	public function test_npm_lockfile_agrees_with_the_list( string $name ): void {
		$listed = self::manifest( 'package.json' )['dependencies'][ $name ] ?? null;
		$locked = self::manifest( 'package-lock.json' )['packages'][ 'node_modules/' . $name ]['version'] ?? null;

		$this->assertSame( $listed, $locked, "Run npm install --package-lock-only --ignore-scripts in tests/external-libraries after changing {$name}" );
	}

	/**
	 * @dataProvider composer_libraries
	 */
	public function test_composer_library_is_listed_at_its_vendored_version( string $name ): void {
		[ $file, $pattern ] = self::COMPOSER[ $name ];

		$listed   = self::manifest( 'composer.json' )['require'][ $name ] ?? null;
		$vendored = self::vendored_version( $file, $pattern );

		$this->assertNotNull( $vendored, "components/external/{$file} does not say which version it is" );
		$this->assertSame( $vendored, $listed, "{$name} is {$vendored} in components/external/{$file} but tests/external-libraries/composer.json lists {$listed}" );
	}

	/**
	 * @dataProvider composer_libraries
	 */
	public function test_composer_lockfile_agrees_with_the_list( string $name ): void {
		$listed = self::manifest( 'composer.json' )['require'][ $name ] ?? null;
		$locked = null;

		foreach ( self::manifest( 'composer.lock' )['packages'] as $package ) {
			if ( $name === $package['name'] ) {
				$locked = ltrim( $package['version'], 'v' );
			}
		}

		$this->assertSame( $listed, $locked, "Run composer update --no-install in tests/external-libraries after changing {$name}" );
	}

	public function test_every_listed_version_is_exact(): void {
		$versions = array_merge( self::manifest( 'package.json' )['dependencies'], self::manifest( 'composer.json' )['require'] );

		foreach ( $versions as $name => $version ) {
			$this->assertMatchesRegularExpression( '/^\d+\.\d+\.\d+$/', $version, "{$name} must be listed at one exact version, a range can't say what is vendored" );
		}
	}
}
