<?php
$title  = get_the_title( $post_id );
$height = m_chart()->get_post_meta( $post_id, 'height' );
$width  = '';

$subtitle = m_chart()->get_post_meta( $post_id, 'subtitle' );

if ( '' != $subtitle ) {
	$title = $title . ': ' . $subtitle;
}

if ( '' != $args['width'] && 'responsive' != $args['width'] ) {
	$width = ' width="' . absint( $args['width'] ) . '"';
}

$defer_rendering  = 'enabled' === m_chart()->get_settings( 'defer_rendering' );
$observer_options = apply_filters(
	'm_chart_defer_rendering_observer_options',
	[ 'rootMargin' => '100px', 'threshold' => 0 ],
	$post_id,
	$args
);
?>
<div id="m-chart-container-<?php echo absint( $post_id ); ?>-<?php echo absint( $this->instance ); ?>" class="m-chart-container chartjs">
	<canvas id="m-chart-<?php echo absint( $post_id ); ?>-<?php echo absint( $this->instance ); ?>" class="m-chart" height="<?php echo absint( $height ); ?>"<?php echo $width; ?> aria-label="<?php echo esc_attr( $title ); ?>" role="img" style="height: <?php echo esc_attr( $height ); ?>px;"></canvas>
</div>
<script>
	( () => {
		const postId    = <?php echo absint( $post_id ); ?>;
		const instance  = <?php echo absint( $this->instance ); ?>;
		const chartArgs = <?php echo $this->unicode_aware_stripslashes( json_encode( $this->library( 'chartjs' )->get_chart_args( $post_id, $args ), JSON_HEX_QUOT ) ); ?>;
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
				el.dispatchEvent( new CustomEvent( 'render_done', {
					bubbles: true,
					detail:  { post_id: postId, instance },
				} ) );
			} );
		};

		chartArgs.options.animation = {
			...chartArgs.options.animation,
			onComplete,
		};

		const renderChart = () => {
			Chart.register( ChartDataLabels );
			Chart.register( MChartHelper );
			<?php do_action( 'm_chart_after_chartjs_plugins', $post_id, $args, $this->instance ); ?>

			new Chart( canvas, chartArgs );
		};

		document.addEventListener( 'DOMContentLoaded', () => {
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
