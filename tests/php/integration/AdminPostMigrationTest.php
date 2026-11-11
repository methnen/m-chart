<?php
/**
 * Integration tests for the two admin-post.php requests behind the Highcharts migration notice
 *
 * "Migrate charts to Chart.js" posts to m_chart_migrate_highcharts, which rewrites every Highcharts chart on the site
 * "Dismiss" links to m_chart_dismiss_migration_notice, which hides the notice for everyone
 * Both change the whole site, so both are for someone who can manage options and arrived from the notice itself,
 * and both send the browser back to where it came from
 *
 * HighchartsMigrationTest covers what migrating one chart does, this covers the requests
 */

declare( strict_types=1 );

final class AdminPostMigrationTest extends M_Chart_Integration_Test_Case {

	private const MIGRATE = 'm_chart_migrate_highcharts';
	private const DISMISS = 'm_chart_dismiss_migration_notice';

	private const MIGRATE_NONCE = 'm-chart-migrate-highcharts';
	private const DISMISS_NONCE = 'm-chart-dismiss-migration-notice';

	private const LIBRARY_PLUGIN = 'm-chart-highcharts-library/m-chart-highcharts-library.php';

	public function set_up(): void {
		parent::set_up();

		wp_set_current_user( self::factory()->user->create( [ 'role' => 'administrator' ] ) );
	}

	private function create_highcharts_chart( string $status = 'publish' ): int {
		$post_id = self::factory()->post->create( [
			'post_type'   => m_chart()->slug,
			'post_status' => $status,
		] );

		// The row as it is in the database of a site that used the Highcharts library plugin
		update_post_meta( $post_id, m_chart()->slug, [
			'library'   => 'highcharts',
			'type'      => 'spline',
			'parse_in'  => 'rows',
			'theme'     => 'legacy-v2',
			'data'      => [ 'sets' => [ [ [ '', 'Series' ], [ 'A', '1' ], [ 'B', '2' ] ] ] ],
			'set_names' => [ 'Sheet 1' ],
			'height'    => 400,
		] );

		wp_set_object_terms( $post_id, 'highcharts', m_chart()->slug . '-library' );

		return $post_id;
	}

	private function library( int $post_id ): array {
		return [
			get_post_meta( $post_id, m_chart()->slug, true )['library'] ?? null,
			wp_get_object_terms( $post_id, m_chart()->slug . '-library', [ 'fields' => 'slugs' ] ),
		];
	}

	/**
	 * Send a request to admin-post.php the way wp-admin handles it for a logged in user
	 *
	 * @param string $action  the action in the request
	 * @param array  $request the rest of the request: _wpnonce, _wp_http_referer
	 */
	private function admin_post( string $action, array $request = [] ): void {
		$_REQUEST = wp_slash( [ 'action' => $action ] + $request );

		// wp-admin has started, which is when the plugin attaches its two handlers
		m_chart()->admin()->admin_init();

		$this->assertNotFalse( has_action( 'admin_post_' . $action ), 'The plugin answers the action' );

		do_action( 'admin_post_' . $action );
	}

	private function assert_refused( string $action, array $request, string $message ): void {
		try {
			$this->admin_post( $action, $request );
		} catch ( WPDieException $e ) {
			$this->assertStringContainsString( $message, $e->getMessage() );

			return;
		}

		$this->fail( 'The request should have been refused' );
	}

	private function chart_list_url(): string {
		return admin_url( 'edit.php?post_type=' . m_chart()->slug );
	}

	private function fake_library_active(): void {
		update_option( 'active_plugins', array_merge( (array) get_option( 'active_plugins', [] ), [ self::LIBRARY_PLUGIN ] ) );
	}

	/**
	 * The admin notices a page prints, for a request with the given query string
	 */
	private function notices( array $get = [] ): string {
		$_GET = $get;

		return $this->render( static function () {
			m_chart()->admin()->admin_init();

			do_action( 'admin_notices' );
		} );
	}

	public function test_a_logged_out_visitor_cannot_reach_either_request(): void {
		m_chart()->admin()->admin_init();

		// admin-post.php fires the nopriv action for a visitor, and nothing listens to it
		$this->assertFalse( has_action( 'admin_post_nopriv_' . self::MIGRATE ) );
		$this->assertFalse( has_action( 'admin_post_nopriv_' . self::DISMISS ) );
	}

	public function test_migrating_without_a_nonce_is_refused_and_changes_nothing(): void {
		$chart = $this->create_highcharts_chart();

		$this->assert_refused( self::MIGRATE, [], 'expired' );

		$this->assertSame( [ 'highcharts', [ 'highcharts' ] ], $this->library( $chart ) );
	}

