<?php
/**
 * Integration tests for the [m-chart] shortcode and its older [chart] name
 *
 * The shortcode is how a chart gets into a post: it takes the chart's ID and optionally what to show (the chart,
 * its data as a table, or its image), a fixed width, and whether to offer the embed code
 * Whoever writes the post controls every attribute, so none of them may be able to add markup to the page,
 * and it only ever shows a published chart
 */

declare( strict_types=1 );

final class ShortcodeTest extends M_Chart_Integration_Test_Case {

	private const MARKER = 'SHORTCODEROW';

	// Every element the chart and table templates write
	private const CHART_ELEMENTS = [ 'FIGURE', 'CANVAS', 'FIGCAPTION', 'P', 'DIV', 'TABLE', 'CAPTION', 'THEAD', 'TBODY', 'TR', 'TH', 'TD', 'SCRIPT' ];

	private int $chart_id;

	public function set_up(): void {
		parent::set_up();

		$this->chart_id = $this->create_chart(
			[ 'post_title' => 'Shortcode chart' ],
			[ 'data' => [ 'sets' => [ [ [ '', 'A', 'B' ], [ self::MARKER, 1, 2 ] ] ] ] ]
		);
	}

	/**
	 * What a post containing the shortcode prints in its place
	 */
	private function shortcode( string $attributes, string $name = 'm-chart' ): string {
		// Each call stands for its own page, where this is the first chart
		m_chart()->instance = 1;

		return (string) do_shortcode( '[' . $name . ' ' . $attributes . ']' );
	}

	/**
	 * Print the chart once so every print that follows reads the same cached chart args
	 *
	 * The first print of a chart in a request builds its args, later ones read them from the object cache,
	 * and M_Chart_Chartjs::get_chart_args() adds a "graph" key to the cached copy that the built one doesn't have
	 * Chart.js ignores the key, but two prints can only be compared byte for byte once both come from the cache
	 */
	private function warm_chart_args(): void {
		$this->shortcode( 'id="' . $this->chart_id . '"' );
	}

	/**
	 * Every element in a piece of HTML as a browser would see it: [ tag name, attributes ]
	 */
	private function elements( string $html ): array {
		$processor = new WP_HTML_Tag_Processor( $html );
		$elements  = [];

		while ( $processor->next_tag() ) {
			$attributes = [];

			foreach ( (array) $processor->get_attribute_names_with_prefix( '' ) as $name ) {
				$attributes[ $name ] = $processor->get_attribute( $name );
			}

			$elements[] = [ $processor->get_tag(), $attributes ];
		}

		return $elements;
	}

	private function tags( string $html ): array {
		return array_column( $this->elements( $html ), 0 );
	}

	private function first( string $html, string $tag ): array {
		foreach ( $this->elements( $html ) as [ $name, $attributes ] ) {
			if ( $tag === $name ) {
				return $attributes;
			}
		}

		$this->fail( "There is no {$tag} element in the output" );
	}

	/**
	 * Nothing in the output is an element the templates don't write, an event handler or a script URL
	 */
	private function assert_no_injected_markup( string $html, array $allowed_elements, string $context ): void {
		foreach ( $this->elements( $html ) as [ $tag, $attributes ] ) {
			$this->assertContains( $tag, $allowed_elements, "An element the template doesn't write ({$tag}) is in the output for {$context}" );

			foreach ( $attributes as $name => $value ) {
				$this->assertStringStartsNotWith( 'on', $name, "An event handler attribute is on a {$tag} element for {$context}" );

				if ( is_string( $value ) && in_array( $name, [ 'href', 'src', 'action', 'formaction', 'srcdoc' ], true ) ) {
					$this->assertDoesNotMatchRegularExpression( '/^[\s\x00-\x1f]*(javascript|data|vbscript)\s*:/i', $value, "A script URL is in a {$name} attribute for {$context}" );
				}
			}
		}
	}

