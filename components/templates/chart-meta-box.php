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

echo '<div id="m-chart-chart-root"></div>';
?>
<canvas id="<?php echo esc_attr( $this->get_field_id( 'canvas-render-' . absint( $post->ID ) ) ); ?>" class="hide"></canvas>
<textarea name="<?php echo esc_attr( $this->get_field_name( 'img' ) ); ?>" class="hide" id="<?php echo esc_attr( $this->get_field_id( 'img' ) ); ?>"></textarea>
