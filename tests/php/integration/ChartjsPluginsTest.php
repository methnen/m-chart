<?php
/**
 * Integration tests for the Chart.js plugin registry and the render gating filter
 *
 * A library plugin that adds a Chart.js plugin through m_chart_chartjs_plugins must see it loaded on the
 * inline page, in the embed iframe script list and registered in the inline script, and a plugin that answers
 * false to m_chart_render_uses_chartjs must get a template with no Chart.js at all
 */

declare( strict_types=1 );

final class ChartjsPluginsTest extends M_Chart_Integration_Test_Case {

	private function create_plugins_chart( array $overrides = [] ): int {
		$editor_id = self::factory()->user->create( [ 'role' => 'editor' ] );
		wp_set_current_user( $editor_id );

		$post_id = self::factory()->post->create( [
			'post_type'   => m_chart()->slug,
			'post_status' => 'publish',
			'post_author' => $editor_id,
			'post_title'  => 'Plugins chart',
		] );

		m_chart()->update_post_meta( $post_id, array_merge( [
			'library'   => 'chartjs',
			'type'      => 'line',
			'parse_in'  => 'rows',
			'theme'     => '_default',
			'data'      => [ 'sets' => [ [ [ '', 'Series' ], [ 'A', 1 ], [ 'B', 2 ] ] ] ],
			'set_names' => [ 'Sheet 1' ],
			'height'    => 400,
		], $overrides ) );

		return $post_id;
	}

	public function test_core_plugin_list_is_gated_by_type_except_in_admin(): void {
		$chartjs = m_chart()->library( 'chartjs' );

		$line = $chartjs->get_chartjs_plugins( 0, [ 'type' => 'line' ], 'inline' );
		$this->assertSame( [ 'chartjs-helper' => 'MChartHelper', 'chartjs-datalabels' => 'ChartDataLabels' ], $line );

		$venn = $chartjs->get_chartjs_plugins( 0, [ 'type' => 'euler' ], 'iframe' );
		$this->assertArrayHasKey( 'chartjs-venn', $venn );
		$this->assertNull( $venn['chartjs-venn'], 'self registering builds carry no global' );
		$this->assertArrayNotHasKey( 'chartjs-treemap', $venn );

		$admin = $chartjs->get_chartjs_plugins( 0, [ 'type' => 'line' ], 'admin' );
		$this->assertSame( [ 'chartjs-helper', 'chartjs-datalabels', 'chartjs-treemap', 'chartjs-boxplot', 'chartjs-venn' ], array_keys( $admin ) );
	}

	public function test_filtered_plugin_is_enqueued_registered_and_listed_for_the_iframe(): void {
		$post_id = $this->create_plugins_chart( [ 'source' => 'ACME Data', 'source_url' => 'https://example.com/data', 'include_source' => true ] );

		wp_register_script( 'fake-plugin', 'https://example.com/fake-plugin.js', [ 'chartjs' ], '1.0' );

		add_filter( 'm_chart_chartjs_plugins', function ( $plugins ) {
			$plugins['fake-plugin']  = 'FakePlugin';
			// Third party UMD builds often publish hyphenated globals, which only bracket access can reach
			$plugins['fake-hyphen'] = 'chartjs-plugin-fake';

			return $plugins;
		} );

		wp_register_script( 'fake-hyphen', 'https://example.com/fake-hyphen.js', [ 'chartjs' ], '1.0' );

		// Start from an empty queue so handles another test enqueued don't leak into the assertions
		wp_scripts()->queue = [];

		$output = m_chart()->get_chart( $post_id );

		$this->assertContains( 'fake-plugin', wp_scripts()->queue, 'the filtered handle is enqueued on the inline path' );
		$this->assertStringContainsString( 'Chart.register( window[ "FakePlugin" ] )', $output );
		$this->assertStringContainsString( 'Chart.register( window[ "MChartHelper" ] )', $output );
		$this->assertStringContainsString( 'Chart.register( window[ "chartjs-plugin-fake" ] )', $output );
		$this->assertStringNotContainsString( 'window.chartjs-plugin-fake', $output );
		$this->assertStringContainsString( 'id="' . m_chart()->get_container_id( $post_id, 1 ) . '"', $output );
		$this->assertStringContainsString( 'class="m-chart-source screen-reader-text"', $output );
		$this->assertStringContainsString( '<a href="https://example.com/data">ACME Data</a>', $output );

		$iframe_scripts = apply_filters( 'm_chart_iframe_scripts', [ 'jquery', 'chartjs' ], $post_id );

		$this->assertContains( 'fake-plugin', $iframe_scripts );
		$this->assertContains( 'chartjs-helper', $iframe_scripts );
	}

	public function test_iframe_render_registers_the_iframe_plugin_list(): void {
		$post_id = $this->create_plugins_chart();

		wp_register_script( 'iframe-only', 'https://example.com/iframe-only.js', [ 'chartjs' ], '1.0' );

		// A plugin that only wants to be present inside the embed iframe
		add_filter( 'm_chart_chartjs_plugins', function ( $plugins, $chart_id, $post_meta, $context ) {
			if ( 'iframe' === $context ) {
				$plugins['iframe-only'] = 'IframeOnly';
			}

			return $plugins;
		}, 10, 4 );

		$inline = m_chart()->get_chart( $post_id );

		$this->assertStringNotContainsString( 'IframeOnly', $inline, 'the inline page registers the inline list' );

		// template_redirect() sets this before the iframe template renders the chart
		m_chart()->is_iframe = true;

		wp_scripts()->queue = [];

		$iframe = m_chart()->get_chart( $post_id );

		$this->assertStringContainsString( 'Chart.register( window[ "IframeOnly" ] )', $iframe, 'the iframe registers what its script list loads' );
		$this->assertContains( 'iframe-only', wp_scripts()->queue, 'the begin hook enqueues from the iframe list too' );
		$this->assertContains( 'iframe-only', apply_filters( 'm_chart_iframe_scripts', [ 'jquery', 'chartjs' ], $post_id ) );
	}

	public function test_render_without_chartjs_skips_the_library_and_inline_script(): void {
		$post_id = $this->create_plugins_chart();

		// The queue is checked directly because wp_script_is() also reports handles pulled in as dependencies of whatever another test enqueued
		wp_scripts()->queue = [];

		add_filter( 'm_chart_render_uses_chartjs', '__return_false' );

		$output = m_chart()->get_chart( $post_id );

		$this->assertNotContains( 'chartjs', wp_scripts()->queue );
		$this->assertNotContains( 'chartjs-helper', wp_scripts()->queue );
		$this->assertStringContainsString( '<figure', $output, 'the figure markup still renders' );
		$this->assertStringNotContainsString( '<script', $output );
		$this->assertStringNotContainsString( 'new Chart(', $output );

		$this->assertSame( [ 'jquery', 'chartjs' ], apply_filters( 'm_chart_iframe_scripts', [ 'jquery', 'chartjs' ], $post_id ), 'the iframe list is left as given' );
	}

	public function test_render_source_html_handles_missing_source_and_url(): void {
		$this->assertSame( '', m_chart()->render_source_html( [ 'include_source' => true, 'source' => '' ] ) );
		$this->assertSame( '', m_chart()->render_source_html( [ 'include_source' => false, 'source' => 'ACME' ] ) );

		$plain = m_chart()->render_source_html( [ 'include_source' => true, 'source' => 'ACME <b>Data</b>', 'source_url' => '' ] );

		$this->assertStringContainsString( 'ACME &lt;b&gt;Data&lt;/b&gt;', $plain );
		$this->assertStringNotContainsString( '<a ', $plain );
	}
}