	public function test_the_shortcode_prints_the_chart(): void {
		$html = $this->shortcode( 'id="' . $this->chart_id . '"' );

		$this->assertSame( 'm-chart-container-' . $this->chart_id . '-1', $this->first( $html, 'FIGURE' )['id'] );
		$this->assertSame( 'm-chart-' . $this->chart_id . '-1', $this->first( $html, 'CANVAS' )['id'] );
		$this->assertSame( 1, count( array_keys( $this->tags( $html ), 'SCRIPT', true ) ), 'One inline script draws the chart' );
		$this->assertSame( 1, preg_match( '/const chartArgs = (.*);\s*$/m', $html, $match ) );
		$this->assertContains( self::MARKER, array_column( json_decode( $match[1], true )['data']['datasets'], 'label' ) );
	}

	public function test_the_older_chart_name_prints_the_same_thing(): void {
		$this->warm_chart_args();

		$current = $this->shortcode( 'id="' . $this->chart_id . '"' );
		$legacy  = $this->shortcode( 'id="' . $this->chart_id . '"', 'chart' );

		$this->assertStringContainsString( '<canvas', $legacy );
		$this->assertSame( $current, $legacy );
	}

	public function test_both_names_take_the_same_attributes(): void {
		$this->assertSame(
			$this->shortcode( 'id="' . $this->chart_id . '" show="table"' ),
			$this->shortcode( 'id="' . $this->chart_id . '" show="table"', 'chart' )
		);
	}

	public function test_the_shortcode_is_replaced_inside_the_text_around_it(): void {
		$content = do_shortcode( 'Before [m-chart id="' . $this->chart_id . '"] after' );

		$this->assertStringStartsWith( 'Before <figure', $content );
		$this->assertStringEndsWith( ' after', $content );
	}

	public function test_show_chart_is_the_same_as_leaving_show_out(): void {
		$this->warm_chart_args();

		$this->assertSame(
			$this->shortcode( 'id="' . $this->chart_id . '"' ),
			$this->shortcode( 'id="' . $this->chart_id . '" show="chart"' )
		);
	}

	public function test_show_table_prints_the_data_as_a_table_and_no_chart(): void {
		$html = $this->shortcode( 'id="' . $this->chart_id . '" show="table"' );
		$tags = $this->tags( $html );

		$this->assertSame( 'TABLE', $tags[0] );
		$this->assertNotContains( 'CANVAS', $tags );
		$this->assertNotContains( 'SCRIPT', $tags );
		$this->assertStringContainsString( self::MARKER, $html );
		$this->assertStringContainsString( 'Shortcode chart', $html, 'The chart title captions the table' );
	}

	public function test_show_image_prints_the_charts_image(): void {
		$image_id = self::factory()->attachment->create_object( 'shortcode-chart.png', $this->chart_id, [ 'post_mime_type' => 'image/png' ] );

		wp_update_attachment_metadata( $image_id, [ 'width' => 1800, 'height' => 1200, 'file' => 'shortcode-chart.png' ] );
		update_post_meta( $this->chart_id, '_thumbnail_id', $image_id );

		$html = $this->shortcode( 'id="' . $this->chart_id . '" show="image"' );
		$tags = $this->tags( $html );
		$img  = $this->first( $html, 'IMG' );

		$this->assertNotContains( 'CANVAS', $tags );
		$this->assertNotContains( 'SCRIPT', $tags );
		$this->assertSame( wp_get_attachment_url( $image_id ), $img['src'] );
		$this->assertSame( 'Shortcode chart', $img['alt'] );

		// The full size file at half its pixel size, so it stays sharp on a high density screen
		$this->assertSame( '900', $img['width'] );
		$this->assertSame( '600', $img['height'] );
	}

	public function test_show_image_prints_the_placeholder_when_the_chart_has_no_image_yet(): void {
		$html = $this->shortcode( 'id="' . $this->chart_id . '" show="image"' );
		$img  = $this->first( $html, 'IMG' );

		$this->assertStringEndsWith( '/components/images/chart-placeholder.png', (string) $img['src'] );
		$this->assertSame( 'Shortcode chart', $img['alt'] );
		$this->assertSame( '640', $img['width'], 'The placeholder has a size' );
		$this->assertSame( '480', $img['height'] );
	}