	public static function nonces_that_do_not_belong_to_the_migration(): array {
		return [
			'made up'                 => [ static fn() => 'abcdef1234' ],
			'empty'                   => [ static fn() => '' ],
			'for dismissing'          => [ static fn() => wp_create_nonce( self::DISMISS_NONCE ) ],
			'for saving the settings' => [ static fn() => wp_create_nonce( 'm-chart-save-settings' ) ],
			'for no action'           => [ static fn() => wp_create_nonce() ],
		];
	}

	/**
	 * @dataProvider nonces_that_do_not_belong_to_the_migration
	 */
	public function test_migrating_with_the_wrong_nonce_is_refused_and_changes_nothing( callable $nonce ): void {
		$chart = $this->create_highcharts_chart();

		$this->assert_refused( self::MIGRATE, [ '_wpnonce' => $nonce() ], 'expired' );

		$this->assertSame( [ 'highcharts', [ 'highcharts' ] ], $this->library( $chart ) );
	}

	public function test_migrating_with_another_users_nonce_is_refused(): void {
		$chart = $this->create_highcharts_chart();
		$nonce = wp_create_nonce( self::MIGRATE_NONCE );

		wp_set_current_user( self::factory()->user->create( [ 'role' => 'administrator' ] ) );

		$this->assert_refused( self::MIGRATE, [ '_wpnonce' => $nonce ], 'expired' );

		$this->assertSame( [ 'highcharts', [ 'highcharts' ] ], $this->library( $chart ) );
	}

	public static function roles_that_cannot_manage_options(): array {
		return [
			'editor'      => [ 'editor' ],
			'author'      => [ 'author' ],
			'contributor' => [ 'contributor' ],
			'subscriber'  => [ 'subscriber' ],
		];
	}

	/**
	 * @dataProvider roles_that_cannot_manage_options
	 */
	public function test_migrating_is_refused_for_a_user_who_cannot_manage_options( string $role ): void {
		$chart = $this->create_highcharts_chart();

		wp_set_current_user( self::factory()->user->create( [ 'role' => $role ] ) );

		// Their own valid nonce, so the capability is the only thing in the way
		$this->assert_refused( self::MIGRATE, [ '_wpnonce' => wp_create_nonce( self::MIGRATE_NONCE ) ], 'Permission error' );

		$this->assertSame( [ 'highcharts', [ 'highcharts' ] ], $this->library( $chart ) );
	}

	public function test_migrating_moves_every_highcharts_chart_to_chartjs(): void {
		$published = $this->create_highcharts_chart();
		$draft     = $this->create_highcharts_chart( 'draft' );
		$private   = $this->create_highcharts_chart( 'private' );
		$pending   = $this->create_highcharts_chart( 'pending' );
		$chartjs   = $this->create_chart( [], [ 'theme' => 'color-blind-safe' ] );

		wp_set_object_terms( $chartjs, 'chartjs', m_chart()->slug . '-library' );

		$before = get_post_meta( $chartjs, m_chart()->slug, true );

		$location = $this->catch_redirect( fn() => $this->admin_post( self::MIGRATE, [ '_wpnonce' => wp_create_nonce( self::MIGRATE_NONCE ) ] ) );

		foreach ( [ 'published' => $published, 'draft' => $draft, 'private' => $private, 'pending' => $pending ] as $which => $chart ) {
			$this->assertSame( [ 'chartjs', [ 'chartjs' ] ], $this->library( $chart ), "The {$which} chart was migrated" );
			$this->assertSame( 'highcharts-v4', get_post_meta( $chart, m_chart()->slug, true )['theme'], 'A Highcharts only theme is swapped for its Chart.js look' );
			$this->assertSame( [ [ [ '', 'Series' ], [ 'A', '1' ], [ 'B', '2' ] ] ], get_post_meta( $chart, m_chart()->slug, true )['data']['sets'], 'The data is untouched' );
		}

		$this->assertSame( $before, get_post_meta( $chartjs, m_chart()->slug, true ), 'A chart that was already Chart.js is left alone' );

		parse_str( (string) wp_parse_url( $location, PHP_URL_QUERY ), $query );

		$this->assertSame( '4', $query['m-chart-migrated'], 'The redirect carries how many charts were migrated' );
	}

	public function test_a_chart_in_the_trash_is_left_alone_and_offered_again_once_it_is_restored(): void {
		$trashed = $this->create_highcharts_chart();

		wp_trash_post( $trashed );

		$location = $this->catch_redirect( fn() => $this->admin_post( self::MIGRATE, [ '_wpnonce' => wp_create_nonce( self::MIGRATE_NONCE ) ] ) );

		$this->assertSame( add_query_arg( 'm-chart-migrated', 0, $this->chart_list_url() ), $location );
		$this->assertSame( [ 'highcharts', [ 'highcharts' ] ], $this->library( $trashed ) );
		$this->assertStringNotContainsString( self::MIGRATE, $this->notices(), 'Nothing is offered while the only Highcharts chart is in the trash' );

		wp_untrash_post( $trashed );

		$this->assertStringContainsString( self::MIGRATE, $this->notices(), 'The restored chart is offered for migration' );
	}

