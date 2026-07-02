<?php
if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

// Fetch the post meta once, each get_post_meta() call re-runs the full defaults + filter pipeline
$post_meta = m_chart()->get_post_meta( $post_id );

$title    = get_the_title( $post_id );
$height   = $post_meta['height'];
$subtitle = $post_meta['subtitle'];

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
$summary_id   = $canvas_id . '-summary';
$desc_id      = $canvas_id . '-desc';

// The canvas's accessible description is a short summary rather than the whole data table
// The full table is associated via aria-details so AT users can navigate it as a real table

// Prefer the chart's excerpt as a human-written summary
// Read the raw excerpt field rather than get_the_excerpt()
// So an empty field is not auto-generated from post content
$summary = trim( wp_strip_all_tags( strip_shortcodes( (string) get_post_field( 'post_excerpt', $post_id ) ) ) );

$source_name = trim( (string) $post_meta['source'] );
$source_url  = trim( (string) $post_meta['source_url'] );
$show_source = $post_meta['include_source'] && '' !== $source_name;

if ( '' === $summary ) {
	// No excerpt so generate one: chart type + subtitle + source + what follows
	// The title is left out since it's already the canvas's accessible name via the figcaption
	// Escaping happens once at output so the pieces stay plain text here
	// translators: %s is the chart type (line, bar, pie, etc)
	$summary = sprintf( __( '%s chart.', 'm-chart' ), ucwords( str_replace( '-', ' ', $post_meta['type'] ) ) );

	if ( '' != $subtitle ) {
		$summary .= ' ' . trim( (string) $subtitle ) . '.';
	}

	if ( $show_source ) {
		// translators: %s is the chart's data source name
		$summary .= ' ' . sprintf( __( 'Source: %s.', 'm-chart' ), $source_name );
	}

	// Describe the data table(s) that hold the chart's values
	// Row/column counts come from the first sheet's populated cells
	$sets      = isset( $post_meta['data']['sets'] ) ? (array) $post_meta['data']['sets'] : [];
	$set_count = count( $sets );

	if ( 1 < $set_count ) {
		// translators: %d is the number of data tables
		$summary .= ' ' . sprintf( __( '%d data tables follow.', 'm-chart' ), $set_count );
	} else {
		$row_count = 0;
		$col_count = 0;

		foreach ( (array) reset( $sets ) as $row ) {
			$row_width = 0;

			foreach ( array_values( (array) $row ) as $column => $cell ) {
				if ( '' !== trim( (string) $cell ) ) {
					$row_width = $column + 1;
				}
			}

			if ( $row_width ) {
				$row_count++;
				$col_count = max( $col_count, $row_width );
			}
		}

		if ( $row_count ) {
			// translators: 1: number of rows 2: number of columns
			$summary .= ' ' . sprintf( __( 'Data table with %1$d rows and %2$d columns follows.', 'm-chart' ), $row_count, $col_count );
		}
	}
}
?>
<figure id="<?php echo esc_attr( $container_id ); ?>" class="m-chart-container chartjs">
	<canvas id="<?php echo esc_attr( $canvas_id ); ?>" class="m-chart" height="<?php echo absint( $height ); ?>"<?php echo $width ? ' width="' . absint( $width ) . '"' : ''; ?> role="img" aria-labelledby="<?php echo esc_attr( $caption_id ); ?>" aria-describedby="<?php echo esc_attr( $summary_id ); ?>" aria-details="<?php echo esc_attr( $desc_id ); ?>" style="height: <?php echo esc_attr( $height ); ?>px; max-width: 100%;">
		<p><?php echo esc_html( $title ); ?></p>
	</canvas>
	<figcaption id="<?php echo esc_attr( $caption_id ); ?>" class="screen-reader-text">
		<?php echo esc_html( $title ); ?>
	</figcaption>
	<p id="<?php echo esc_attr( $summary_id ); ?>" class="m-chart-summary screen-reader-text">
		<?php echo esc_html( $summary ); ?>
	</p>
	<div id="<?php echo esc_attr( $desc_id ); ?>" class="screen-reader-text">
		<?php
		// Render the data table(s) as an accessible description for screen-reader users.
		// build_table() handles multi-sheet, parse_data, and template inclusion.
		echo m_chart()->build_table( $post_id );

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
	<?php if ( $show_source ) { ?>
	<p class="m-chart-source screen-reader-text">
		<?php
		// The visual source attribution is painted on the canvas by the helper plugin 
		// This makes it invisible to AT and its click target is mouse-only
		// So this is the operable version for keyboard and screen-reader users
		// The paragraph un-hides while the link has focus so sighted keyboard users can see it
		esc_html_e( 'Source:', 'm-chart' );

		if ( '' !== $source_url ) {
			?>
			<a href="<?php echo esc_url( $source_url ); ?>"><?php echo esc_html( $source_name ); ?></a>
			<?php
		} else {
			echo ' ' . esc_html( $source_name );
		}
		?>
	</p>
	<?php } ?>
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
