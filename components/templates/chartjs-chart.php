<?php
$height = m_chart()->get_post_meta( $post_id, 'height' );

if ( '' != $args['width'] ) {
	$width = ' width="' . absint( $args['width'] ) . '"';
}
?>
<div id="m-chart-container-<?php echo absint( $post_id ); ?>-<?php echo absint( $this->instance ); ?>" class="m-chart-container chartjs">
	<canvas id="m-chart-<?php echo absint( $post_id ); ?>-<?php echo absint( $this->instance ); ?>" class="m-chart" height="<?php echo absint( $height ); ?>"<?php echo $width; ?>></canvas>
</div>
<script type="text/javascript">
	var m_chart_container_<?php echo absint( $post_id ); ?>_<?php echo absint( $this->instance ); ?>_canvas = document.getElementById( 'm-chart-<?php echo absint( $post_id ); ?>-<?php echo absint( $this->instance ); ?>' ).getContext('2d');

	var m_chart_chartjs_<?php echo absint( $post_id ); ?>_<?php echo absint( $this->instance ); ?> = {
		chart_args: <?php echo $this->unicode_aware_stripslashes( json_encode( $this->library( 'chartjs' )->get_chart_args( $post_id, $args ) ) ); ?>,
		post_id: <?php echo absint( $post_id ); ?>,
		instance: <?php echo absint( $this->instance ); ?>
	};

	<?php do_action( 'm_chart_after_chart_args', $post_id, $args, $this->instance ); ?>

	(function( $ ) {
		m_chart_chartjs_<?php echo absint( $post_id ); ?>_<?php echo absint( $this->instance ); ?>.render_chart = function() {
			$( '.m-chart' ).trigger({
				type:     'render_start',
				post_id:  this.post_id,
				instance: this.instance
			});

			this.chart_args.options.animation = {
				onComplete: function() {
					$( '.m-chart' ).trigger({
						type:     'render_done',
						post_id:  m_chart_chartjs_<?php echo absint( $post_id ); ?>_<?php echo absint( $this->instance ); ?>.post_id,
						instance: m_chart_chartjs_<?php echo absint( $post_id ); ?>_<?php echo absint( $this->instance ); ?>.instance
					});
				}
			}

			this.chart = new Chart(
				m_chart_container_<?php echo absint( $post_id ); ?>_<?php echo absint( $this->instance ); ?>_canvas,
				this.chart_args
			);
		};

		$( function() {
			m_chart_chartjs_<?php echo absint( $post_id ); ?>_<?php echo absint( $this->instance ); ?>.render_chart();
		} );
	})( jQuery );
</script>