<?php
// If there's multiple instances of a chart on the page we don't want to redeclare this
if ( ! $this->options_set ) {
	?>
	<script type="text/javascript">
	(function( $ ) {
		$( function() {
			Highcharts.setOptions( <?php echo $this->unicode_aware_stripslashes( json_encode( $this->highcharts()->get_chart_options() ) ); ?>);
		} );
	})( jQuery );
	</script>
	<?php
	$this->options_set = true;
}
?>
<div id="m-chart-container-<?php echo absint( $post_id ); ?>-<?php echo absint( $this->instance ); ?>" class="m-chart-container">
	<div id="m-chart-<?php echo absint( $post_id ); ?>-<?php echo absint( $this->instance ); ?>" class="m-chart"></div>
</div>
<script type="text/javascript">
	var m_chart_highcharts_<?php echo absint( $post_id ); ?>_<?php echo absint( $this->instance ); ?> = {
		chart_args: <?php echo $this->unicode_aware_stripslashes( json_encode( $this->highcharts()->get_chart_args( $post_id, $args ) ) ); ?>,
		post_id: <?php echo absint( $post_id ); ?>,
		instance: <?php echo absint( $this->instance ); ?>
	};

	<?php do_action( 'm_chart_after_chart_args', $post_id, $args, $this->instance ); ?>

	(function( $ ) {
		m_chart_highcharts_<?php echo absint( $post_id ); ?>_<?php echo absint( $this->instance ); ?>.render_chart = function( ) {
			$( '.m-chart' ).trigger({
				type:     'render_start',
				post_id:  this.post_id,
				instance: this.instance
			});

			$( '#m-chart-' + this.post_id + '-' + this.instance ).highcharts(
				this.chart_args,
				function( chart ) {
					// Stuff to do after the chart has rendered goes here
					<?php do_action( 'm_chart_post_render_javascript', $post_id, $args, $this->instance ); ?>

				}
			);

			this.chart = $( '#m-chart-' + this.post_id + '-' + this.instance ).highcharts();

			$( '.m-chart' ).trigger({
				type:     'render_done',
				chart:    this.chart,
				post_id:  this.post_id,
				instance: this.instance
			});
		};

		$( function() {
			m_chart_highcharts_<?php echo absint( $post_id ); ?>_<?php echo absint( $this->instance ); ?>.render_chart();
		} );
	})( jQuery );
</script>