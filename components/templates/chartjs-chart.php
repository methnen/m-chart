<?php
if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

$title  = get_the_title( $post_id );
$height = m_chart()->get_post_meta( $post_id, 'height' );

$subtitle = m_chart()->get_post_meta( $post_id, 'subtitle' );

if ( '' != $subtitle ) {
	$title = $title . ': ' . $subtitle;
}

$width = ( '' !== $args['width'] && 'responsive' !== $args['width'] )
	? absint( $args['width'] )
	: 0;

$defer_rendering  = 'enabled' === m_chart()->get_settings( 'defer_rendering' );
$observer_options = apply_filters(
	'm_chart_defer_rendering_observer_options',
	[ 'rootMargin' => '100px', 'threshold' => 0 ],
	$post_id,
	$args
);

$container_id = 'm-chart-container-' . absint( $post_id ) . '-' . absint( $this->instance );
$canvas_id    = 'm-chart-' . absint( $post_id ) . '-' . absint( $this->instance );
$caption_id   = $canvas_id . '-caption';
$desc_id      = $canvas_id . '-desc';
?>
<figure id="<?php echo esc_attr( $container_id ); ?>" class="m-chart-container chartjs">
	<canvas id="<?php echo esc_attr( $canvas_id ); ?>" class="m-chart" height="<?php echo absint( $height ); ?>"<?php echo $width ? ' width="' . absint( $width ) . '"' : ''; ?> role="img" aria-labelledby="<?php echo esc_attr( $caption_id ); ?>" aria-describedby="<?php echo esc_attr( $desc_id ); ?>" style="height: <?php echo esc_attr( $height ); ?>px; max-width: 100%;">
		<p><?php echo esc_html( $title ); ?></p>
	</canvas>
	<figcaption id="<?php echo esc_attr( $caption_id ); ?>" class="screen-reader-text">
		<?php echo esc_html( $title ); ?>
	</figcaption>
	<div id="<?php echo esc_attr( $desc_id ); ?>" class="screen-reader-text">
		<?php
		// Surface the chart's excerpt as a human-written summary at the top of the screen-reader description
		// Read the raw excerpt field rather than get_the_excerpt() so an empty field is not auto-generated from post content
		$excerpt = get_post_field( 'post_excerpt', $post_id );

		if ( '' !== trim( (string) $excerpt ) ) {
			?>
			<p class="m-chart-excerpt"><?php echo esc_html( $excerpt ); ?></p>
			<?php
		}

		// Render the data table(s) as an accessible description for screen-reader users.
		// build_table() handles multi-sheet, parse_data, and template inclusion.
		echo m_chart()->build_table( $post_id );

		// Expose the source attribution to screen-reader users
		// The visual version is painted on the canvas by the helper plugin where it is invisible to AT
		// We surface the name and URL as text here so the source is announced as part of the chart description
		$include_source = m_chart()->get_post_meta( $post_id, 'include_source' );
		$source         = m_chart()->get_post_meta( $post_id, 'source' );
		$source_url     = m_chart()->get_post_meta( $post_id, 'source_url' );

		if ( $include_source && '' !== trim( (string) $source ) ) {
			$source_text = '' !== trim( (string) $source_url )
				? $source . ' (' . $source_url . ')'
				: $source;
			?>
			<p class="m-chart-source">
				<?php
				printf(
					// translators: %s is the chart's data source name and optional URL
					esc_html__( 'Source: %s', 'm-chart' ),
					esc_html( $source_text )
				);
				?>
			</p>
			<?php
		}

		/**
		 * Fires inside the screen-reader-only context container after the data table.
		 *
		 * Use this to append additional context (data sources, methodology,
		 * trend descriptions, summary text) that helps screen-reader users
		 * understand the chart beyond the raw data values.
		 *
		 * @param int   $post_id The chart post ID
		 * @param array $args    The chart shortcode args
		 */
		do_action( 'm_chart_screen_reader_text', $post_id, $args );
		?>
	</div>
</figure>
<?php
// Inside iframe.php the M_Chart instance has a CSP nonce set; outside (front-end / admin preview) it's empty
// The inline <script> needs a matching nonce ONLY when rendered inside the CSP-protected iframe
$iframe_nonce = m_chart()->iframe_csp_nonce ?? '';
?>
<script<?php echo $iframe_nonce ? ' nonce="' . esc_attr( $iframe_nonce ) . '"' : ''; ?>>
	( () => {
		const postId    = <?php echo absint( $post_id ); ?>;
		const instance  = <?php echo absint( $this->instance ); ?>;
		const chartArgs = <?php echo $this->unicode_aware_stripslashes( json_encode( $this->library( 'chartjs' )->get_chart_args( $post_id, $args ), JSON_HEX_TAG | JSON_HEX_APOS | JSON_HEX_AMP | JSON_HEX_QUOT ) ); ?>;
		const canvas    = document.getElementById( 'm-chart-' + postId + '-' + instance ).getContext( '2d' );
		<?php do_action( 'm_chart_after_chart_args', $post_id, $args, $this->instance ); ?>

		let rendered = false;

		const onComplete = () => {
			// Guard against Chart.js firing onComplete multiple times (observed in 3.1.0)
			if ( rendered ) {
				return;
			}

			rendered = true;

			document.querySelectorAll( '.m-chart' ).forEach( el => {
				// Build detail once so both dispatches carry identical data
				const detail = { post_id: postId, instance };

				// Canonical event name — matches the wp.hooks `m_chart.render_done` action on the admin side
				// The chart instance type (Chart.js vs Highcharts) is identified by consumer context, not the event name
				el.dispatchEvent( new CustomEvent( 'm_chart.render_done', {
					bubbles: true,
					detail,
				} ) );

				// Legacy name — deprecated, kept for one major version (planned removal in v3)
				el.dispatchEvent( new CustomEvent( 'render_done', {
					bubbles: true,
					detail,
				} ) );
			} );
		};

		const reducedMotion = window.matchMedia
			&& window.matchMedia( '(prefers-reduced-motion: reduce)' ).matches;

		chartArgs.options.animation = {
			...chartArgs.options.animation,
			// duration: 0 keeps animation lifecycle hooks (onComplete) working
			// so render_done still fires, but eliminates the motion itself
			...( reducedMotion ? { duration: 0 } : {} ),
			onComplete,
		};

		const renderChart = () => {
			new Chart( canvas, chartArgs );
		};

		document.addEventListener( 'DOMContentLoaded', () => {
			// Register the Chart.js plugins once per chart script rather than on every render
			Chart.register( ChartDataLabels );
			Chart.register( MChartHelper );
			<?php do_action( 'm_chart_after_chartjs_plugins', $post_id, $args, $this->instance ); ?>

			const defer = <?php echo $defer_rendering ? 'true' : 'false'; ?>;

			if ( ! defer || ! ( 'IntersectionObserver' in window ) ) {
				renderChart();
				return;
			}

			const container = document.getElementById( 'm-chart-container-' + postId + '-' + instance );
			const observer  = new IntersectionObserver( ( entries, obs ) => {
				if ( entries[0].isIntersecting ) {
					obs.disconnect();
					renderChart();
				}
			}, <?php echo wp_json_encode( $observer_options ); ?> );

			observer.observe( container );
		} );
	} )();
</script>
