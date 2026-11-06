<?php
/**
 * Integration tests for the admin preview AJAX handler
 *
 * WordPress slashes $_POST and update_post_meta() unslashes on save, so the preview has to unslash the validated meta
 * itself or every quote in a cell, subtitle, sheet name or title renders with a backslash in front of it
 */

declare( strict_types=1 );

final class PreviewAjaxTest extends WP_Ajax_UnitTestCase {

	public function set_up(): void {
		parent::set_up();

		// Both the Chart.js library class and the admin class are created lazily and hook themselves in their constructors,
		// WP_UnitTestCase restores the hook table after every test so those hooks have to be re-attached here
		m_chart()->library( 'chartjs' )->register_hooks();
		add_action( 'wp_ajax_m_chart_get_chart_args', [ m_chart()->admin(), 'ajax_get_chart_args' ] );
	}

	public function tear_down(): void {
		$_POST = [];
		m_chart()->set_preview_request( false );

		parent::tear_down();
	}

	/**
	 * Run the preview request the way the admin app sends it, with $_POST slashed like wp_magic_quotes() does
	 *
	 * @param array $post_meta the post_meta fields, data as the JSON string the spreadsheet submits
	 * @param string $title the chart title
	 *
	 * @return array the decoded chart args
	 */
	private function preview( array $post_meta, string $title ): array {
		$editor_id = self::factory()->user->create( [ 'role' => 'editor' ] );
		wp_set_current_user( $editor_id );

		$post_id = self::factory()->post->create( [
			'post_type'   => m_chart()->slug,
			'post_author' => $editor_id,
		] );

		$_POST = wp_slash( [
			'post_id'   => (string) $post_id,
			'nonce'     => wp_create_nonce( m_chart()->slug . '-save-post' ),
			'library'   => 'chartjs',
			'title'     => $title,
			'post_meta' => array_merge( [
				'library'  => 'chartjs',
				'type'     => 'line',
				'parse_in' => 'rows',
				'theme'    => '_default',
			], $post_meta ),
		] );

		try {
			$this->_handleAjax( 'm_chart_get_chart_args' );
		} catch ( WPAjaxDieContinueException $e ) {
			// wp_send_json_success() dies, which the ajax test case turns into this exception
		}

		$response = json_decode( $this->_last_response, true );

		$this->assertTrue( $response['success'] ?? false, 'the preview request succeeds: ' . var_export( $this->_last_response, true ) );

		return $response['data'];
	}

	/**
	 * @return string[] every string anywhere in the chart args
	 */
	private function strings( array $args ): array {
		$found = [];

		array_walk_recursive( $args, function ( $value ) use ( &$found ) {
			if ( is_string( $value ) ) {
				$found[] = $value;
			}
		} );

		return $found;
	}

	public function test_preview_text_carries_no_backslashes(): void {
		$args = $this->preview( [
			'subtitle'  => "Q1 'rough'",
			'set_names' => [ "Tom's" ],
			'data'      => wp_json_encode( [ [ [ '', "O'Reilly" ], [ 'A', 1 ], [ 'B', 2 ] ] ] ),
		], "O'Reilly" );

		$strings = $this->strings( $args );

		$this->assertContains( "O'Reilly", $strings, 'the cell and title text survive unslashed' );
		$this->assertContains( "Q1 'rough'", $strings, 'the subtitle survives unslashed' );

		foreach ( $strings as $string ) {
			$this->assertStringNotContainsString( "\\'", $string, 'no string in the preview args is slashed' );
		}
	}

	public function test_preview_keeps_a_literal_backslash_in_a_cell(): void {
		$args = $this->preview( [
			'data' => wp_json_encode( [ [ [ '', 'C:\\temp' ], [ 'A', 1 ], [ 'B', 2 ] ] ] ),
		], 'Paths' );

		$this->assertContains( 'C:\\temp', $this->strings( $args ), 'a backslash the user typed is neither doubled nor stripped' );
	}
}
