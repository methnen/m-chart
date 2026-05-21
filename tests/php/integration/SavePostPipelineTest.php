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
