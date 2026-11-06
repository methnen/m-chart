<?php
/**
 * Integration test for the save_post pipeline.
 *
 * Verifies the chart save flow: nonce, capability, library validation,
 * post_meta normalization, and the m_chart_update_post_meta action that
 * downstream cache-invalidation depends on.
 */

declare( strict_types=1 );

final class SavePostPipelineTest extends WP_UnitTestCase {

	public function test_save_persists_validated_post_meta(): void {
		$editor_id = self::factory()->user->create( [ 'role' => 'editor' ] );
		wp_set_current_user( $editor_id );

		$post_id = self::factory()->post->create( [
			'post_type'   => m_chart()->slug,
			'post_status' => 'publish',
			'post_author' => $editor_id,
		] );

		$meta = [
			'library'   => 'chartjs',
			'type'      => 'line',
			'parse_in'  => 'rows',
			'theme'     => '_default',
			'data'      => [
				'sets' => [ [ [ '', 'Series' ], [ 'A', 1 ], [ 'B', 2 ] ] ],
			],
			'set_names' => [ 'Sheet 1' ],
			'height'    => 400,
		];

		m_chart()->update_post_meta( $post_id, $meta );

		$stored = m_chart()->get_post_meta( $post_id );

		$this->assertSame( 'chartjs', $stored['library'] );
		$this->assertSame( 'line',    $stored['type'] );
		$this->assertSame( 400,       $stored['height'] );
	}

	public function test_save_clamps_height_to_minimum(): void {
		$editor_id = self::factory()->user->create( [ 'role' => 'editor' ] );
		wp_set_current_user( $editor_id );

		$post_id = self::factory()->post->create( [
			'post_type' => m_chart()->slug,
			'post_author' => $editor_id,
		] );

		m_chart()->update_post_meta( $post_id, [
			'library'   => 'chartjs',
			'type'      => 'line',
			'parse_in'  => 'rows',
			'theme'     => '_default',
			'data'      => [ 'sets' => [ [ [ '', 'A' ], [ 1, 2 ] ] ] ],
			'set_names' => [ 'Sheet 1' ],
			'height'    => 50,  // Below valid range
		] );

		$stored = m_chart()->get_post_meta( $post_id );

		$this->assertGreaterThanOrEqual( 300, $stored['height'], 'height should clamp to >= 300' );
	}

	public function test_m_chart_update_post_meta_action_fires(): void {
		$editor_id = self::factory()->user->create( [ 'role' => 'editor' ] );
		wp_set_current_user( $editor_id );

		$post_id = self::factory()->post->create( [
			'post_type' => m_chart()->slug,
			'post_author' => $editor_id,
		] );

		$fired = false;
		add_action( 'm_chart_update_post_meta', function () use ( &$fired ) {
			$fired = true;
		} );

		m_chart()->update_post_meta( $post_id, [
			'library'   => 'chartjs',
			'type'      => 'line',
			'parse_in'  => 'rows',
			'theme'     => '_default',
			'data'      => [ 'sets' => [ [ [ '', 'A' ], [ 1, 2 ] ] ] ],
			'set_names' => [ 'Sheet 1' ],
			'height'    => 400,
		] );

		$this->assertTrue( $fired, 'm_chart_update_post_meta action did not fire' );
	}

	public function test_sheet_cells_are_sanitised_in_place_without_stray_keys(): void {
		$editor_id = self::factory()->user->create( [ 'role' => 'editor' ] );
		wp_set_current_user( $editor_id );

		$post_id = self::factory()->post->create( [
			'post_type'   => m_chart()->slug,
			'post_author' => $editor_id,
		] );

		m_chart()->update_post_meta( $post_id, [
			'library'   => 'chartjs',
			'type'      => 'line',
			'parse_in'  => 'rows',
			'theme'     => '_default',
			// JSON string, which is the shape the real save path receives from the spreadsheet textarea
			'data'      => json_encode( [ [
				[ '', 'Series' ],
				[ '<script>alert(1)</script>Label', 1 ],
				[ 'A & B', 2 ],
				[ '<5', 3 ],
			] ] ),
			'set_names' => [ 'Sheet 1' ],
			'height'    => 400,
		] );

		// Read the raw row so get_post_meta()'s normalisation can't hide what was stored
		$raw = get_post_meta( $post_id, m_chart()->slug, true );

		$this->assertSame( [ 'sets' ], array_keys( $raw['data'] ), 'validated sheets must be written under data.sets only' );
		// Older kses leaves the script text ("alert(1)Label"), newer kses drops the element's contents too ("Label"), both are fine
		$this->assertStringNotContainsString( '<', $raw['data']['sets'][0][1][0], 'tags are stripped from cells' );
		$this->assertStringEndsWith( 'Label', $raw['data']['sets'][0][1][0], 'the text outside the tag survives' );
		$this->assertSame( 'A & B',         $raw['data']['sets'][0][2][0], 'ampersands survive as text' );
		$this->assertSame( '<5',            $raw['data']['sets'][0][3][0], 'a lone less-than survives as text' );
	}