	public function test_a_migrated_chart_renders_with_chartjs(): void {
		$chart = $this->create_highcharts_chart();

		$this->assertSame( '', (string) m_chart()->get_chart( $chart ), 'Without its library the chart printed nothing' );

		$this->catch_redirect( fn() => $this->admin_post( self::MIGRATE, [ '_wpnonce' => wp_create_nonce( self::MIGRATE_NONCE ) ] ) );

		$this->assertStringContainsString( '<canvas', (string) m_chart()->get_chart( $chart ) );
	}

	public function test_migrating_sends_the_browser_back_to_the_chart_list_when_it_has_no_referer(): void {
		$this->create_highcharts_chart();

		$location = $this->catch_redirect( fn() => $this->admin_post( self::MIGRATE, [ '_wpnonce' => wp_create_nonce( self::MIGRATE_NONCE ) ] ) );

		$this->assertSame( add_query_arg( 'm-chart-migrated', 1, $this->chart_list_url() ), $location );
	}

	public function test_migrating_sends_the_browser_back_to_the_page_the_notice_was_on(): void {
		$this->create_highcharts_chart();
		$this->create_highcharts_chart();

		$location = $this->catch_redirect( fn() => $this->admin_post( self::MIGRATE, [
			'_wpnonce'         => wp_create_nonce( self::MIGRATE_NONCE ),
			'_wp_http_referer' => '/wp-admin/plugins.php?plugin_status=active',
		] ) );

		$this->assertSame( '/wp-admin/plugins.php?plugin_status=active&m-chart-migrated=2', $location );
	}

	public function test_migrating_never_sends_the_browser_to_another_site(): void {
		$this->create_highcharts_chart();

		$location = $this->catch_redirect( fn() => $this->admin_post( self::MIGRATE, [
			'_wpnonce'         => wp_create_nonce( self::MIGRATE_NONCE ),
			'_wp_http_referer' => 'https://evil.example/phish',
		] ) );

		$this->assertSame( add_query_arg( 'm-chart-migrated', 1, $this->chart_list_url() ), $location );
	}

	public function test_migrating_with_nothing_to_migrate_reports_zero(): void {
		$chartjs = $this->create_chart();

		$location = $this->catch_redirect( fn() => $this->admin_post( self::MIGRATE, [ '_wpnonce' => wp_create_nonce( self::MIGRATE_NONCE ) ] ) );

		$this->assertSame( add_query_arg( 'm-chart-migrated', 0, $this->chart_list_url() ), $location );
		$this->assertSame( 'chartjs', get_post_meta( $chartjs, m_chart()->slug, true )['library'] );
	}

	public function test_a_chart_that_only_carries_the_highcharts_term_is_not_counted(): void {
		// Its own settings say Chart.js, the term was left behind by something else
		$mislabelled = $this->create_chart();

		wp_set_object_terms( $mislabelled, 'highcharts', m_chart()->slug . '-library' );

		$this->create_highcharts_chart();

		$location = $this->catch_redirect( fn() => $this->admin_post( self::MIGRATE, [ '_wpnonce' => wp_create_nonce( self::MIGRATE_NONCE ) ] ) );

		parse_str( (string) wp_parse_url( $location, PHP_URL_QUERY ), $query );

		$this->assertSame( '1', $query['m-chart-migrated'] );
	}

	public function test_the_page_the_browser_lands_on_says_how_many_charts_were_migrated(): void {
		$this->create_highcharts_chart();
		$this->create_highcharts_chart();
		$this->create_highcharts_chart();

		$this->assertStringContainsString( 'm_chart_migrate_highcharts', $this->notices(), 'The notice offers the migration first' );

		$location = $this->catch_redirect( fn() => $this->admin_post( self::MIGRATE, [ '_wpnonce' => wp_create_nonce( self::MIGRATE_NONCE ) ] ) );

		parse_str( (string) wp_parse_url( $location, PHP_URL_QUERY ), $query );

		$notices = $this->notices( $query );

		$this->assertStringContainsString( 'Migrated 3 charts to Chart.js', $notices );
		$this->assertStringNotContainsString( 'm_chart_migrate_highcharts', $notices, 'There is nothing left to migrate, the offer is gone' );
	}

