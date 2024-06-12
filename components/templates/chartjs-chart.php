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
?>
<div id="m-chart-container-<?php echo absint( $post_id ); ?>-<?php echo absint( $this->instance ); ?>" class="m-chart-container chartjs">
	<canvas id="m-chart-<?php echo absint( $post_id ); ?>-<?php echo absint( $this->instance ); ?>" class="m-chart" height="<?php echo absint( $height ); ?>"<?php echo $width; ?> aria-label="<?php echo esc_attr( $title ); ?>" role="img" style="height: <?php echo esc_attr( $height ); ?>px;"></canvas>
</div>
<script type="text/javascript">
	var m_chart_container_<?php echo absint( $post_id ); ?>_<?php echo absint( $this->instance ); ?>_canvas = document.getElementById( 'm-chart-<?php echo absint( $post_id ); ?>-<?php echo absint( $this->instance ); ?>' ).getContext('2d');

	var m_chart_chartjs_<?php echo absint( $post_id ); ?>_<?php echo absint( $this->instance ); ?> = {
		chart_args: <?php echo $this->unicode_aware_stripslashes( json_encode( $this->library( 'chartjs' )->get_chart_args( $post_id, $args ), JSON_HEX_QUOT ) ); ?>,
		post_id: <?php echo absint( $post_id ); ?>,
		instance: <?php echo absint( $this->instance ); ?>,
		render_1: true
	};

	<?php do_action( 'm_chart_after_chart_args', $post_id, $args, $this->instance ); ?>

	(function( $ ) {
		m_chart_chartjs_<?php echo absint( $post_id ); ?>_<?php echo absint( $this->instance ); ?>.render_chart = function() {
			$( '.m-chart' ).trigger({
				type:     'render_start',
				post_id:  this.post_id,
				instance: this.instance
			});
			
			var target = this.chart_args.options.animation;
            
			var source = {
				onComplete: function() {
					// This deals with an issue in Chart.js 3.1.0 where onComplete can run too many times
					// We only want to trigger on the first render anyway so we'll just check
					if ( false === m_chart_chartjs_<?php echo absint( $post_id ); ?>_<?php echo absint( $this->instance ); ?>.render_1 ) {
						return;
					}

					m_chart_chartjs_<?php echo absint( $post_id ); ?>_<?php echo absint( $this->instance ); ?>.render_1 = false;

					$( '.m-chart' ).trigger({
						type:     'render_done',
						post_id:  m_chart_chartjs_<?php echo absint( $post_id ); ?>_<?php echo absint( $this->instance ); ?>.post_id,
						instance: m_chart_chartjs_<?php echo absint( $post_id ); ?>_<?php echo absint( $this->instance ); ?>.instance
					});
				}
			}
           
			if ( ! target ) {
				source = {animation: source};
				target = this.chart_args.options;
			}
			
			Object.assign( target, source );

			Chart.register( ChartDataLabels );

			this.chart = new Chart(
				m_chart_container_<?php echo absint( $post_id ); ?>_<?php echo absint( $this->instance ); ?>_canvas,
				this.chart_args
			);
		};

		$( function() {
			$.when( m_chart_chartjs_helpers.init() ).done(function() {
				m_chart_chartjs_<?php echo absint( $post_id ); ?>_<?php echo absint( $this->instance ); ?>.render_chart();
			});
		} );
	})( jQuery );
</script>
