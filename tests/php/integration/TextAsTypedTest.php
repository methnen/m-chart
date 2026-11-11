<?php
/**
 * Integration tests for chart text rendering exactly as typed
 *
 * A Chart.js chart keeps cells, labels, set names and its text fields as typed and escapes them where they are printed
 * Before 2.4 text was tag stripped on the way in, which deleted anything between a "<" and a ">" ("x < y > z" became "x  z"),
 * cut labels at the first "<" ("5<10" became "5") and decoded entities someone had typed on purpose
 *
 * These tests follow each string through a save and read it back at every place it is shown:
 * the chart args the canvas is painted from, the HTML table, the editor, and the CSV export
 * XssRegressionTest holds the other half of the bargain, that none of it can become markup
 */

declare( strict_types=1 );

final class TextAsTypedTest extends M_Chart_Integration_Test_Case {

	protected $backupGlobals                  = false;
	protected $beStrictAboutOutputDuringTests = false;

	public function set_up(): void {
		parent::set_up();

		wp_set_current_user( self::factory()->user->create( [ 'role' => 'editor' ] ) );
	}

	public static function typed_strings(): array {
		return [
			'ampersand'                => [ 'R&D' ],
			'spaced angle brackets'    => [ 'x < y > z' ],
			'tight angle brackets'     => [ 'a<b and c>d' ],
			'less than'                => [ '5<10' ],
			'leading less than'        => [ '<5%' ],
			'quotes'                   => [ '"quoted" \'single\'' ],
			'typed entity'             => [ '&amp;' ],
			'typed encoded tag'        => [ '&lt;b&gt;' ],
			'typed tag'                => [ '<b>bold</b>' ],
			'accents and symbols'      => [ 'café €5 ±2°' ],
			'non-latin'                => [ '日本語' ],
			'backslash'                => [ 'C:\\temp' ],
			'percent and hex'          => [ '100%de' ],
			'script'                   => [ '<script>alert(1)</script>' ],
			'entity-typed img'         => [ '&lt;img src=x onerror=alert(1)&gt;' ],
			'dashes'                   => [ 'A – B — C' ],
		];
	}

	/**
	 * Save a chart the way the editor's form post does: every value slashed, the sheets as a JSON string
	 */
	private function save_chart( int $post_id, array $meta ): void {
		$data = $meta['data'];

		unset( $meta['data'] );

		$meta         = wp_slash( $meta );
		$meta['data'] = wp_slash( wp_json_encode( $data ) );

		m_chart()->update_post_meta( $post_id, $meta );
	}

	private function create_typed_chart( string $text, string $library = 'chartjs' ): int {
		$post_id = self::factory()->post->create( [
			'post_type'   => m_chart()->slug,
			'post_status' => 'publish',
			'post_title'  => 'Typed text chart',
		] );

		$this->save_chart( $post_id, $this->meta_with( $text, $library ) );

		return $post_id;
	}

	private function meta_with( string $text, string $library = 'chartjs' ): array {
		return [
			'library'        => $library,
			'type'           => 'column',
			'theme'          => '_default',
			'parse_in'       => 'rows',
			'labels'         => 1,
			'legend'         => 1,
			'include_source' => 1,
			'subtitle'       => $text,
			'x_title'        => $text,
			'y_title'        => $text,
			'source'         => $text,
			'height'         => 400,
			'set_names'      => [ $text, 'Second' ],
			'data'           => [
				// A corner cell, column labels, a row label and a data cell that is text
				[ [ '', 'Label ' . $text, 'Plain' ], [ 'Row ' . $text, '1', 'Cell ' . $text ], [ 'Other', '2', '3' ] ],
				[ [ '', 'B' ], [ 'x', '1' ] ],
			],
		];
	}

	private function chart_args( int $post_id ): array {
		$output = (string) m_chart()->get_chart( $post_id );

		$this->assertSame( 1, preg_match( '/const chartArgs = (.*);\s*$/m', $output, $match ), 'The chart rendered' );

		return json_decode( $match[1], true );
	}

