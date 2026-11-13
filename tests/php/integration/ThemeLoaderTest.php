<?php
/**
 * Integration tests for which files in a theme directory are loaded as Chart.js themes
 *
 * A theme file is PHP that gets required, so only a file that declares itself a theme should be
 * The header check used to pass for every file (it tested a variable that was never empty) and the file name
 * check accepted any name ending in "php", not ".php", so every such file in the directory was executed
 */

declare( strict_types=1 );

final class ThemeLoaderTest extends WP_UnitTestCase {

	private string $dir;

	public function set_up(): void {
		parent::set_up();

		// A fresh directory per test, the loader caches by path for the length of the request
		$this->dir = trailingslashit( get_temp_dir() ) . 'm-chart-themes-' . wp_generate_password( 12, false ) . '/';

		mkdir( $this->dir );

		file_put_contents( $this->dir . 'real-theme.php', "<?php\n/**\n * Theme Name: Real Theme\n */\nreturn [ 'colors' => [ '#111111' ] ];\n" );

		// No header: not a theme, and it must not run
		file_put_contents( $this->dir . 'not-a-theme.php', "<?php\n\$GLOBALS['m_chart_test_ran'][] = 'not-a-theme';\nreturn [ 'colors' => [ '#222222' ] ];\n" );

		// An empty header value
		file_put_contents( $this->dir . 'empty-name.php', "<?php\n/**\n * Theme Name:\n */\n\$GLOBALS['m_chart_test_ran'][] = 'empty-name';\nreturn [];\n" );

		// Ends in "php" without being a .php file
		file_put_contents( $this->dir . 'backupphp', "<?php\n/**\n * Theme Name: Backup\n */\n\$GLOBALS['m_chart_test_ran'][] = 'backupphp';\nreturn [];\n" );

		$GLOBALS['m_chart_test_ran'] = [];
	}

	public function tear_down(): void {
		array_map( 'unlink', glob( $this->dir . '*' ) );
		rmdir( $this->dir );
		unset( $GLOBALS['m_chart_test_ran'] );
		parent::tear_down();
	}

	public function test_only_a_file_with_a_theme_name_header_is_loaded(): void {
		$chartjs  = m_chart()->library( 'chartjs' );
		$original = $chartjs->theme_directories;

		$chartjs->theme_directories = [ $this->dir ];

		$themes = $chartjs->get_themes();

		$chartjs->theme_directories = $original;

		$this->assertSame( [ 'real-theme' ], array_values( wp_list_pluck( $themes, 'slug' ) ) );
		$this->assertSame( [ 'Real Theme' ], array_values( wp_list_pluck( $themes, 'name' ) ) );
		$this->assertSame( [], $GLOBALS['m_chart_test_ran'], 'No other file in the directory was executed' );
	}

	public function test_the_bundled_themes_all_still_load(): void {
		$slugs = array_values( wp_list_pluck( m_chart()->library( 'chartjs' )->get_themes(), 'slug' ) );

		foreach ( [ '_default', 'chartjs', 'chartjs-v3', 'color-blind-safe', 'highcharts-v4' ] as $bundled ) {
			$this->assertContains( $bundled, $slugs );
		}
	}
}