	public function test_show_image_prints_the_placeholder_when_images_are_switched_off(): void {
		$image_id = self::factory()->attachment->create_object( 'shortcode-chart.png', $this->chart_id, [ 'post_mime_type' => 'image/png' ] );

		wp_update_attachment_metadata( $image_id, [ 'width' => 1800, 'height' => 1200, 'file' => 'shortcode-chart.png' ] );
		update_post_meta( $this->chart_id, '_thumbnail_id', $image_id );

		m_chart()->update_setting( 'performance', 'no-images' );

		$img = $this->first( $this->shortcode( 'id="' . $this->chart_id . '" show="image"' ), 'IMG' );

		$this->assertStringEndsWith( '/components/images/chart-placeholder.png', (string) $img['src'] );
	}

	public function test_an_unknown_show_value_prints_the_chart(): void {
		$this->warm_chart_args();

		$this->assertSame(
			$this->shortcode( 'id="' . $this->chart_id . '"' ),
			$this->shortcode( 'id="' . $this->chart_id . '" show="hologram"' )
		);
	}

	public function test_the_chart_is_responsive_unless_a_width_is_given(): void {
		$this->assertArrayNotHasKey( 'width', $this->first( $this->shortcode( 'id="' . $this->chart_id . '"' ), 'CANVAS' ) );
		$this->assertArrayNotHasKey( 'width', $this->first( $this->shortcode( 'id="' . $this->chart_id . '" width="responsive"' ), 'CANVAS' ) );
	}

	public function test_a_width_in_pixels_is_put_on_the_canvas(): void {
		$canvas = $this->first( $this->shortcode( 'id="' . $this->chart_id . '" width="640"' ), 'CANVAS' );

		$this->assertSame( '640', $canvas['width'] );
		$this->assertSame( '400', $canvas['height'], 'The height is the chart\'s own, the shortcode has no height attribute' );
	}

	public function test_a_height_attribute_is_ignored(): void {
		$canvas = $this->first( $this->shortcode( 'id="' . $this->chart_id . '" height="999"' ), 'CANVAS' );

		$this->assertSame( '400', $canvas['height'] );
	}

	public static function widths_that_are_not_a_size(): array {
		return [
			'a word'     => [ 'wide' ],
			'empty'      => [ '' ],
			'zero'       => [ '0' ],
			'percentage' => [ '%' ],
		];
	}

	/**
	 * @dataProvider widths_that_are_not_a_size
	 */
	public function test_a_width_that_is_not_a_size_leaves_the_chart_responsive( string $width ): void {
		$this->assertArrayNotHasKey( 'width', $this->first( $this->shortcode( 'id="' . $this->chart_id . '" width="' . $width . '"' ), 'CANVAS' ) );
	}

	public static function ids_that_are_not_a_chart(): array {
		return [
			'no id attribute' => [ '' ],
			'empty id'        => [ 'id=""' ],
			'a word'          => [ 'id="latest"' ],
			'a slug'          => [ 'id="shortcode-chart"' ],
			'nothing there'   => [ 'id="999999999"' ],
			'negative'        => [ 'id="-1"' ],
		];
	}

	/**
	 * @dataProvider ids_that_are_not_a_chart
	 */
	public function test_nothing_is_printed_without_the_id_of_a_chart( string $attributes ): void {
		$this->assertSame( '', $this->shortcode( $attributes ) );
		$this->assertSame( '', $this->shortcode( $attributes, 'chart' ) );
	}

	public function test_nothing_is_printed_for_a_post_that_is_not_a_chart(): void {
		$post_id = self::factory()->post->create( [ 'post_content' => 'An ordinary post' ] );

		// Even if it somehow carries chart meta
		update_post_meta( $post_id, m_chart()->slug, $this->validated_meta() );

		$this->assertSame( '', $this->shortcode( 'id="' . $post_id . '"' ) );
		$this->assertSame( '', $this->shortcode( 'id="' . $post_id . '" show="table"' ) );
		$this->assertSame( '', $this->shortcode( 'id="' . $post_id . '" show="image"' ) );
	}