	/**
	 * The text a browser would show for the first match of an XPath expression in a piece of HTML
	 */
	private function shown_text( string $html, string $xpath ): array {
		$document = new DOMDocument();

		@$document->loadHTML( '<?xml encoding="utf-8"?><div>' . $html . '</div>', LIBXML_HTML_NOIMPLIED | LIBXML_HTML_NODEFDTD );

		$texts = [];

		foreach ( ( new DOMXPath( $document ) )->query( $xpath ) as $node ) {
			$texts[] = $node->textContent;
		}

		return $texts;
	}

	/**
	 * @dataProvider typed_strings
	 */
	public function test_stored_meta_gives_back_exactly_what_was_typed( string $text ): void {
		$meta = m_chart()->get_post_meta( $this->create_typed_chart( $text ) );

		$this->assertSame( 'Label ' . $text, $meta['data']['sets'][0][0][1], 'label cell' );
		$this->assertSame( 'Row ' . $text, $meta['data']['sets'][0][1][0], 'row label cell' );
		$this->assertSame( 'Cell ' . $text, $meta['data']['sets'][0][1][2], 'data cell' );
		$this->assertSame( $text, $meta['set_names'][0], 'set name' );

		foreach ( M_Chart::TEXT_FIELDS as $field ) {
			$this->assertSame( $text, M_Chart::decode_text( $meta[ $field ] ), $field );
		}
	}

	/**
	 * @dataProvider typed_strings
	 */
	public function test_the_canvas_is_given_exactly_what_was_typed( string $text ): void {
		$args = $this->chart_args( $this->create_typed_chart( $text ) );

		$this->assertSame( $text, $args['options']['plugins']['subtitle']['text'], 'subtitle' );
		$this->assertSame( $text, $args['options']['scales']['x']['title']['text'], 'x axis title' );
		$this->assertSame( $text, $args['options']['scales']['y']['title']['text'], 'y axis title' );
		$this->assertSame( $text, $args['options']['plugins']['mchart']['source'], 'source line' );

		// Both label positions: the first row labels the axis, the first column names the series
		$labels = wp_json_encode( $args['data'] );

		$this->assertContains( 'Label ' . $text, $args['data']['labels'], 'axis labels: ' . $labels );
		$this->assertContains( 'Row ' . $text, array_column( $args['data']['datasets'], 'label' ), 'series names: ' . $labels );
	}

	/**
	 * @dataProvider typed_strings
	 */
	public function test_the_html_table_shows_exactly_what_was_typed( string $text ): void {
		$html = m_chart()->build_table( $this->create_typed_chart( $text ) );

		$this->assertContains( 'Label ' . $text, $this->shown_text( $html, '//table[1]//thead//th' ), 'column header' );
		$this->assertContains( 'Row ' . $text, $this->shown_text( $html, '//table[1]//tbody//th' ), 'row header' );
		$this->assertContains( 'Cell ' . $text, $this->shown_text( $html, '//table[1]//tbody//td' ), 'data cell' );
		$this->assertSame( 'Typed text chart: ' . $text, $this->shown_text( $html, '//table[1]/caption' )[0], 'caption with the set name' );

		// And none of it became an element
		$this->assertSame( [], $this->shown_text( $html, '//table//*[not(self::caption or self::thead or self::tbody or self::tr or self::th or self::td)]' ) );
	}

	/**
	 * @dataProvider typed_strings
	 */
	public function test_the_editor_is_given_exactly_what_was_typed( string $text ): void {
		$post_id = $this->create_typed_chart( $text );

		$screen         = WP_Screen::get( m_chart()->slug );
		$screen->base   = 'post';
		$screen->action = '';

		$GLOBALS['current_screen'] = $screen;
		$_GET['post']              = (string) $post_id;

		m_chart()->admin()->current_screen( $screen );

		$script = implode( "\n", (array) wp_scripts()->get_data( 'm-chart-admin-ui', 'before' ) );

		$this->assertSame( 1, preg_match( '/^var m_chart_admin = (.*);$/m', $script, $match ) );

		$data = json_decode( $match[1], true );

		foreach ( M_Chart::TEXT_FIELDS as $field ) {
			$this->assertSame( $text, $data['post_meta'][ $field ], $field . ' input' );
		}

		$this->assertSame( 'Cell ' . $text, $data['spreadsheet_data'][0][1][2], 'spreadsheet cell' );
		$this->assertSame( $text, $data['set_names'][0], 'sheet tab' );
	}

