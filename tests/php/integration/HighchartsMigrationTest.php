<?php
/**
 * Integration test for the Highcharts → Chart.js migration.
 *
 * The stored per-chart meta schema is identical between the two libraries and
 * Chart.js's type list is a strict superset, so migration is a meta/term flip
 * plus a theme remap for the Highcharts legacy theme slugs.
 */

declare( strict_types=1 );

final class HighchartsMigrationTest extends WP_UnitTestCase {

	private function create_highcharts_chart( string $theme ): int {
		$post_id = self::factory()->post->create( [
			'post_type'   => m_chart()->slug,
			'post_status' => 'publish',
		] );

		// Write the stored state directly rather than through m_chart()->update_post_meta()
		// Real Highcharts charts were saved while the extension was active — the fixture
		// only needs to reproduce what's already in the database when it isn't
		update_post_meta( $post_id, m_chart()->slug, [
			'library'   => 'highcharts',
			'type'      => 'spline',
			'parse_in'  => 'rows',
			'theme'     => $theme,
			'y_units'   => 'tonnes',
			'data'      => [
				'sets' => [ [ [ '', 'Series' ], [ 'A', '1' ], [ 'B', '2' ] ] ],
			],
			'set_names' => [ 'Sheet 1' ],
			'height'    => 400,
		] );

		wp_set_object_terms( $post_id, 'highcharts', m_chart()->slug . '-library' );
		wp_set_object_terms( $post_id, [ 'tonnes' ], m_chart()->slug . '-units' );

		return $post_id;
	}

	private function library_terms( int $post_id ): array {
		return wp_get_object_terms( $post_id, m_chart()->slug . '-library', [ 'fields' => 'slugs' ] );
	}

	public function test_migration_flips_library_meta_and_taxonomy_term(): void {
		$post_id = $this->create_highcharts_chart( '_default' );

		$this->assertSame( [ 'highcharts' ], $this->library_terms( $post_id ) );

		$migrated = m_chart()->admin()->migrate_highcharts_chart( $post_id );

		$this->assertTrue( $migrated );

		$stored = m_chart()->get_post_meta( $post_id );

		$this->assertSame( 'chartjs', $stored['library'] );
		$this->assertSame( [ 'chartjs' ], $this->library_terms( $post_id ) );

		// Data and type carry over untouched — Chart.js types are a superset
		$this->assertSame( 'spline', $stored['type'] );
		$this->assertSame( [ [ [ '', 'Series' ], [ 'A', '1' ], [ 'B', '2' ] ] ], $stored['data']['sets'] );
	}

	public function test_migration_remaps_legacy_themes_and_preserves_shared_ones(): void {
		$legacy = $this->create_highcharts_chart( 'legacy-v2' );
		$shared = $this->create_highcharts_chart( 'color-blind-safe' );
		$custom = $this->create_highcharts_chart( 'my-custom-theme' );

		m_chart()->admin()->migrate_highcharts_chart( $legacy );
		m_chart()->admin()->migrate_highcharts_chart( $shared );
		m_chart()->admin()->migrate_highcharts_chart( $custom );

		// Highcharts legacy themes have no Chart.js file — remapped to the Chart.js highcharts-v4 look
		$this->assertSame( 'highcharts-v4', m_chart()->get_post_meta( $legacy, 'theme' ) );

		// Themes that exist in both libraries carry over unchanged
		$this->assertSame( 'color-blind-safe', m_chart()->get_post_meta( $shared, 'theme' ) );

		// Unknown custom slugs are left alone (they degrade gracefully at render time)
		$this->assertSame( 'my-custom-theme', m_chart()->get_post_meta( $custom, 'theme' ) );
	}

	public function test_migration_preserves_unit_terms(): void {
		$post_id = $this->create_highcharts_chart( '_default' );

		m_chart()->admin()->migrate_highcharts_chart( $post_id );

		$units = wp_get_object_terms( $post_id, m_chart()->slug . '-units', [ 'fields' => 'names' ] );

		$this->assertSame( [ 'tonnes' ], $units );
	}

