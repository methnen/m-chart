<?php
/**
 * Integration tests for the version gate in M_Chart::init()
 *
 * Every request reads the m_chart_version site option and runs the upgrade routines the site hasn't had yet:
 * the 1.7 routine (tag charts from before libraries existed as Highcharts) and the 1.7.4 routine (move the library
 * from a post tag into its own taxonomy)
 * The routines rewrite terms on every chart they match, so they have to run once and then never again
 *
 * UpgradeRoutineTest covers what each routine does to a chart, this covers when init() runs them
 * Two kinds of chart make that visible: one from before 1.7, which only the 1.7 routine picks up,
 * and one from the 1.7 era, which only the 1.7.4 routine changes
 */

declare( strict_types=1 );

final class InitUpgradeGateTest extends M_Chart_Integration_Test_Case {

	// The version of the newest upgrade routine, which is what a fully upgraded site has stored
	private const UPGRADED = '1.7.4';

	/**
	 * A chart as it was stored before 1.7: Highcharts was the only library, so nothing recorded it
	 */
	private function create_pre_1_7_chart(): int {
		$post_id = self::factory()->post->create( [
			'post_type'   => m_chart()->slug,
			'post_status' => 'publish',
		] );

		update_post_meta( $post_id, m_chart()->slug, [ 'type' => 'line' ] );
		wp_set_object_terms( $post_id, [ 'archive' ], 'post_tag' );

		return $post_id;
	}