	public function test_the_button_in_the_notice_carries_a_nonce_the_request_accepts(): void {
		$chart = $this->create_highcharts_chart();

		$processor = new WP_HTML_Tag_Processor( $this->notices() );
		$fields    = [];

		while ( $processor->next_tag( 'input' ) ) {
			$fields[ (string) $processor->get_attribute( 'name' ) ] = (string) $processor->get_attribute( 'value' );
		}

		$this->assertSame( self::MIGRATE, $fields['action'] ?? null, 'The form names the action' );
		$this->assertArrayHasKey( '_wpnonce', $fields );

		$action = $fields['action'];

		unset( $fields['action'] );

		$this->catch_redirect( fn() => $this->admin_post( $action, $fields ) );

		$this->assertSame( [ 'chartjs', [ 'chartjs' ] ], $this->library( $chart ) );
	}

	public function test_dismissing_without_a_nonce_is_refused_and_the_notice_stays(): void {
		$this->assert_refused( self::DISMISS, [], 'expired' );

		$this->assertFalse( get_option( 'm_chart_hide_migration_notice' ) );
	}

	public static function nonces_that_do_not_belong_to_the_dismissal(): array {
		return [
			'made up'       => [ static fn() => 'abcdef1234' ],
			'empty'         => [ static fn() => '' ],
			'for migrating' => [ static fn() => wp_create_nonce( self::MIGRATE_NONCE ) ],
			'for no action' => [ static fn() => wp_create_nonce() ],
		];
	}

	/**
	 * @dataProvider nonces_that_do_not_belong_to_the_dismissal
	 */
	public function test_dismissing_with_the_wrong_nonce_is_refused_and_the_notice_stays( callable $nonce ): void {
		$this->assert_refused( self::DISMISS, [ '_wpnonce' => $nonce() ], 'expired' );

		$this->assertFalse( get_option( 'm_chart_hide_migration_notice' ) );
	}

	/**
	 * @dataProvider roles_that_cannot_manage_options
	 */
	public function test_dismissing_is_refused_for_a_user_who_cannot_manage_options( string $role ): void {
		wp_set_current_user( self::factory()->user->create( [ 'role' => $role ] ) );

		$this->assert_refused( self::DISMISS, [ '_wpnonce' => wp_create_nonce( self::DISMISS_NONCE ) ], 'Permission error' );

		$this->assertFalse( get_option( 'm_chart_hide_migration_notice' ) );
	}

	public function test_dismissing_records_the_choice_and_migrates_nothing(): void {
		$chart = $this->create_highcharts_chart();

		$this->catch_redirect( fn() => $this->admin_post( self::DISMISS, [ '_wpnonce' => wp_create_nonce( self::DISMISS_NONCE ) ] ) );

		$this->assertEquals( 1, get_option( 'm_chart_hide_migration_notice' ) );
		$this->assertSame( [ 'highcharts', [ 'highcharts' ] ], $this->library( $chart ) );
	}

	public function test_dismissing_sends_the_browser_back_to_the_chart_list_when_it_has_no_referer(): void {
		$location = $this->catch_redirect( fn() => $this->admin_post( self::DISMISS, [ '_wpnonce' => wp_create_nonce( self::DISMISS_NONCE ) ] ) );

		$this->assertSame( $this->chart_list_url(), $location );
	}

	public function test_dismissing_sends_the_browser_back_to_the_page_the_notice_was_on(): void {
		$_SERVER['HTTP_REFERER'] = admin_url( 'index.php' );

		$location = $this->catch_redirect( fn() => $this->admin_post( self::DISMISS, [ '_wpnonce' => wp_create_nonce( self::DISMISS_NONCE ) ] ) );

		$this->assertSame( admin_url( 'index.php' ), $location );
	}

	public function test_dismissing_never_sends_the_browser_to_another_site(): void {
		$_SERVER['HTTP_REFERER'] = 'https://evil.example/phish';

		$location = $this->catch_redirect( fn() => $this->admin_post( self::DISMISS, [ '_wpnonce' => wp_create_nonce( self::DISMISS_NONCE ) ] ) );

		$this->assertSame( $this->chart_list_url(), $location );
	}

	public function test_the_dismiss_link_in_the_notice_is_one_the_request_accepts_and_hides_the_notice(): void {
		$this->create_highcharts_chart();
		$this->fake_library_active();

		$processor = new WP_HTML_Tag_Processor( $this->notices() );
		$link      = null;

		while ( $processor->next_tag( 'a' ) ) {
			if ( str_contains( (string) $processor->get_attribute( 'href' ), self::DISMISS ) ) {
				$link = (string) $processor->get_attribute( 'href' );
			}
		}

		$this->assertNotNull( $link, 'The notice has a Dismiss link while the library plugin is active' );
		$this->assertStringStartsWith( admin_url( 'admin-post.php' ), $link );

		parse_str( (string) wp_parse_url( $link, PHP_URL_QUERY ), $query );

		$action = $query['action'];

		unset( $query['action'] );

		$this->catch_redirect( fn() => $this->admin_post( $action, $query ) );

		$this->assertSame( '', $this->notices(), 'The notice is gone on the next page' );
	}
}