	public static function statuses_that_are_not_published(): array {
		return [
			'draft'   => [ 'draft' ],
			'pending' => [ 'pending' ],
			'private' => [ 'private' ],
			'trash'   => [ 'trash' ],
		];
	}

	/**
	 * @dataProvider statuses_that_are_not_published
	 */
	public function test_a_chart_that_is_not_published_is_not_shown_to_a_visitor( string $status ): void {
		$chart_id = $this->create_chart( [ 'post_status' => $status ] );

		wp_set_current_user( 0 );

		$this->assertSame( '', $this->shortcode( 'id="' . $chart_id . '"' ) );
		$this->assertSame( '', $this->shortcode( 'id="' . $chart_id . '" show="table"' ) );
		$this->assertSame( '', $this->shortcode( 'id="' . $chart_id . '" show="image"' ) );
	}

	/**
	 * @dataProvider statuses_that_are_not_published
	 */
	public function test_a_chart_that_is_not_published_is_not_shown_to_its_author_either( string $status ): void {
		$author   = self::factory()->user->create( [ 'role' => 'author' ] );
		$chart_id = $this->create_chart( [ 'post_status' => $status, 'post_author' => $author ] );

		wp_set_current_user( $author );

		// The shortcode stands in a published post that everyone reads, what it prints doesn't depend on who is looking
		$this->assertSame( '', $this->shortcode( 'id="' . $chart_id . '"' ) );
		$this->assertSame( '', $this->shortcode( 'id="' . $chart_id . '" show="table"' ) );
	}

	public function test_a_chart_is_shown_again_once_it_is_published(): void {
		$chart_id = $this->create_chart( [ 'post_status' => 'draft' ] );

		$this->assertSame( '', $this->shortcode( 'id="' . $chart_id . '"' ) );

		wp_publish_post( $chart_id );

		$this->assertContains( 'CANVAS', $this->tags( $this->shortcode( 'id="' . $chart_id . '"' ) ) );
	}

	public function test_two_shortcodes_for_the_same_chart_get_their_own_element_ids(): void {
		m_chart()->instance = 1;

		$html = (string) do_shortcode( '[m-chart id="' . $this->chart_id . '"] [m-chart id="' . $this->chart_id . '"]' );
		$ids  = [];

		foreach ( $this->elements( $html ) as [ , $attributes ] ) {
			if ( isset( $attributes['id'] ) ) {
				$ids[] = $attributes['id'];
			}
		}

		$this->assertContains( 'm-chart-' . $this->chart_id . '-1', $ids );
		$this->assertContains( 'm-chart-' . $this->chart_id . '-2', $ids );
		$this->assertSame( $ids, array_unique( $ids ), 'No id is used twice on the page' );
	}

	public static function hostile_attributes(): array {
		return [
			'attribute breakout in width'  => [ [ 'width' => '640" onmouseover="alert(1)' ] ],
			'element in width'             => [ [ 'width' => '640"><script>alert(1)</script>' ] ],
			'single quote breakout'        => [ [ 'width' => "640' onfocus='alert(1)" ] ],
			'element in show'              => [ [ 'show' => '"><img src=x onerror=alert(1)>' ] ],
			'script element in show'       => [ [ 'show' => '</script><script>alert(1)</script>' ] ],
			'element in share'             => [ [ 'share' => '"><svg onload=alert(1)>' ] ],
			'javascript url in share'      => [ [ 'share' => 'javascript:alert(1)' ] ],
			'closing textarea in share'    => [ [ 'share' => '</textarea><script>alert(1)</script>' ] ],
			'everything at once'           => [ [ 'width' => '1"><script>alert(1)</script>', 'show' => "'-alert(1)-'", 'share' => '"><svg onload=alert(1)>' ] ],
			'an attribute it does not have' => [ [ 'class' => '"><script>alert(1)</script>', 'onclick' => 'alert(1)', 'style' => 'background:url(javascript:alert(1))' ] ],
		];
	}

