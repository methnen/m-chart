<?php
/**
 * Integration tests for the Special characters test chart
 *
 * tests/bin/special-characters-chart.php puts a chart on a development site for looking at awkward text by hand
 * It is built from tests/fixtures/charts/special-characters.json and saved through the plugin's own save
 *
 * These make sure the chart it builds is the one the fixture describes, so what is looked at by hand is trustworthy,
 * and they are one more check that every string comes out of a real save exactly as it went in
 */

declare( strict_types=1 );

require_once dirname( __DIR__, 2 ) . '/bin/special-characters-chart.php';

final class SpecialCharactersFixtureTest extends M_Chart_Integration_Test_Case {

	private array $fixture;

	public function set_up(): void {
		parent::set_up();

		$this->fixture = m_chart_test_special_characters_fixture();

		// The script runs as an administrator, a title with < in it is not safe from WordPress's own filtering otherwise
		wp_set_current_user( self::factory()->user->create( [ 'role' => 'administrator' ] ) );
		kses_init();
	}

	private function chart_args( int $post_id ): array {
		$output = $this->render( fn () => m_chart()->get_chart( $post_id ) );

		$this->assertSame( 1, preg_match( '/const chartArgs = (.*);\s*$/m', $output, $match ), 'The chart rendered' );

		return json_decode( $match[1], true );
	}

	/**
	 * The text a browser would show for every match of an XPath expression in a piece of HTML
	 */
	private function shown_text( string $html, string $xpath ): array {
		$document = new DOMDocument();

		@$document->loadHTML( '<?xml encoding="utf-8"?><div>' . $html . '</div>', LIBXML_HTML_NOIMPLIED | LIBXML_HTML_NODEFDTD );

		$texts = [];

		foreach ( ( new DOMXPath( $document ) )->query( $xpath ) as $node ) {
			$texts[] = trim( $node->textContent );
		}

		return $texts;
	}

	public function test_the_fixture_has_the_strings_the_typed_text_tests_use(): void {
		// The same set TextAsTypedTest runs through every field, so the chart shows by hand what that test checks by machine
		$this->assertCount( 16, $this->fixture['strings'] );
		$this->assertSame( $this->fixture['strings'], array_values( array_unique( $this->fixture['strings'] ) ) );

		foreach ( [ 'R&D', 'x < y > z', '&amp;', '<b>bold</b>', '日本語', 'C:\\temp' ] as $string ) {
			$this->assertContains( $string, $this->fixture['strings'] );
		}
	}

	public function test_it_makes_a_published_chart_and_a_page_that_shows_it(): void {
		$made = m_chart_test_create_special_characters_chart();

		$this->assertSame( m_chart()->slug, get_post_type( $made['chart'] ) );
		$this->assertSame( 'publish', get_post_status( $made['chart'] ) );
		$this->assertSame( $this->fixture['title'], get_post( $made['chart'] )->post_title );

		$this->assertSame( 'page', get_post_type( $made['page'] ) );
		$this->assertStringContainsString( '[chart id="' . $made['chart'] . '"]', get_post( $made['page'] )->post_content );
		$this->assertStringContainsString( '[chart id="' . $made['chart'] . '" show="table"]', get_post( $made['page'] )->post_content );
	}

	public function test_running_it_again_refreshes_the_same_chart_and_page(): void {
		$first  = m_chart_test_create_special_characters_chart();
		$second = m_chart_test_create_special_characters_chart();

		$this->assertSame( $first, $second );
		$this->assertCount( 1, get_posts( [ 'post_type' => m_chart()->slug, 'post_status' => 'any', 'numberposts' => -1 ] ) );
	}

	public function test_the_chart_is_given_every_string_exactly_as_typed(): void {
		$made = m_chart_test_create_special_characters_chart();
		$args = $this->chart_args( $made['chart'] );

		$this->assertSame( $this->fixture['strings'], $args['data']['labels'] );
		$this->assertSame( $this->fixture['series'], array_column( $args['data']['datasets'], 'label' ) );

		// Long text is handed to Chart.js as lines
		$this->assertSame( $this->fixture['subtitle'], implode( ' ', (array) $args['options']['plugins']['subtitle']['text'] ) );
		$this->assertSame( $this->fixture['x_title'], implode( ' ', (array) $args['options']['scales']['x']['title']['text'] ) );
		$this->assertSame( $this->fixture['y_title'], implode( ' ', (array) $args['options']['scales']['y']['title']['text'] ) );
	}

	public function test_the_table_shows_every_string_exactly_as_typed(): void {
		$made  = m_chart_test_create_special_characters_chart();
		$table = $this->render( fn () => m_chart()->build_table( $made['chart'] ) );

		$this->assertSame( $this->fixture['strings'], $this->shown_text( $table, '//thead//th[@scope="col"]' ) );
		$this->assertSame( $this->fixture['series'], $this->shown_text( $table, '//tbody//th[@scope="row"]' ) );

		// Nothing in the fixture became an element
		$this->assertSame( [], $this->shown_text( $table, '//script | //img | //b' ) );
	}

	public function test_the_editor_is_given_the_text_fields_exactly_as_typed(): void {
		$made = m_chart_test_create_special_characters_chart();
		$meta = m_chart()->get_post_meta( $made['chart'] );

		foreach ( [ 'subtitle', 'x_title', 'y_title', 'source' ] as $field ) {
			$this->assertSame( $this->fixture[ $field ], M_Chart::decode_text( $meta[ $field ] ), $field );
		}

		$this->assertSame( [ $this->fixture['set_name'] ], $meta['set_names'] );
		$this->assertSame( $this->fixture['source_url'], $meta['source_url'] );
		$this->assertSame( array_merge( [ '' ], $this->fixture['strings'] ), $meta['data']['sets'][0][0] );
	}
}