	/**
	 * A chart as 1.7 to 1.7.3 stored it: the library recorded as a post tag
	 */
	private function create_1_7_era_chart(): int {
		$post_id = self::factory()->post->create( [
			'post_type'   => m_chart()->slug,
			'post_status' => 'publish',
		] );

		update_post_meta( $post_id, m_chart()->slug, [ 'library' => 'chartjs', 'type' => 'line' ] );
		wp_set_object_terms( $post_id, [ 'chartjs', 'sales' ], 'post_tag' );

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

	private function store_version( ?string $version ): void {
		if ( null === $version ) {
			delete_site_option( 'm_chart_version' );
		} else {
			update_site_option( 'm_chart_version', $version );
		}
	}

	private function assert_untouched_pre_1_7_chart( int $post_id, string $message ): void {
		$this->assertSame( [], $this->library( $post_id ), $message );
		$this->assertSame( [ 'archive' ], $this->tags( $post_id ), $message );
	}

	private function assert_untouched_1_7_era_chart( int $post_id, string $message ): void {
		$this->assertSame( [], $this->library( $post_id ), $message );
		$this->assertSame( [ 'chartjs', 'sales' ], $this->tags( $post_id ), $message );
	}

	public function test_a_fresh_site_is_marked_as_upgraded_on_its_first_request(): void {
		$this->store_version( null );

		m_chart()->init();

		$this->assertSame( self::UPGRADED, get_site_option( 'm_chart_version' ) );
	}

	public function test_a_fresh_site_gets_no_terms_it_has_no_charts_for(): void {
		$this->store_version( null );

		m_chart()->init();

		$this->assertNull( term_exists( 'highcharts', 'post_tag' ) );
		$this->assertNull( term_exists( 'highcharts', m_chart()->slug . '-library' ) );
	}

	public static function versions_from_before_1_7(): array {
		return [
			'no version stored' => [ null ],
			'an empty version'  => [ '' ],
			'1.0'               => [ '1.0' ],
			'1.6.2'             => [ '1.6.2' ],
			'1.7 beta'          => [ '1.7-beta' ],
		];
	}

	/**
	 * @dataProvider versions_from_before_1_7
	 */
	public function test_a_site_from_before_1_7_gets_both_routines_and_the_new_version( ?string $stored ): void {
		$old_chart = $this->create_pre_1_7_chart();
		$era_chart = $this->create_1_7_era_chart();

		$this->store_version( $stored );

		m_chart()->init();

		$this->assertSame( [ 'highcharts' ], $this->library( $old_chart ), 'The chart from before libraries is now a Highcharts chart' );
		$this->assertSame( [ 'archive' ], $this->tags( $old_chart ), 'It kept its own tag' );
		$this->assertSame( [ 'chartjs' ], $this->library( $era_chart ), 'The library tag became a library term' );
		$this->assertSame( [ 'sales' ], $this->tags( $era_chart ) );
		$this->assertSame( self::UPGRADED, get_site_option( 'm_chart_version' ) );
	}

	public static function versions_between_the_two_routines(): array {
		return [
			'1.7'   => [ '1.7' ],
			'1.7.0' => [ '1.7.0' ],
			'1.7.3' => [ '1.7.3' ],
		];
	}

	/**
	 * @dataProvider versions_between_the_two_routines
	 */
	public function test_a_site_that_already_had_1_7_only_gets_the_1_7_4_routine( string $stored ): void {
		$old_chart = $this->create_pre_1_7_chart();
		$era_chart = $this->create_1_7_era_chart();

		$this->store_version( $stored );

		m_chart()->init();

		$this->assert_untouched_pre_1_7_chart( $old_chart, 'The 1.7 routine did not run again' );
		$this->assertSame( [ 'chartjs' ], $this->library( $era_chart ), 'The 1.7.4 routine ran' );
		$this->assertSame( [ 'sales' ], $this->tags( $era_chart ) );
		$this->assertSame( self::UPGRADED, get_site_option( 'm_chart_version' ) );
	}

	public static function versions_that_are_up_to_date(): array {
		return [
			'1.7.4'            => [ '1.7.4' ],
			'1.8'              => [ '1.8' ],
			'1.10'             => [ '1.10' ],
			'2.3.3'            => [ '2.3.3' ],
			'a later version'  => [ '10.0' ],
		];
	}

	/**
	 * @dataProvider versions_that_are_up_to_date
	 */
	public function test_an_up_to_date_site_runs_no_routine( string $stored ): void {
		$old_chart = $this->create_pre_1_7_chart();
		$era_chart = $this->create_1_7_era_chart();

		$this->store_version( $stored );

		m_chart()->init();

		$this->assert_untouched_pre_1_7_chart( $old_chart, 'The 1.7 routine did not run' );
		$this->assert_untouched_1_7_era_chart( $era_chart, 'The 1.7.4 routine did not run' );
		$this->assertSame( $stored, get_site_option( 'm_chart_version' ), 'The stored version is left as it was' );
	}

	public function test_the_plugins_own_version_counts_as_up_to_date(): void {
		$old_chart = $this->create_pre_1_7_chart();

		$this->store_version( m_chart()->version );

		m_chart()->init();

		$this->assert_untouched_pre_1_7_chart( $old_chart, 'No routine ran' );
	}

	public function test_the_routines_do_not_run_again_on_the_next_request(): void {
		$this->store_version( '1.6.2' );

		m_chart()->init();

		$this->assertSame( self::UPGRADED, get_site_option( 'm_chart_version' ) );

		// Charts that look exactly like the ones the routines rewrite, made after the upgrade
		$old_chart = $this->create_pre_1_7_chart();
		$era_chart = $this->create_1_7_era_chart();

		m_chart()->init();
		m_chart()->init();

		$this->assert_untouched_pre_1_7_chart( $old_chart, 'The 1.7 routine did not run a second time' );
		$this->assert_untouched_1_7_era_chart( $era_chart, 'The 1.7.4 routine did not run a second time' );
		$this->assertSame( self::UPGRADED, get_site_option( 'm_chart_version' ) );
	}

	public function test_a_chart_upgraded_once_is_not_changed_by_later_requests(): void {
		$old_chart = $this->create_pre_1_7_chart();

		$this->store_version( null );

		m_chart()->init();

		$this->assertSame( [ 'highcharts' ], $this->library( $old_chart ) );

		// The site owner moves the chart to Chart.js afterwards
		wp_set_object_terms( $old_chart, 'chartjs', m_chart()->slug . '-library' );

		m_chart()->init();

		$this->assertSame( [ 'chartjs' ], $this->library( $old_chart ) );
		$this->assertSame( [ 'archive' ], $this->tags( $old_chart ) );
	}
}
