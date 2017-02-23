<?php
$type_option_names = array(
	'line'    => esc_html__( 'Line', 'm-chart' ),
	'spline'  => esc_html__( 'Spline', 'm-chart' ),
	'area'    => esc_html__( 'Area', 'm-chart' ),
	'column'  => esc_html__( 'Column', 'm-chart' ),
	'bar'     => esc_html__( 'Bar', 'm-chart' ),
	'pie'     => esc_html__( 'Pie', 'm-chart' ),
	'scatter' => esc_html__( 'Scatter', 'm-chart' ),
	'bubble'  => esc_html__( 'Bubble', 'm-chart' ),
);

$parse_option_names = array(
	'columns' => esc_html__( 'Columns', 'm-chart' ),
	'rows'    => esc_html__( 'Rows', 'm-chart' ),
);

$disabled = ' disabled="disabled"';

if ( true == $post_meta['y_min'] ) {
	$disabled = '';
}
?>
<div class="settings">
	<div class="row one">
		<p>
			<label for="<?php echo esc_attr( $this->get_field_id( 'type' ) ); ?>"><?php esc_html_e( 'Type', 'm-chart' ); ?></label><br />
			<select name='<?php echo esc_attr( $this->get_field_name( 'type' ) ); ?>' class='select' id="<?php echo esc_attr( $this->get_field_id( 'type' ) ); ?>">
				<?php
				foreach ( m_chart()->highcharts()->type_options as $type ) {
					?>
					<option value="<?php echo esc_attr( $type ); ?>"<?php selected( $type, $post_meta['type'] ); ?>>
						<?php echo esc_html( $type_option_names[ $type ] ); ?>
					</option>
					<?php
				}
				?>
			</select>
		</p>
		<p>
			<label for="<?php echo $this->get_field_id( 'theme' ); ?>"><?php esc_html_e( 'Theme', 'm-chart' ); ?></label><br />
			<select name="<?php echo $this->get_field_name( 'theme' ); ?>" id="<?php echo $this->get_field_id( 'theme' ); ?>">
				<?php
				foreach ( m_chart()->highcharts()->get_themes() as $theme ) {
					?>
					<option value="<?php echo esc_attr( $theme->slug ); ?>"<?php selected( $theme->slug, $post_meta['theme'] ); ?>>
						<?php esc_html_e( $theme->name, 'm-chart' ); ?>
					</option>
					<?php
				}
				?>
			</select>
		</p>
		<p>
			<label for="<?php echo esc_attr( $this->get_field_id( 'height' ) ); ?>"><?php esc_html_e( 'Height', 'm-chart' ); ?></label><br />
			<input type="number" name="<?php echo esc_attr( $this->get_field_name( 'height' ) ); ?>" value="<?php echo absint( $post_meta['height'] ); ?>" id="<?php echo esc_attr( $this->get_field_id( 'height' ) ); ?>" min="300" max="1500" />
		</p>
	</div>
	<div class="row two">
		<p>
			<label for="<?php echo esc_attr( $this->get_field_id( 'parse_in' ) ); ?>"><?php esc_html_e( 'Parse data in', 'm-chart' ); ?></label><br />
			<select name='<?php echo esc_attr( $this->get_field_name( 'parse_in' ) ); ?>' class='select' id="<?php echo esc_attr( $this->get_field_id( 'parse_in' ) ); ?>">
				<?php
				foreach ( m_chart()->parse_options as $parse_in ) {
					?>
					<option value="<?php echo esc_attr( $parse_in ); ?>"<?php selected( $parse_in, $post_meta['parse_in'] ); ?>>
						<?php echo esc_html( $parse_option_names[ $parse_in ] ); ?>
					</option>
					<?php
				}
				?>
			</select>
		</p>
		<p class="labels">
			&nbsp;<br />
			<label for="<?php echo esc_attr( $this->get_field_id( 'labels' ) ); ?>">
				<input type="checkbox" name="<?php echo esc_attr( $this->get_field_name( 'labels' ) ); ?>" id="<?php echo esc_attr( $this->get_field_id( 'labels' ) ); ?>" value="1"<?php checked( $post_meta['labels'], true ); ?>/>
				<?php esc_html_e( 'Show labels', 'm-chart' ); ?>
			</label>
		</p>
		<p class="legend">
			&nbsp;<br />
			<label for="<?php echo esc_attr( $this->get_field_id( 'legend' ) ); ?>">
				<input type="checkbox" name="<?php echo esc_attr( $this->get_field_name( 'legend' ) ); ?>" id="<?php echo esc_attr( $this->get_field_id( 'legend' ) ); ?>" value="1"<?php checked( $post_meta['legend'], true ); ?>/>
				<?php esc_html_e( 'Show legend', 'm-chart' ); ?>
			</label>
		</p>
		<p class="shared">&nbsp;<br />
			<label for="<?php echo esc_attr( $this->get_field_id( 'shared' ) ); ?>">
				<input type="checkbox" name="<?php echo esc_attr( $this->get_field_name( 'shared' ) ); ?>" id="<?php echo esc_attr( $this->get_field_id( 'shared' ) ); ?>" value="1"<?php checked( $post_meta['shared'], true ); ?>/>
				<?php esc_html_e( 'Shared tooltip', 'm-chart' ); ?>
			</label>
		</p>
	</div>

	<div class="row three vertical-axis">
		<p>
			<label for="<?php echo esc_attr( $this->get_field_id( 'y-title' ) ); ?>"><?php esc_html_e( 'Vertical axis title', 'm-chart' ); ?></label><br />
			<input class="input" type="text" name="<?php echo esc_attr( $this->get_field_name( 'y_title' ) ); ?>" id="<?php echo esc_attr( $this->get_field_id( 'y-title' ) ); ?>" value="<?php echo esc_attr( $post_meta['y_title'] ); ?>" style="width: 100%;" />
		</p>
		<p class="units">
			<label for="<?php echo esc_attr( $this->get_field_id( 'y-units' ) ); ?>"><?php esc_html_e( 'Units', 'm-chart' ); ?></label><br />
			<select name='<?php echo esc_attr( $this->get_field_name( 'y_units' ) ); ?>' id="<?php echo esc_attr( $this->get_field_id( 'y-units' ) ); ?>" class='select'>
				<option value=""><?php esc_html_e( 'N/A', 'm-chart' ); ?></option>
				<?php
				foreach ( m_chart()->get_unit_terms() as $parent => $units ) {
					?>
					<option value="" disabled="disabled">
						<?php echo esc_html( $parent ); ?>
					</option>
					<?php

					foreach ( $units as $unit ) {
						?>
						<option value="<?php echo esc_attr( $unit->name ); ?>"<?php selected( $unit->name, $post_meta['y_units'] ); ?>>
							<?php echo esc_html( $unit->name ); ?>
						</option>
						<?php
					}
				}
				?>
			</select>
		</p>
	</div>
	<div class="row four y-min">
		<p>
			<label for="<?php echo esc_attr( $this->get_field_id( 'y-min' ) ); ?>">
				<input type="checkbox" name="<?php echo esc_attr( $this->get_field_name( 'y_min' ) ); ?>" id="<?php echo esc_attr( $this->get_field_id( 'y-min' ) ); ?>" value="1"<?php checked( $post_meta['y_min'], true ); ?>/>
				<?php esc_html_e( 'Force vertical axis minimum: ', 'm-chart' ) ?>
			</label>
			<input type="text" name="<?php echo esc_attr( $this->get_field_name( 'y_min_value' ) ); ?>" value="<?php echo floatval( $post_meta['y_min_value'] ); ?>" id="<?php echo esc_attr( $this->get_field_id( 'y-min-value' ) ); ?>"<?php echo $disabled; ?> />
		</p>
	</div>
	<div class="row five horizontal-axis">
		<p>
			<label for="<?php echo esc_attr( $this->get_field_id( 'x-title' ) ); ?>"><?php esc_html_e( 'Horizontal axis title', 'm-chart' ); ?></label><br />
			<input class="input" type="text" name="<?php echo esc_attr( $this->get_field_name( 'x_title' ) ); ?>" id="<?php echo esc_attr( $this->get_field_id( 'x-title' ) ); ?>" value="<?php echo esc_attr( $post_meta['x_title'] ); ?>" style="width: 100%;" />
		</p>
		<p class="units">
			<label for="<?php echo esc_attr( $this->get_field_id( 'x-units' ) ); ?>"><?php esc_html_e( 'Units', 'm-chart' ); ?></label><br />
			<select name='<?php echo esc_attr( $this->get_field_name( 'x_units' ) ); ?>' id="<?php echo esc_attr( $this->get_field_id( 'x-units' ) ); ?>" class='select'>
				<option value=""><?php esc_html_e( 'N/A', 'm-chart' ) ?></option>
				<?php
				foreach ( m_chart()->get_unit_terms() as $parent => $units ) {
					?>
					<option value="" disabled="disabled">
						<?php echo esc_html( $parent ); ?>
					</option>
					<?php

					foreach ( $units as $unit ) {
						?>
						<option value="<?php echo esc_attr( $unit->name ); ?>"<?php selected( $unit->name, $post_meta['x_units'] ); ?>>
							<?php echo esc_html( $unit->name ); ?>
						</option>
						<?php
					}
				}
				?>
			</select>
		</p>
	</div>
	<div class="row six">
		<p>
			<label for="<?php echo esc_attr( $this->get_field_id( 'source' ) ); ?>"><?php esc_html_e( 'Source', 'm-chart' ); ?></label><br />
			<input class="input" type="text" name="<?php echo esc_attr( $this->get_field_name( 'source' ) ); ?>" id="<?php echo esc_attr( $this->get_field_id( 'source' ) ); ?>" value="<?php echo esc_attr( $post_meta['source'] ); ?>" style="width: 100%;" placeholder="Name of the source of this data" />
		</p>
		<p>
			<label for="<?php echo esc_attr( $this->get_field_id( 'source-url' ) ); ?>"><?php esc_html_e( 'Source URL', 'm-chart' ); ?></label><br />
			<input class="input" type="text" name="<?php echo esc_attr( $this->get_field_name( 'source_url' ) ); ?>" id="<?php echo esc_attr( $this->get_field_id( 'source-url' ) ); ?>" value="<?php echo esc_attr( $post_meta['source_url'] ); ?>" style="width: 100%;" placeholder="URL to the source of this data" />
		</p>
	</div>
