<?php
// Show what the graph looks like
echo $chart;
?>
<canvas id="m-chart-canvas-render-<?php echo absint( $post->ID ); ?>" class="hide"></canvas>
<textarea name="<?php echo esc_attr( $this->get_field_name( 'img' ) ); ?>" rows="8" cols="40" id="<?php echo esc_attr( $this->get_field_id( 'img' ) ); ?>" class="hide"></textarea>
<?php
if ( ! m_chart()->is_valid_library( $post_meta['library'] ) ) {
	?>
	<div id="m-chart-settings-error" class="wrap">
		<p>
			<?php
			echo str_replace(
				esc_html__( 'M Chart Highcharts Library', 'm-chart' ),
				'<strong>' . esc_html__( 'M Chart Highcharts Library', 'm-chart' ) . '</strong>',
				esc_html__( 'This chart requires the M Chart Highcharts Library plugin.', 'm-chart' )
			);
			?>
		</p>
		<p><?php esc_html_e( 'This chart will no longer display unless you install the plugin:', 'm-chart' ); ?></p>
		<p><a href="https://github.com/methnen/m-chart-highcharts-library/" class="button-primary"><?php esc_html_e( 'Learn More', 'm-chart' ); ?></a></p>
	</div>
	<?php
	return;
}

// Load the various settings and controls this chart's library
require apply_filters( 'm_chart_settings_template', __DIR__ . '/' . $post_meta['library'] . '-settings.php', $post_meta['library'] );