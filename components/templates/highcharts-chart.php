<?php
// If there's multiple instances of a chart on the page we don't want to redeclare this
// @TODO if the embeds end up being done via iframes this conditional won't be necessary anymore
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
<div id="m-chart-container-<?php echo absint( $post_id ); ?>" class="m-chart-container">
	<div id="m-chart-<?php echo absint( $post_id ); ?>" class="m-chart"></div>
</div>
<script type="text/javascript">
	var m_chart_highcharts_<?php echo absint( $post_id ); ?> = {
		chart_args: <?php echo $this->unicode_aware_stripslashes( json_encode( $this->highcharts()->get_chart_args( $post_id, $args ) ) ); ?>,
		post_id: <?php echo absint( $post_id ); ?>
	};

	(function( $ ) {
		m_chart_highcharts_<?php echo absint( $post_id ); ?>.render_chart = function( ) {
			$( '.m-chart' ).trigger({
				type:    'render_start',
				post_id: this.post_id
			});

			$( '#m-chart-' + this.post_id ).highcharts(
				this.chart_args,
				function( chart ) {
					// Stuff to do after the chart has rendered goes here
					<?php do_action( 'm_chart_post_render_javascript', $post_id, $args ); ?>

				}
			);

			this.chart = $( '#m-chart-' + this.post_id ).highcharts();

			$( '.m-chart' ).trigger({
				type:    'render_done',
				chart:   this.chart,
				post_id: this.post_id
			});
		};

		$( function() {
			m_chart_highcharts_<?php echo absint( $post_id ); ?>.render_chart();
		} );
	})( jQuery );
</script>