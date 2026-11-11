<?php
/**
 * Integration tests for saving the M Chart settings page
 *
 * The page posts back to itself and M_Chart_Admin::save_settings() picks the submission up on admin_init
 * Only someone who can manage options and holds the page's nonce may change anything, every value is checked
 * against what its setting accepts, and a setting the form left out goes back to its default (how a checkbox is unticked)
 */

declare( strict_types=1 );

final class SettingsSaveTest extends M_Chart_Integration_Test_Case {

	// One valid, non default value for every setting the plugin has
	private const CHANGED = [
		'library'          => 'chartjs',
		'show_library'     => 'yes',
		'performance'      => 'no-images',
		'image_multiplier' => '3',
		'image_width'      => '1200',
		'default_height'   => '750',
		'embeds'           => 'enabled',
		'defer_rendering'  => '',
		'default_theme'    => 'color-blind-safe',
		'locale'           => 'de-DE',
		'csv_delimiter'    => ';',
	];

	private int $admin_id;

	// Every call of the m_chart_settings_saved action: [ settings, previous ]
	private array $saved = [];

	public function set_up(): void {
		parent::set_up();

		$this->admin_id = self::factory()->user->create( [ 'role' => 'administrator' ] );

		wp_set_current_user( $this->admin_id );

		$this->saved = [];

		add_action( 'm_chart_settings_saved', function ( $settings, $previous ) {
			$this->saved[] = [ $settings, $previous ];
		}, 10, 2 );
	}

	private function nonce(): string {
		return wp_create_nonce( m_chart()->slug . '-save-settings' );
	}

	/**
	 * Post the settings form the way a browser does and let wp-admin start up
	 *
	 * @param array       $fields the form's fields
	 * @param string|null $nonce  the nonce field, null to leave it out of the form
	 */
	private function submit( array $fields, ?string $nonce ): void {
		if ( null !== $nonce ) {
			$fields['nonce'] = $nonce;
		}

		// WordPress slashes everything in $_POST
		$_POST[ m_chart()->slug ] = wp_slash( $fields );

		m_chart()->admin()->admin_init();
	}

	private function assert_nothing_was_saved(): void {
		$this->assertFalse( get_option( m_chart()->slug ), 'No settings were stored' );
		$this->assertSame( [], $this->saved, 'The saved action did not fire' );
		$this->assertFalse( has_action( 'admin_notices', [ m_chart()->admin(), 'save_success' ] ), 'No success notice is waiting' );
		$this->assertSame( '', m_chart()->get_settings( 'embeds' ) );
		$this->assertSame( 'default', m_chart()->get_settings( 'performance' ) );
	}

	/**
	 * Everything the admin notices area prints after the request
	 */
	private function notices(): string {
		return $this->render( static function () {
			do_action( 'admin_notices' );
		} );
	}

	public function test_the_changed_values_cover_every_setting(): void {
		// If a setting is added, the tests below have to learn about it
		$this->assertSame( array_keys( m_chart()->settings ), array_keys( self::CHANGED ) );

		foreach ( self::CHANGED as $setting => $value ) {
			if ( 'library' === $setting ) {
				// Chart.js is the only library there is without another plugin
				continue;
			}

			$this->assertNotEquals( m_chart()->settings[ $setting ], $value, "{$setting} is given a value that is not its default" );
		}
	}

	public function test_a_submission_without_a_nonce_saves_nothing(): void {
		$this->submit( self::CHANGED, null );

		$this->assert_nothing_was_saved();
	}

	public static function wrong_nonces(): array {
		return [
			'empty'                 => [ static fn() => '' ],
			'made up'               => [ static fn() => 'abcdef1234' ],
			'for saving a chart'    => [ static fn() => wp_create_nonce( 'm-chart-save-post' ) ],
			'for no action'         => [ static fn() => wp_create_nonce() ],
			'for a similar action'  => [ static fn() => wp_create_nonce( 'm-chart-save-settings-' ) ],
		];
	}

	/**
	 * @dataProvider wrong_nonces
	 */
	public function test_a_submission_with_the_wrong_nonce_saves_nothing( callable $nonce ): void {
		$this->submit( self::CHANGED, $nonce() );

		$this->assert_nothing_was_saved();
	}

