<?php
/**
 * Integration tests for the chart data handed to the admin app
 *
 * The edit screen localizes a chart's whole meta, sheet data and preview args for the React app
 * It used to take the chart ID straight from ?post=, which post.php checks before it shows anything
 * but post-new.php ignores, so post-new.php?post_type=m-chart&post=ID gave any user who could add a chart
 * every other chart's data, drafts and private charts included
 */

declare( strict_types=1 );

final class EditorScreenPostIdTest extends WP_UnitTestCase {

	private const MARKER = 'SECRETCELL';

	private int $victim_chart;

	public function set_up(): void {
		parent::set_up();

		m_chart()->library( 'chartjs' )->register_hooks();

		$this->victim_chart = $this->create_chart( self::factory()->user->create( [ 'role' => 'administrator' ] ), 'draft' );

		wp_scripts()->remove( 'm-chart-admin-ui' );
	}

	public function tear_down(): void {
		unset( $_GET['post'], $_GET['post_type'] );
		wp_scripts()->remove( 'm-chart-admin-ui' );
		set_current_screen( 'front' );
		parent::tear_down();
	}

	private function create_chart( int $author_id, string $status ): int {
		$post_id = self::factory()->post->create( [
			'post_type'   => m_chart()->slug,
			'post_status' => $status,
			'post_author' => $author_id,
		] );

		update_post_meta( $post_id, m_chart()->slug, m_chart()->validate_post_meta( [
			'library'  => 'chartjs',
			'type'     => 'column',
			'subtitle' => 'sub ' . self::MARKER,
			'data'     => [ 'sets' => [ [ [ '', 'A' ], [ self::MARKER, 1 ] ] ] ],
		] ) );

		return $post_id;
	}

	/**
	 * Run the screen setup the way wp-admin does and return what was localized for the admin app
	 */
	private function localized_for( string $action, $post_param ): string {
		$screen         = WP_Screen::get( m_chart()->slug );
		$screen->base   = 'post';
		$screen->action = $action;

		$GLOBALS['current_screen'] = $screen;

		$_GET['post_type'] = m_chart()->slug;

		if ( null === $post_param ) {
			unset( $_GET['post'] );
		} else {
			$_GET['post'] = $post_param;
		}

		m_chart()->admin()->current_screen( $screen );

		// The data is attached as an inline script that runs before the app
		return implode( "\n", array_filter( (array) wp_scripts()->get_data( 'm-chart-admin-ui', 'before' ) ) );
	}

	public function test_add_screen_ignores_the_post_parameter(): void {
		wp_set_current_user( self::factory()->user->create( [ 'role' => 'contributor' ] ) );

		$data = $this->localized_for( 'add', (string) $this->victim_chart );

		$this->assertNotSame( '', $data, 'The admin app still gets its data' );
		$this->assertStringNotContainsString( self::MARKER, $data );
		$this->assertStringNotContainsString( '"post_id":"' . $this->victim_chart . '"', $data );
		$this->assertStringNotContainsString( '"post_id":' . $this->victim_chart, $data );
	}

	public function test_add_screen_ignores_the_post_parameter_even_for_an_administrator(): void {
		wp_set_current_user( self::factory()->user->create( [ 'role' => 'administrator' ] ) );

		$this->assertStringNotContainsString( self::MARKER, $this->localized_for( 'add', (string) $this->victim_chart ) );
	}

	public function test_edit_screen_does_not_load_a_chart_the_user_cannot_edit(): void {
		wp_set_current_user( self::factory()->user->create( [ 'role' => 'contributor' ] ) );

		$this->assertStringNotContainsString( self::MARKER, $this->localized_for( '', (string) $this->victim_chart ) );
	}

	public function test_edit_screen_loads_the_users_own_chart(): void {
		$contributor = self::factory()->user->create( [ 'role' => 'contributor' ] );
		$own_chart   = $this->create_chart( $contributor, 'draft' );

		wp_set_current_user( $contributor );

		$data = $this->localized_for( '', (string) $own_chart );

		$this->assertStringContainsString( self::MARKER, $data );
		$this->assertStringContainsString( '"post_id":' . $own_chart, str_replace( '"post_id":"' . $own_chart . '"', '"post_id":' . $own_chart, $data ) );
	}

	public function test_edit_screen_ignores_a_post_that_is_not_a_chart(): void {
		$editor = self::factory()->user->create( [ 'role' => 'editor' ] );
		$post   = self::factory()->post->create( [ 'post_author' => $editor ] );

		update_post_meta( $post, m_chart()->slug, [ 'subtitle' => self::MARKER ] );

		wp_set_current_user( $editor );

		$this->assertStringNotContainsString( self::MARKER, $this->localized_for( '', (string) $post ) );
	}

	public function test_an_array_post_parameter_is_ignored(): void {
		wp_set_current_user( self::factory()->user->create( [ 'role' => 'editor' ] ) );

		$this->assertStringNotContainsString( self::MARKER, $this->localized_for( '', [ (string) $this->victim_chart ] ) );
	}
}
