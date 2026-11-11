<?php
/**
 * Integration tests for the small core APIs added in 2.4 for library plugins
 *
 * update_setting(), get_raw_post_meta() / normalize_legacy_data(), the type column label filter,
 * the Freemius config accessor and the settings page hook suffix
 */

declare( strict_types=1 );

final class CoreApiTest extends M_Chart_Integration_Test_Case {

	public function set_up(): void {
		parent::set_up();

		$admin_id = self::factory()->user->create( [ 'role' => 'administrator' ] );
		wp_set_current_user( $admin_id );
	}

	public function test_update_setting_validates_persists_and_fires_the_action(): void {
		$seen = [];
		add_action( 'm_chart_settings_saved', function ( $settings, $previous ) use ( &$seen ) {
			$seen[] = [ $settings['image_multiplier'], $previous['image_multiplier'] ];
		}, 10, 2 );

		$this->assertTrue( m_chart()->update_setting( 'image_multiplier', '1.5' ), 'a dotted number is a valid setting value' );
		$this->assertSame( '1.5', m_chart()->get_settings( 'image_multiplier' ), 'the memoised settings were reset' );
		$this->assertSame( '1.5', get_option( m_chart()->slug )['image_multiplier'] );

		$this->assertTrue( m_chart()->update_setting( 'performance', 'not-an-option' ) );
		$this->assertSame( 'default', m_chart()->get_settings( 'performance' ), 'an invalid value falls back to the default' );

		$this->assertTrue( m_chart()->update_setting( 'default_height', 9999 ) );
		$this->assertSame( M_Chart::HEIGHT_MAX, m_chart()->get_settings( 'default_height' ) );

		$this->assertFalse( m_chart()->update_setting( 'no_such_setting', 'x' ) );

		$this->assertCount( 3, $seen, 'the action fires once per successful update_setting()' );
		$this->assertSame( '1.5', (string) $seen[0][0], 'the action receives the new settings' );
		$this->assertSame( '2', (string) $seen[0][1], 'and the previous settings' );
	}

	public function test_update_setting_hands_the_filter_the_full_settings_array(): void {
		$submitted_keys = [];
		add_filter( 'm_chart_validated_settings', function ( $validated, $submitted ) use ( &$submitted_keys ) {
			$submitted_keys = array_keys( $submitted );

			return $validated;
		}, 10, 2 );

		m_chart()->update_setting( 'show_library', 'yes' );

		$this->assertContains( 'show_library', $submitted_keys );
		$this->assertContains( 'performance', $submitted_keys, 'consumers that reset absent keys see every key present' );
	}

	public function test_raw_post_meta_skips_filters_but_normalises_legacy_shapes(): void {
		$post_id = self::factory()->post->create( [ 'post_type' => m_chart()->slug ] );

		// Pre multi sheet shape: rows stored directly in data
		update_post_meta( $post_id, m_chart()->slug, [
			'library' => 'chartjs',
			'type'    => 'line',
			'data'    => [ [ '', 'A' ], [ 'Q1', 1 ] ],
		] );

		add_filter( 'm_chart_get_post_meta', function ( $meta ) {
			$meta['type'] = 'masked';

			return $meta;
		} );

		$raw = m_chart()->get_raw_post_meta( $post_id );

		$this->assertSame( 'line', $raw['type'], 'the m_chart_get_post_meta filter is not applied' );
		$this->assertSame( [ [ [ '', 'A' ], [ 'Q1', 1 ] ] ], $raw['data']['sets'] );
		$this->assertArrayNotHasKey( 'height', $raw, 'no defaults are filled in' );

		$this->assertSame( 'masked', m_chart()->get_post_meta( $post_id, 'type' ) );

		$this->assertFalse( m_chart()->get_raw_post_meta( self::factory()->post->create() ), 'a post without chart meta is false' );
	}

	public function test_normalize_legacy_data_handles_a_single_sheet_stored_in_sets(): void {
		$meta = m_chart()->normalize_legacy_data( [ 'data' => [ 'sets' => [ [ '', 'A' ], [ 'Q1', 1 ] ] ] ] );

		$this->assertSame( [ [ [ '', 'A' ], [ 'Q1', 1 ] ] ], $meta['data']['sets'] );

		$current = [ 'data' => [ 'sets' => [ [ [ '', 'A' ], [ 'Q1', 1 ] ] ] ] ];
		$this->assertSame( $current, m_chart()->normalize_legacy_data( $current ), 'current shapes pass through untouched' );
	}

	public function test_type_column_label_is_filterable_and_tolerates_unknown_types(): void {
		$post_id = self::factory()->post->create( [ 'post_type' => m_chart()->slug ] );

		m_chart()->update_post_meta( $post_id, [
			'library'   => 'chartjs',
			'type'      => 'line',
			'parse_in'  => 'rows',
			'theme'     => '_default',
			'data'      => [ 'sets' => [ [ [ '', 'A' ], [ 1, 2 ] ] ] ],
			'set_names' => [ 'Sheet 1' ],
			'height'    => 400,
		] );

		add_filter( 'm_chart_admin_type_column_label', fn( $label, $type, $id ) => $id === $post_id ? 'Table' : $label, 10, 3 );

		ob_start();
		m_chart()->admin()->manage_posts_custom_column( m_chart()->slug . '-type', $post_id );
		$html = ob_get_clean();

		$this->assertStringContainsString( 'title="Table"', $html );
		$this->assertStringContainsString( 'Table', wp_strip_all_tags( $html ) );

		// A type whose plugin is gone shows its slug rather than warning
		$meta         = get_post_meta( $post_id, m_chart()->slug, true );
		$meta['type'] = 'pro-only';
		update_post_meta( $post_id, m_chart()->slug, $meta );

		remove_all_filters( 'm_chart_admin_type_column_label' );

		ob_start();
		m_chart()->admin()->manage_posts_custom_column( m_chart()->slug . '-type', $post_id );
		$html = ob_get_clean();

		$this->assertStringContainsString( 'pro-only', $html );
	}

	public function test_freemius_config_and_settings_hook_suffix(): void {
		$config = m_chart()->get_freemius_config();

		$this->assertSame( '30258', $config['id'] );
		$this->assertSame( 'm-chart-pro', $config['premium_slug'] );
		$this->assertSame( 'm-chart-pro/m-chart-pro.php', $config['parallel_activation']['premium_version_basename'] );
		$this->assertSame( 'edit.php?post_type=m-chart', $config['menu']['slug'] );

		m_chart()->admin()->admin_menu();

		// The exact prefix depends on how WordPress resolves the parent menu, which differs between the test runner and a real admin screen
		$this->assertIsString( m_chart()->admin()->settings_hook_suffix );
		$this->assertStringEndsWith( '_page_m-chart-settings', m_chart()->admin()->settings_hook_suffix );
	}
}