	/**
	 * @dataProvider typed_strings
	 */
	public function test_saving_again_and_again_never_changes_what_is_stored( string $text ): void {
		// Everything in the row that holds text
		$text_keys = array_flip( array_merge( M_Chart::TEXT_FIELDS, [ 'data', 'set_names', 'text_format' ] ) );

		$post_id = $this->create_typed_chart( $text );
		$first   = array_intersect_key( get_post_meta( $post_id, m_chart()->slug, true ), $text_keys );

		for ( $save = 0; $save < 10; $save++ ) {
			// What the editor posts back: the decoded text fields and the sheets it was given
			$meta = m_chart()->get_post_meta( $post_id );

			foreach ( M_Chart::TEXT_FIELDS as $field ) {
				$meta[ $field ] = M_Chart::decode_text( $meta[ $field ] );
			}

			$meta['data'] = $meta['data']['sets'];

			$this->save_chart( $post_id, $meta );
		}

		$this->assertSame( $first, array_intersect_key( get_post_meta( $post_id, m_chart()->slug, true ), $text_keys ) );
	}

	/**
	 * @dataProvider typed_strings
	 */
	public function test_the_preview_matches_the_saved_chart( string $text ): void {
		$post_id = $this->create_typed_chart( $text );
		$saved   = m_chart()->library( 'chartjs' )->get_chart_args_for_meta( $post_id, m_chart()->get_post_meta( $post_id ) );

		// The preview validates the posted, unsaved meta and builds the args from the result
		$posted         = $this->meta_with( $text );
		$data           = $posted['data'];
		$posted         = wp_slash( $posted );
		$posted['data'] = wp_slash( wp_json_encode( $data ) );

		$preview = m_chart()->library( 'chartjs' )->get_chart_args_for_meta( get_post( $post_id ), wp_unslash( m_chart()->validate_post_meta( $posted, 'preview' ) ) );

		$this->assertEquals( $saved['data'], $preview['data'] );
		$this->assertSame( $saved['options']['plugins']['subtitle']['text'], $preview['options']['plugins']['subtitle']['text'] );
	}

	public function test_a_chart_saved_before_cells_were_stored_as_typed_still_reads_the_same(): void {
		$post_id = self::factory()->post->create( [ 'post_type' => m_chart()->slug, 'post_status' => 'publish' ] );

		// The row as an early version stored it: cells kses encoded, no format stamp
		update_post_meta( $post_id, m_chart()->slug, [
			'library'  => 'chartjs',
			'type'     => 'column',
			'parse_in' => 'rows',
			'subtitle' => 'R&amp;D',
			'data'     => [ 'sets' => [ [ [ '', 'A &amp; B', 'caf&eacute;' ], [ 'Row &lt;1&gt;', '1', '2' ] ] ] ],
		] );

		$meta = m_chart()->get_post_meta( $post_id );

		$this->assertSame( 'A & B', $meta['data']['sets'][0][0][1] );
		$this->assertSame( 'café', $meta['data']['sets'][0][0][2] );
		$this->assertSame( 'Row <1>', $meta['data']['sets'][0][1][0] );

		$args = $this->chart_args( $post_id );

		$this->assertContains( 'A & B', $args['data']['labels'] );
		$this->assertSame( 'R&D', $args['options']['plugins']['subtitle']['text'] );

		// Opening it in the editor and saving stores what was shown, now stamped, and it reads the same afterwards
		$editor_meta             = $meta;
		$editor_meta['subtitle'] = M_Chart::decode_text( $meta['subtitle'] );
		$editor_meta['data']     = $meta['data']['sets'];

		$this->save_chart( $post_id, $editor_meta );

		$resaved = m_chart()->get_post_meta( $post_id );

		$this->assertSame( M_Chart::TEXT_FORMAT, $resaved['text_format'] );
		$this->assertSame( $meta['data'], $resaved['data'] );
		$this->assertSame( 'R&D', M_Chart::decode_text( $resaved['subtitle'] ) );
	}