	/**
	 * @dataProvider hostile_attributes
	 */
	public function test_attributes_cannot_add_markup_to_the_chart( array $attributes ): void {
		// Straight to the handler, the way WordPress calls it once it has parsed the attributes
		$html = (string) m_chart()->chart_shortcode( [ 'id' => (string) $this->chart_id ] + $attributes );

		$context = wp_json_encode( $attributes );

		$this->assertContains( 'CANVAS', $this->tags( $html ), 'The chart is still printed' );
		$this->assert_no_injected_markup( $html, self::CHART_ELEMENTS, $context );
		$this->assertSame( 1, count( array_keys( $this->tags( $html ), 'SCRIPT', true ) ), "Wrong number of script elements for {$context}" );

		// The attributes are not part of the script either
		$this->assertSame( 1, preg_match( '/const chartArgs = (.*);\s*$/m', $html, $match ) );
		$this->assertStringNotContainsString( '<', $match[1] );
		$this->assertStringNotContainsString( 'alert(1)', $html, 'Nothing of the attribute values is printed at all' );
	}

	/**
	 * @dataProvider hostile_attributes
	 */
	public function test_attributes_cannot_add_markup_to_the_embed_iframe( array $attributes ): void {
		m_chart()->update_setting( 'embeds', 'enabled' );

		$html    = (string) m_chart()->chart_shortcode( [ 'id' => (string) $this->chart_id ] + $attributes );
		$context = wp_json_encode( $attributes );

		$this->assert_no_injected_markup( $html, [ 'IFRAME' ], $context );

		$iframe = $this->first( $html, 'IFRAME' );

		$this->assertSame( [ 'id', 'class', 'width', 'height', 'title', 'src', 'loading' ], array_keys( $iframe ), "The iframe has an attribute it shouldn't for {$context}" );
		$this->assertStringStartsWith( home_url( '/' ), (string) $iframe['src'] );
	}

	/**
	 * @dataProvider hostile_attributes
	 */
	public function test_attributes_written_in_a_post_cannot_add_markup( array $attributes ): void {
		$written = 'id="' . $this->chart_id . '"';

		foreach ( $attributes as $name => $value ) {
			// The way an author would have to write it to get it past the shortcode parser at all
			$written .= ' ' . $name . "='" . str_replace( "'", '"', $value ) . "'";
		}

		$html = $this->shortcode( $written );

		$this->assertContains( 'CANVAS', $this->tags( $html ), 'WordPress read the text as the shortcode and the chart was printed' );
		$this->assert_no_injected_markup( $html, self::CHART_ELEMENTS, $written );
		$this->assertSame( 1, count( array_keys( $this->tags( $html ), 'SCRIPT', true ) ), "Wrong number of script elements for {$written}" );
	}

	public function test_share_show_offers_the_embed_code_when_embeds_are_on(): void {
		m_chart()->update_setting( 'embeds', 'enabled' );

		$html = $this->shortcode( 'id="' . $this->chart_id . '" share="show"' );

		$this->assertContains( 'IFRAME', $this->tags( $html ) );
		$this->assertContains( 'TEXTAREA', $this->tags( $html ) );

		// The code in the box is an iframe of the same embed, and it doesn't offer the box again
		$this->assertSame( 1, preg_match( '#<textarea[^>]*>(.*)</textarea>#s', $html, $match ) );

		$offered = html_entity_decode( $match[1], ENT_QUOTES );

		$this->assertSame( [ 'IFRAME' ], $this->tags( $offered ) );
		$this->assertStringStartsWith( home_url( '/' ), (string) $this->first( $offered, 'IFRAME' )['src'] );
		$this->assertStringNotContainsString( 'share=show', (string) $this->first( $offered, 'IFRAME' )['src'] );
	}

	public function test_share_is_ignored_while_embeds_are_off(): void {
		$this->warm_chart_args();

		$this->assertSame(
			$this->shortcode( 'id="' . $this->chart_id . '"' ),
			$this->shortcode( 'id="' . $this->chart_id . '" share="show"' )
		);
	}
}