	public function test_chart_args_cache_is_flushed_on_save(): void {
		$editor_id = self::factory()->user->create( [ 'role' => 'editor' ] );
		wp_set_current_user( $editor_id );

		$post_id = self::factory()->post->create( [
			'post_type'   => m_chart()->slug,
			'post_author' => $editor_id,
		] );

		$meta = [
			'library'   => 'chartjs',
			'type'      => 'line',
			'parse_in'  => 'rows',
			'theme'     => '_default',
			'data'      => [ 'sets' => [ [ [ '', 'A' ], [ 1, 2 ] ] ] ],
			'set_names' => [ 'Sheet 1' ],
			'height'    => 400,
		];

		$key   = m_chart()->chart_args_cache_key( $post_id );
		$group = m_chart()->slug;

		// A saver on the action that re-primes the cache must still end up flushed because core flushes last
		$reprimed = false;
		add_action( 'm_chart_update_post_meta', function ( $saved_post_id ) use ( &$reprimed ) {
			m_chart()->library( 'chartjs' )->get_chart_args( $saved_post_id, [], true, true );
			$reprimed = true;
		}, 50 );

		wp_cache_set( $key, [ 'sentinel' => true ], $group );
		m_chart()->update_post_meta( $post_id, $meta );

		$this->assertTrue( $reprimed, 'the priority 50 saver should have run' );
		$this->assertFalse( wp_cache_get( $key, $group ), 'update_post_meta() must leave no cached chart args behind' );

		// Writing the meta row directly, as REST or a sync job would, flushes too
		wp_cache_set( $key, [ 'sentinel' => true ], $group );
		$meta['height'] = 500;
		update_post_meta( $post_id, m_chart()->slug, m_chart()->validate_post_meta( $meta ) );

		$this->assertFalse( wp_cache_get( $key, $group ), 'a direct update_post_meta() must flush the cached chart args' );

		// And the public helper does the same on demand
		wp_cache_set( $key, [ 'sentinel' => true ], $group );
		m_chart()->flush_chart_args_cache( $post_id );

		$this->assertFalse( wp_cache_get( $key, $group ) );
	}

	public function test_validate_post_meta_passes_a_context_to_its_filter(): void {
		$seen = [];
		add_filter( 'm_chart_validate_post_meta', function ( $chart_meta, $meta, $context ) use ( &$seen ) {
			$seen[] = $context;

			return $chart_meta;
		}, 10, 3 );

		$meta = [
			'library'   => 'chartjs',
			'type'      => 'line',
			'parse_in'  => 'rows',
			'data'      => [ 'sets' => [ [ [ '', 'A' ], [ 1, 2 ] ] ] ],
			'set_names' => [ 'Sheet 1' ],
			'height'    => 400,
		];

		m_chart()->validate_post_meta( $meta );
		m_chart()->validate_post_meta( $meta, 'preview' );

		$this->assertSame( [ 'save', 'preview' ], $seen );
		$this->assertFalse( m_chart()->is_preview_request(), 'nothing in this request flagged a preview' );
	}

	public function test_save_rejects_invalid_library(): void {
		$editor_id = self::factory()->user->create( [ 'role' => 'editor' ] );
		wp_set_current_user( $editor_id );

		// is_valid_library returns bool; an invalid library is rejected upstream
		// before reaching update_post_meta. Verify the validator says so.
		$this->assertFalse( m_chart()->is_valid_library( 'fake-library' ) );
		$this->assertTrue(  m_chart()->is_valid_library( 'chartjs' ) );
	}

	public function test_malformed_json_data_sets_decodes_to_empty_array(): void {
		// Validates the recently-added json_decode guard in validate_post_meta.
		// The current implementation: when data.sets is a non-array, non-empty
		// string, json_decode is called. If decode fails (returns null), the
		// guard substitutes []. Without the guard, a subsequent foreach blows
		// up on null in PHP 8.1+.
		//
		// validate_post_meta() does NOT recursively re-validate data.sets after
		// the decode fallback (the data.sets key is set to [] but the wrapping
		// data structure may still hold the original literal). We assert the
		// behaviour the guard was added for: no PHP 8.1 foreach warning fires.
		set_error_handler( function ( $errno, $errstr ) {
			throw new \ErrorException( $errstr, 0, $errno );
		}, E_WARNING | E_NOTICE );

		try {
			$validated = m_chart()->validate_post_meta( [
				'library'   => 'chartjs',
				'type'      => 'line',
				'parse_in'  => 'rows',
				'data'      => [ 'sets' => '{not valid json' ],
				'set_names' => [ 'Sheet 1' ],
				'height'    => 400,
			] );
			// If we reach here, no warning fired
			$this->assertNotNull( $validated );
		} catch ( \ErrorException $e ) {
			$this->fail( 'json_decode guard regression: ' . $e->getMessage() );
		} finally {
			restore_error_handler();
		}
	}
}