	public function test_a_stamped_chart_is_not_decoded_again(): void {
		$meta = m_chart()->get_post_meta( $this->create_typed_chart( '&amp;lt;' ) );

		// A cell someone really typed as an entity stays that entity
		$this->assertSame( 'Cell &amp;lt;', $meta['data']['sets'][0][1][2] );
	}

	public function test_a_chart_using_another_library_keeps_the_tag_stripping(): void {
		// Any library but Chart.js is assumed to render strings as HTML, the way Highcharts does
		add_filter( 'm_chart_get_libraries', static fn( $libraries ) => $libraries + [ 'otherlib' => 'Other Library' ] );

		$meta = m_chart()->get_post_meta( $this->create_typed_chart( '<img src=x onerror=alert(1)> kept', 'otherlib' ) );

		$this->assertSame( 'otherlib', $meta['library'] );
		$this->assertSame( 'Cell  kept', $meta['data']['sets'][0][1][2], 'cells are tag stripped' );
		$this->assertSame( 'kept', trim( $meta['subtitle'] ), 'text fields are tag stripped' );

		// And its labels are still cleaned when they are parsed
		$labels = m_chart()->parse()->parse_data( [ [ '', '<b>bold</b> label' ], [ 'row', '1' ] ], 'rows' )->value_labels;

		$this->assertSame( [ 'bold label' ], $labels[ M_Chart_Parse::LABELS_FIRST_ROW ], 'the two argument call a library plugin makes keeps cleaning labels' );
	}

	public function test_the_filter_brings_the_tag_stripping_back_for_chartjs(): void {
		add_filter( 'm_chart_library_paints_plain_text', '__return_false' );

		// Real tags only: whether "x < y > z" counts as one is WordPress's decision and has changed between versions
		$post_id = $this->create_typed_chart( 'plain <b>bold</b> <img src=x onerror=alert(1)>text' );
		$meta    = m_chart()->get_post_meta( $post_id );

		$this->assertSame( 'Cell plain bold text', $meta['data']['sets'][0][1][2] );
		$this->assertStringNotContainsString( '<', $this->chart_args( $post_id )['options']['plugins']['subtitle']['text'] );
	}

	public function test_a_label_is_trimmed_and_otherwise_untouched(): void {
		$labels = m_chart()->parse()->parse_data( [ [ '', '  5<10  ', 'Temp <5°C' ], [ 'a<b', '1', '2' ] ], 'rows', M_Chart_Parse::TEXT_PLAIN )->value_labels;

		$this->assertSame( [ '5<10', 'Temp <5°C' ], $labels[ M_Chart_Parse::LABELS_FIRST_ROW ] );
		$this->assertSame( [ 'a<b' ], $labels[ M_Chart_Parse::LABELS_FIRST_COLUMN ] );
	}

	public function test_a_source_and_a_unit_with_an_ampersand_are_painted_without_the_entity(): void {
		$post_id = $this->create_typed_chart( 'R&D' );

		// WordPress stores the term name as "R&amp;D kg"
		$term = wp_insert_term( 'R&D kg', m_chart()->slug . '-units' );

		$meta            = m_chart()->get_post_meta( $post_id );
		$meta['y_units'] = get_term( $term['term_id'] )->slug;
		$meta['y_title'] = 'Weight';
		$meta['data']    = $meta['data']['sets'];

		foreach ( [ 'subtitle', 'x_title', 'source' ] as $field ) {
			$meta[ $field ] = M_Chart::decode_text( $meta[ $field ] );
		}

		$this->save_chart( $post_id, $meta );

		$args = $this->chart_args( $post_id );

		$this->assertSame( 'R&D', $args['options']['plugins']['mchart']['source'] );
		$this->assertSame( 'Weight (R&D kg)', $args['options']['scales']['y']['title']['text'] );
	}

	public function test_the_post_title_loses_real_tags_and_keeps_typed_text(): void {
		$post_id = $this->create_typed_chart( 'x' );

		// An administrator's title is stored unfiltered
		wp_update_post( [ 'ID' => $post_id, 'post_title' => 'Sales <em>2026</em> R&amp;D &lt;draft&gt;' ] );
		m_chart()->flush_chart_args_cache( $post_id );

		$this->assertSame( 'Sales 2026 R&D <draft>', $this->chart_args( $post_id )['options']['plugins']['title']['text'] );
	}
}