	public function test_a_nonce_made_for_another_user_saves_nothing(): void {
		$nonce = $this->nonce();

		wp_set_current_user( self::factory()->user->create( [ 'role' => 'administrator' ] ) );

		$this->submit( self::CHANGED, $nonce );

		$this->assert_nothing_was_saved();
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
	public function test_a_user_who_cannot_manage_options_saves_nothing_even_with_a_valid_nonce( string $role ): void {
		wp_set_current_user( self::factory()->user->create( [ 'role' => $role ] ) );

		// Their own nonce for the right action, so the capability is the only thing in the way
		$nonce = $this->nonce();

		$this->assertSame( 1, wp_verify_nonce( $nonce, m_chart()->slug . '-save-settings' ) );

		$this->submit( self::CHANGED, $nonce );

		$this->assert_nothing_was_saved();
	}

	public function test_a_logged_out_visitor_saves_nothing(): void {
		wp_set_current_user( 0 );

		$this->submit( self::CHANGED, $this->nonce() );

		$this->assert_nothing_was_saved();
	}

	public function test_a_request_that_is_not_a_settings_submission_saves_nothing(): void {
		m_chart()->admin()->admin_init();

		$this->assert_nothing_was_saved();
	}

	public function test_a_valid_submission_stores_every_setting(): void {
		$this->submit( self::CHANGED, $this->nonce() );

		$stored = get_option( m_chart()->slug );

		$this->assertIsArray( $stored );
		$this->assertSame( array_keys( self::CHANGED ), array_keys( $stored ), 'Every setting is stored, and nothing else' );

		foreach ( self::CHANGED as $setting => $value ) {
			$this->assertEquals( $value, $stored[ $setting ], "{$setting} was stored" );
			$this->assertEquals( $value, m_chart()->get_settings( $setting ), "{$setting} is what the rest of the request now reads" );
		}
	}

	public function test_a_valid_submission_changes_how_the_plugin_behaves(): void {
		$chart_id = $this->create_chart();

		$this->assertStringContainsString( '<canvas', (string) m_chart()->get_chart( $chart_id ) );

		$this->submit( self::CHANGED, $this->nonce() );

		// Embeds were switched on, so a chart on a page is now an iframe
		$this->assertStringContainsString( '<iframe', (string) m_chart()->get_chart( $chart_id ) );
	}

	public function test_a_valid_submission_fires_the_saved_action_with_the_new_and_the_previous_settings(): void {
		$this->submit( self::CHANGED, $this->nonce() );

		$this->assertCount( 1, $this->saved, 'The action fires once' );

		[ $settings, $previous ] = $this->saved[0];

		$this->assertSame( 'enabled', $settings['embeds'] );
		$this->assertSame( 'no-images', $settings['performance'] );
		$this->assertSame( '', $previous['embeds'] );
		$this->assertSame( 'default', $previous['performance'] );
	}

	public function test_a_valid_submission_shows_the_saved_notice(): void {
		$this->submit( self::CHANGED, $this->nonce() );

		$notices = $this->notices();

		$this->assertStringContainsString( 'Settings saved', $notices );
		$this->assertSame( 1, substr_count( $notices, 'notice-success' ), 'The notice is shown once' );
	}

	public function test_no_notice_is_shown_when_nothing_was_saved(): void {
		$this->submit( self::CHANGED, 'not-the-nonce' );

		$this->assertStringNotContainsString( 'Settings saved', $this->notices() );
	}

	public function test_a_setting_the_form_left_out_goes_back_to_its_default(): void {
		$this->submit( self::CHANGED, $this->nonce() );

		$this->assertSame( 'enabled', m_chart()->get_settings( 'embeds' ) );
		$this->assertSame( 'yes', m_chart()->get_settings( 'show_library' ) );

		// A browser leaves an unticked checkbox out of the form
		$unticked = self::CHANGED;

		unset( $unticked['embeds'], $unticked['show_library'] );

		$this->submit( $unticked, $this->nonce() );

		$this->assertSame( '', m_chart()->get_settings( 'embeds' ) );
		$this->assertSame( 'no', m_chart()->get_settings( 'show_library' ) );
		$this->assertSame( 'no-images', m_chart()->get_settings( 'performance' ), 'The settings that were in the form are kept' );
	}

	public function test_defer_rendering_can_be_switched_off(): void {
		// The form posts an empty value for the unticked box so it doesn't fall back to its default of enabled
		$this->submit( [ 'defer_rendering' => '' ], $this->nonce() );

		$this->assertSame( '', get_option( m_chart()->slug )['defer_rendering'] );

		$this->submit( [], $this->nonce() );

		$this->assertSame( 'enabled', get_option( m_chart()->slug )['defer_rendering'] );
	}

	public static function values_a_setting_accepts(): array {
		return [
			'performance default'      => [ 'performance', 'default', 'default' ],
			'performance no images'    => [ 'performance', 'no-images', 'no-images' ],
			'delimiter comma'          => [ 'csv_delimiter', ',', ',' ],
			'delimiter tab'            => [ 'csv_delimiter', "\t", "\t" ],
			'delimiter space'          => [ 'csv_delimiter', ' ', ' ' ],
			'delimiter semicolon'      => [ 'csv_delimiter', ';', ';' ],
			'defer rendering on'       => [ 'defer_rendering', 'enabled', 'enabled' ],
			'defer rendering off'      => [ 'defer_rendering', '', '' ],
			'height in range'          => [ 'default_height', '750', 750 ],
			'height at the minimum'    => [ 'default_height', (string) M_Chart::HEIGHT_MIN, M_Chart::HEIGHT_MIN ],
			'height at the maximum'    => [ 'default_height', (string) M_Chart::HEIGHT_MAX, M_Chart::HEIGHT_MAX ],
			'multiplier with a dot'    => [ 'image_multiplier', '1.5', '1.5' ],
			'image width'              => [ 'image_width', '1600', '1600' ],
			'theme slug'               => [ 'default_theme', 'my_custom-theme.v2', 'my_custom-theme.v2' ],
			'locale'                   => [ 'locale', 'pt-BR', 'pt-BR' ],
			'show library'             => [ 'show_library', 'yes', 'yes' ],
			'embeds'                   => [ 'embeds', 'enabled', 'enabled' ],
		];
	}

	public static function values_a_setting_refuses(): array {
		return [
			// A setting with a fixed list of options takes nothing else
			'performance unknown'          => [ 'performance', 'turbo', 'default' ],
			'performance retired option'   => [ 'performance', 'no-preview', 'default' ],
			'performance wrong case'       => [ 'performance', 'No-Images', 'default' ],
			'performance as a list'        => [ 'performance', [ 'no-images' ], 'default' ],
			'delimiter pipe'               => [ 'csv_delimiter', '|', ',' ],
			'delimiter two characters'     => [ 'csv_delimiter', ';;', ',' ],
			'delimiter empty'              => [ 'csv_delimiter', '', ',' ],
			'delimiter newline'            => [ 'csv_delimiter', "\n", ',' ],
			'delimiter as a list'          => [ 'csv_delimiter', [ ';' ], ',' ],
			'defer rendering unknown'      => [ 'defer_rendering', 'yes', 'enabled' ],
			'defer rendering as a list'    => [ 'defer_rendering', [ '' ], 'enabled' ],

			// The default height is kept inside the range a chart's own height has
			'height too small'             => [ 'default_height', '10', M_Chart::HEIGHT_MIN ],
			'height zero'                  => [ 'default_height', '0', M_Chart::HEIGHT_MIN ],
			'height too large'             => [ 'default_height', '99999', M_Chart::HEIGHT_MAX ],
			'height not a number'          => [ 'default_height', 'tall', M_Chart::HEIGHT_MIN ],
			'height with markup'           => [ 'default_height', '700"><script>alert(1)</script>', 700 ],
			'height as a list'             => [ 'default_height', [ '700' ], 600 ],

			// Everything else has to be a plain word: letters, digits, dots, dashes and underscores
			'library with a space'         => [ 'library', 'chart js', 'chartjs' ],
			'library as a list'            => [ 'library', [ 'chartjs' ], 'chartjs' ],
			'show library with markup'     => [ 'show_library', 'yes"><script>alert(1)</script>', 'no' ],
			'show library empty'           => [ 'show_library', '', 'no' ],
			'multiplier with sql'          => [ 'image_multiplier', '2; DROP TABLE wp_options', '2' ],
			'multiplier with a tag'        => [ 'image_multiplier', '<b>3</b>', '2' ],
			'image width with a unit'      => [ 'image_width', '900 px', '900' ],
			'image width as a list'        => [ 'image_width', [ '1200' ], '900' ],
			'embeds with a quote'          => [ 'embeds', 'enabled"', '' ],
			'embeds with a newline'        => [ 'embeds', "enabled\n", '' ],
			'theme path traversal'         => [ 'default_theme', '../../../wp-config', '_default' ],
			'theme with a php tag'         => [ 'default_theme', '<?php evil(); ?>', '_default' ],
			'theme with a null byte'       => [ 'default_theme', "_default\0.php", '_default' ],
			'locale with an attribute'     => [ 'locale', 'en-US" onload="alert(1)', 'en-US' ],
			'locale with a backslash'      => [ 'locale', 'en\\US', 'en-US' ],
			'locale non-latin'             => [ 'locale', 'ja-日本', 'en-US' ],
		];
	}

	/**
	 * @dataProvider values_a_setting_accepts
	 * @dataProvider values_a_setting_refuses
	 */
	public function test_each_setting_only_stores_a_value_it_accepts( string $setting, $submitted, $expected ): void {
		$this->submit( [ $setting => $submitted ], $this->nonce() );

		$stored = get_option( m_chart()->slug );

		$this->assertEquals( $expected, $stored[ $setting ] );
		$this->assertIsScalar( $stored[ $setting ] );

		// Whatever was sent, what is stored is one of the setting's options, a height in range or a plain word
		$this->assertMatchesRegularExpression( '#^([a-zA-Z0-9._-]*|[,; \t])$#', (string) $stored[ $setting ] );
	}

	public function test_a_library_that_is_not_installed_is_never_what_the_plugin_uses(): void {
		// The name is a plain word so it is stored, a library plugin may be activated later
		$this->submit( [ 'library' => 'highcharts' ], $this->nonce() );

		$this->assertSame( 'highcharts', get_option( m_chart()->slug )['library'] );
		$this->assertSame( 'chartjs', m_chart()->get_settings( 'library' ) );
		$this->assertSame( 'chartjs', m_chart()->get_library() );
	}

	public function test_fields_that_are_not_settings_are_ignored(): void {
		$this->submit(
			self::CHANGED + [
				'is_admin'      => '1',
				'siteurl'       => 'https://evil.example',
				'unknown'       => 'value',
				'nested'        => [ 'a' => 'b' ],
				'0'             => 'numeric key',
			],
			$this->nonce()
		);

		$stored = get_option( m_chart()->slug );

		$this->assertSame( array_keys( m_chart()->settings ), array_keys( $stored ) );
		$this->assertArrayNotHasKey( 'nonce', $stored, 'The nonce field is not a setting either' );
		$this->assertSame( 'http://' . WP_TESTS_DOMAIN, get_option( 'siteurl' ), 'No other option was touched' );
	}

	public function test_a_setting_a_library_plugin_adds_is_saved_like_the_plugins_own(): void {
		add_filter( 'm_chart_default_settings', static fn( $settings ) => $settings + [ 'addon_mode' => 'off' ] );

		$this->submit( [ 'addon_mode' => 'on' ], $this->nonce() );

		$this->assertSame( 'on', get_option( m_chart()->slug )['addon_mode'] );
		$this->assertSame( 'on', m_chart()->get_settings( 'addon_mode' ) );

		$this->submit( [ 'addon_mode' => 'on<script>' ], $this->nonce() );

		$this->assertSame( 'off', get_option( m_chart()->slug )['addon_mode'], 'It is validated like any other setting' );
	}

	public function test_a_library_plugin_can_validate_its_own_setting_from_what_was_submitted(): void {
		$seen = [];

		add_filter( 'm_chart_validated_settings', static function ( $validated, $submitted ) use ( &$seen ) {
			$seen = $submitted;

			// A shape the plain word rule would never let through
			$validated['addon_list'] = array_map( 'absint', (array) ( $submitted['addon_list'] ?? [] ) );

			return $validated;
		}, 10, 2 );

		$this->submit( [ 'embeds' => 'enabled', 'addon_list' => [ '3', '7', 'x' ] ], $this->nonce() );

		$this->assertSame( [ 3, 7, 0 ], get_option( m_chart()->slug )['addon_list'] );
		$this->assertSame( 'enabled', $seen['embeds'], 'The filter is given the form as it was submitted' );
	}

	public function test_saving_twice_stores_the_second_submission(): void {
		$this->submit( self::CHANGED, $this->nonce() );
		$this->submit( [ 'performance' => 'default', 'locale' => 'fr-FR' ] + self::CHANGED, $this->nonce() );

		$this->assertSame( 'default', m_chart()->get_settings( 'performance' ) );
		$this->assertSame( 'fr-FR', m_chart()->get_settings( 'locale' ) );
		$this->assertCount( 2, $this->saved );
		$this->assertSame( 'no-images', $this->saved[1][1]['performance'], 'The second save is told what the first one stored' );
	}

	public function test_the_form_the_settings_page_prints_saves_back_what_it_showed(): void {
		// Settings as a site owner left them, different from the defaults wherever the page has a control for it
		update_option( m_chart()->slug, [ 'default_height' => 750 ] + self::CHANGED );
		m_chart()->reset_settings();

		// The Chart.js rows are added to the page through this hook
		$this->add_admin_hook( 'm_chart_settings_admin', 'm_chart_settings_admin' );

		$page = $this->render( static function () {
			m_chart()->admin()->m_chart_settings();
		} );

		// The page template is loaded with require_once, so it only prints the first time in a process
		$this->assertStringContainsString( 'm-chart-settings-page', $page, 'The settings page printed (only one test in a run can render it)' );

		$fields = $this->successful_controls( $page );

		$this->assertArrayHasKey( 'nonce', $fields, 'The page carries the nonce the handler asks for' );

		$nonce = $fields['nonce'];

		unset( $fields['nonce'] );

		delete_option( m_chart()->slug );
		m_chart()->reset_settings();

		$this->submit( $fields, $nonce );

		$stored = get_option( m_chart()->slug );

		$this->assertIsArray( $stored, 'The handler accepted the form' );

		foreach ( self::CHANGED as $setting => $value ) {
			$this->assertEquals( $value, $stored[ $setting ], "{$setting} survived being shown and saved" );
		}
	}

	/**
	 * The fields of the plugin's form that a browser would submit, keyed by setting
	 *
	 * Text, number and hidden inputs, ticked checkboxes and radios, and the selected option of each select
	 * A later control with the same name wins, as it does in PHP's $_POST
	 */
	private function successful_controls( string $html ): array {
		$processor = new WP_HTML_Tag_Processor( $html );
		$fields    = [];
		$select    = null;

		while ( $processor->next_tag() ) {
			$tag  = $processor->get_tag();
			$name = $processor->get_attribute( 'name' );

			if ( 'SELECT' === $tag ) {
				$select = $this->setting_name( $name );

				continue;
			}

			if ( 'OPTION' === $tag ) {
				if ( null !== $select && null !== $processor->get_attribute( 'selected' ) ) {
					$fields[ $select ] = (string) $processor->get_attribute( 'value' );
				}

				continue;
			}

			if ( 'INPUT' !== $tag || null === $this->setting_name( $name ) ) {
				continue;
			}

			$type = $processor->get_attribute( 'type' );

			if ( in_array( $type, [ 'checkbox', 'radio' ], true ) && null === $processor->get_attribute( 'checked' ) ) {
				continue;
			}

			$fields[ $this->setting_name( $name ) ] = (string) $processor->get_attribute( 'value' );
		}

		return $fields;
	}

	/**
	 * "m-chart[embeds]" => "embeds", null for a control that isn't one of the plugin's fields
	 */
	private function setting_name( $name ): ?string {
		if ( is_string( $name ) && preg_match( '/^' . preg_quote( m_chart()->slug, '/' ) . '\[([^\]]+)\]$/', $name, $match ) ) {
			return $match[1];
		}

		return null;
	}
}