</div>
<div class="row seven">
	<p>
		<label for="<?php echo esc_attr( $this->get_field_id( 'shortcode' ) ); ?>"><?php esc_html_e( 'Shortcode', 'm-chart' ); ?></label><br />
		<input class="input" type="text" name="<?php echo esc_attr( $this->get_field_name( 'shortcode' ) ); ?>" id="<?php echo esc_attr( $this->get_field_id( 'shortcode' ) ); ?>" value='[chart id="<?php echo absint( $post->ID ); ?>"]' style="width: 100%;" readonly="readonly" />
	</p>
	<p class="image">
		<label for="<?php echo esc_attr( $this->get_field_id( 'image' ) ); ?>"><?php esc_html_e( 'Image', 'm-chart' ); ?></label><br />
		<?php
		if ( $image ) {
			?>
			<input class="input" type="text" name="<?php echo esc_attr( $this->get_field_name( 'image' ) ); ?>" id="<?php echo esc_attr( $this->get_field_id( 'image' ) ); ?>" value="<?php echo esc_url( $image['url'] ); ?>" style="width: 100%;" readonly="readonly" />
			<a href="<?php echo esc_url( $image['url'] ); ?>" class="button" target="_blank"><?php esc_html_e( 'View', 'm-chart' ); ?></a>
			<?php
		} elseif ( 'default' != $settings['performance'] ) {
			?><em><?php esc_html_e( 'Image generation is disabled', 'm-chart' ); ?></em><?php
		} else {
			?><em><?php esc_html_e( 'Save/Update this post to generate the image version', 'm-chart' ); ?></em><?php
		}
		?>
	</p>
	<input type="hidden" name="<?php echo esc_attr( $this->get_field_name( 'library' ) ); ?>" value="highcharts" id="<?php echo esc_attr( $this->get_field_id( 'library' ) ); ?>">
</div>