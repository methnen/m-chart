<?php
/**
 * Integration tests for the 1.7 and 1.7.4 upgrade routines
 *
 * Both run whenever the m_chart_version site option is below their version, and a missing option counts as below
 * The option can go missing on a site that upgraded long ago (it is stored in a different table once a site
 * becomes a network, for one), and the 1.7 routine then treated every chart as an untagged Highcharts chart:
 * it replaced each chart's tags with "highcharts" and the 1.7.4 routine moved that into the library taxonomy
 */

declare( strict_types=1 );

final class UpgradeRoutineTest extends WP_UnitTestCase {

	private function create_chart( array $meta, array $tags, ?string $library_term ): int {
		$post_id = self::factory()->post->create( [
			'post_type'   => m_chart()->slug,
			'post_status' => 'publish',
		] );

		if ( $meta ) {
			update_post_meta( $post_id, m_chart()->slug, $meta );
		}

		wp_set_object_terms( $post_id, $tags, 'post_tag' );

		if ( null !== $library_term ) {
			wp_set_object_terms( $post_id, $library_term, m_chart()->slug . '-library' );
		}

		return $post_id;
	}

	private function tags( int $post_id ): array {
		$tags = wp_get_object_terms( $post_id, 'post_tag', [ 'fields' => 'slugs' ] );

		sort( $tags );

		return $tags;
	}

	private function library( int $post_id ): array {
		return wp_get_object_terms( $post_id, m_chart()->slug . '-library', [ 'fields' => 'slugs' ] );
	}

	private function run_upgrades_with_the_version_option_missing(): void {
		delete_site_option( 'm_chart_version' );

		m_chart()->upgrade_to_1_7();
		m_chart()->upgrade_to_1_7_4();
	}

	public function test_a_current_chart_keeps_its_tags_and_library(): void {
		$chart = $this->create_chart( [ 'library' => 'chartjs', 'type' => 'line' ], [ 'sales', 'quarterly' ], 'chartjs' );

		$this->run_upgrades_with_the_version_option_missing();

		$this->assertSame( [ 'quarterly', 'sales' ], $this->tags( $chart ) );
		$this->assertSame( [ 'chartjs' ], $this->library( $chart ) );
	}

	public function test_a_chart_without_a_library_term_but_with_its_own_library_setting_is_left_alone(): void {
		$chart = $this->create_chart( [ 'library' => 'chartjs', 'type' => 'line' ], [ 'sales' ], null );

		$this->run_upgrades_with_the_version_option_missing();

		$this->assertSame( [ 'sales' ], $this->tags( $chart ) );
		$this->assertSame( [], $this->library( $chart ) );
	}

	public function test_a_real_pre_1_7_chart_is_still_upgraded_and_keeps_its_own_tags(): void {
		// Before 1.7 there was only Highcharts, and neither the tag nor the library setting existed
		$chart = $this->create_chart( [ 'type' => 'line' ], [ 'archive' ], null );

		$this->run_upgrades_with_the_version_option_missing();

		$this->assertSame( [ 'highcharts' ], $this->library( $chart ) );
		$this->assertSame( [ 'archive' ], $this->tags( $chart ), 'Its own tag survives, the temporary highcharts tag is gone again' );
	}

	public function test_the_version_option_is_set_so_the_routines_do_not_run_again(): void {
		$this->run_upgrades_with_the_version_option_missing();

		$this->assertSame( '1.7.4', get_site_option( 'm_chart_version' ) );
	}
}