	private const LIBRARY_PLUGIN = 'm-chart-highcharts-library/m-chart-highcharts-library.php';

	/**
	 * Render the notice as an admin and return the output
	 */
	private function render_notice(): string {
		$admin_id = self::factory()->user->create( [ 'role' => 'administrator' ] );
		wp_set_current_user( $admin_id );

		ob_start();
		m_chart()->admin()->library_warning();

		return (string) ob_get_clean();
	}

	/**
	 * is_plugin_active() reads the active_plugins option so the library-active
	 * state is simulatable without the plugin files existing
	 */
	private function fake_library_active( bool $active ): void {
		$plugins = (array) get_option( 'active_plugins', [] );

		if ( $active ) {
			$plugins[] = self::LIBRARY_PLUGIN;
		} else {
			$plugins = array_values( array_diff( $plugins, [ self::LIBRARY_PLUGIN ] ) );
		}

		update_option( 'active_plugins', array_unique( $plugins ) );
	}

	public function test_notice_warns_about_broken_charts_when_library_inactive(): void {
		$this->create_highcharts_chart( '_default' );
		$this->fake_library_active( false );

		$notice = $this->render_notice();

		$this->assertStringContainsString( 'won&#039;t display', $notice );
		$this->assertStringContainsString( 'deprecated', $notice );
		$this->assertStringContainsString( 'expensive commercial licensing requirements', $notice );
		$this->assertStringContainsString( 'm_chart_migrate_highcharts', $notice );
		$this->assertStringContainsString( 'install the M Chart Highcharts Library plugin', $notice );
	}

	public function test_notice_announces_deprecation_when_library_active(): void {
		$this->create_highcharts_chart( '_default' );
		$this->fake_library_active( true );

		$notice = $this->render_notice();

		$this->assertStringContainsString( 'deprecated and will not receive further updates', $notice );
		$this->assertStringContainsString( 'expensive commercial licensing requirements', $notice );
		$this->assertStringContainsString( 'm_chart_migrate_highcharts', $notice );
		$this->assertStringContainsString( 'm_chart_dismiss_migration_notice', $notice );
		$this->assertStringNotContainsString( 'won&#039;t display', $notice );
		$this->assertStringNotContainsString( 'install the M Chart Highcharts Library plugin', $notice );
	}

	public function test_dismissal_suppresses_only_the_library_active_variant(): void {
		$this->create_highcharts_chart( '_default' );
		update_option( 'm_chart_hide_migration_notice', 1 );

		// Dismissed + library active: nothing renders
		$this->fake_library_active( true );
		$this->assertSame( '', $this->render_notice() );

		// Dismissed + library inactive: charts are broken so the warning still shows
		$this->fake_library_active( false );
		$this->assertStringContainsString( 'won&#039;t display', $this->render_notice() );
	}

	public function test_notice_renders_nothing_without_highcharts_charts(): void {
		$this->fake_library_active( false );

		$this->assertSame( '', $this->render_notice() );
	}

	public function test_migration_skips_non_highcharts_charts(): void {
		$post_id = self::factory()->post->create( [ 'post_type' => m_chart()->slug ] );

		m_chart()->update_post_meta( $post_id, [
			'library'   => 'chartjs',
			'type'      => 'line',
			'parse_in'  => 'rows',
			'theme'     => 'legacy-v2',
			'data'      => [ 'sets' => [ [ [ '', 'A' ], [ 'B', 1 ] ] ] ],
			'set_names' => [ 'Sheet 1' ],
			'height'    => 400,
		] );

		$this->assertFalse( m_chart()->admin()->migrate_highcharts_chart( $post_id ) );

		// A chart that was never highcharts keeps its meta untouched, theme included
		$this->assertSame( 'legacy-v2', m_chart()->get_post_meta( $post_id, 'theme' ) );
	}
}
