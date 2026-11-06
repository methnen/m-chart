<?php
/**
 * Integration tests for M_Chart_Chartjs::get_chart_args_for_meta()
 *
 * The admin preview and plugins need chart args for meta that isn't saved, without the cache being read or written
 * and without the library instance being left in a different state than it was found in
 */

declare( strict_types=1 );

final class ChartArgsForMetaTest extends WP_UnitTestCase {

	private function create_chart(): int {
		$editor_id = self::factory()->user->create( [ 'role' => 'editor' ] );
		wp_set_current_user( $editor_id );

		$post_id = self::factory()->post->create( [
			'post_type'   => m_chart()->slug,
			'post_status' => 'publish',
			'post_author' => $editor_id,
			'post_title'  => 'Args chart',
		] );

		m_chart()->update_post_meta( $post_id, [
			'library'   => 'chartjs',
			'type'      => 'line',
			'parse_in'  => 'rows',
			'theme'     => '_default',
			'data'      => [ 'sets' => [ [ [ '', 'Series' ], [ 'A', 1 ], [ 'B', 2 ] ] ] ],
			'set_names' => [ 'Sheet 1' ],
			'height'    => 400,
		] );

		return $post_id;
	}

	public function test_builds_args_from_the_given_meta_without_touching_cache_or_state(): void {
		$post_id = $this->create_chart();
		$chartjs = m_chart()->library( 'chartjs' );

		$key   = m_chart()->chart_args_cache_key( $post_id );
		$group = m_chart()->slug;

		wp_cache_set( $key, [ 'sentinel' => true ], $group );

		$meta         = m_chart()->get_post_meta( $post_id );
		$meta['type'] = 'bar';

		$args = $chartjs->get_chart_args_for_meta( $post_id, $meta );

		$this->assertSame( 'bar', $args['type'], 'the supplied meta drives the result, not the stored meta' );
		$this->assertSame( [ 'sentinel' => true ], wp_cache_get( $key, $group ), 'the cache is neither read nor written' );

		$this->assertNull( $chartjs->post );
		$this->assertNull( $chartjs->post_meta );
		$this->assertNull( $chartjs->args );
		$this->assertSame( M_Chart_Chartjs::get_colors_defaults(), $chartjs->colors );
	}

	public function test_matches_get_chart_args_for_the_stored_meta(): void {
		$post_id = $this->create_chart();
		$chartjs = m_chart()->library( 'chartjs' );

		$expected = $chartjs->get_chart_args( $post_id, m_chart()->get_chart_default_args, true, false );
		$actual   = $chartjs->get_chart_args_for_meta( get_post( $post_id ), m_chart()->get_post_meta( $post_id ) );

		// assertEquals rather than assertSame, rawData holds value objects that are equal but not the same instances
		$this->assertEquals( $expected, $actual );
	}

	public function test_accepts_a_stub_post_for_an_unsaved_chart_and_rejects_nothing(): void {
		$chartjs = m_chart()->library( 'chartjs' );

		$stub = new WP_Post( (object) [
			'ID'          => 0,
			'post_title'  => 'Unsaved',
			'post_type'   => m_chart()->slug,
			'post_status' => 'auto-draft',
		] );

		$meta = m_chart()->validate_post_meta( [
			'library'   => 'chartjs',
			'type'      => 'pie',
			'parse_in'  => 'rows',
			'theme'     => '_default',
			'data'      => [ 'sets' => [ [ [ 'A', 1 ], [ 'B', 2 ] ] ] ],
			'set_names' => [ 'Sheet 1' ],
			'height'    => 400,
		], 'preview' );

		$args = $chartjs->get_chart_args_for_meta( $stub, $meta );

		$this->assertSame( 'pie', $args['type'] );
		$this->assertSame( 'Unsaved', $args['options']['plugins']['title']['text'] );

		$this->assertSame( [], $chartjs->get_chart_args_for_meta( 0, $meta ), 'post ID 0 without a stub post is not a chart' );
	}
}
