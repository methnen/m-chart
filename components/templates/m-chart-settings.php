<div id="m-chart-settings-page" class="wrap">
	<h1><?php esc_html_e( 'M Chart Settings', 'm-chart' ); ?></h1>
	<form method="post">
		<?php wp_nonce_field( m_chart()->slug . '-save-settings', $this->get_field_name( 'nonce' ) ); ?>
		<h2><?php esc_html_e( 'General Settings', 'm-chart' ); ?></h2>
		<table class="form-table">
			<tbody>
				<tr>
					<th scope="row"><?php esc_html_e( 'Default Library', 'm-chart' ); ?></th>
					<td>
						<select name="<?php echo esc_attr( $this->get_field_name( 'library' ) ); ?>" id="<?php echo esc_attr( $this->get_field_id( 'library' ) ); ?>">
							<?php
							foreach ( m_chart()->get_libraries() as $library => $library_name ) {
								?>
								<option value="<?php echo esc_attr( $library ); ?>"<?php selected( $library, $settings['library'] ); ?>>
									<?php esc_html_e( $library_name, 'm-chart' ); ?>
								</option>
								<?php
							}
							?>
						</select>
						<p class="description">
							<?php esc_html_e( 'Chart.js is the GPL compatible default library:', 'm-chart' ); ?>
							<a href="https://github.com/methnen/m-chart/wiki/Libraries">https://github.com/methnen/m-chart/wiki/Libraries</a>
						</p>
					</td>
				</tr>
				<tr>
					<th scope="row"></th>
					<td>
						<label>
							<input type="checkbox" name="<?php echo esc_attr( $this->get_field_name( 'show_library' ) ); ?>" value="yes"<?php checked( $settings['show_library'], 'yes' ); ?> />
							<span><?php esc_html_e( 'Show Library in Edit Posts Screen', 'm-chart' ); ?></span><br />
							<span class="description"><?php esc_html_e( 'Displays an icon indicating the library used for a chart in Edit Posts Screen of the WP Admin', 'm-chart' ); ?></span>
						</label>
					</td>
				</tr>
				<tr>
					<th scope="row"><?php esc_html_e( 'Performance', 'm-chart' ); ?></th>
					<td>
						<fieldset>
							<legend class="screen-reader-text">
								<span><?php esc_html_e( 'Performance', 'm-chart' ); ?></span>
							</legend>
							<label>
								<input type="radio" name="<?php echo esc_attr( $this->get_field_name( 'performance' ) ); ?>" value="default"<?php checked( $settings['performance'], 'default' ); ?> />
								<span><?php esc_html_e( 'Default', 'm-chart' ); ?></span><br />
								<span class="description"><?php esc_html_e( 'Provides all functionality', 'm-chart' ); ?></span>
							</label><br />
							<label>
								<input type="radio" name="<?php echo esc_attr( $this->get_field_name( 'performance' ) ); ?>" value="no-images"<?php checked( $settings['performance'], 'no-images' ); ?> />
								<span><?php esc_html_e( 'No Images', 'm-chart' ); ?></span><br />
								<span class="description"><?php esc_html_e( 'No generation of chart images', 'm-chart' ); ?></span>
							</label><br />
							<label>
								<input type="radio" name="<?php echo esc_attr( $this->get_field_name( 'performance' ) ); ?>" value="no-preview"<?php checked( $settings['performance'], 'no-preview' ); ?> />
								<span><?php esc_html_e( 'No Instant Preview', 'm-chart' ); ?></span><br />
								<span class="description"><?php esc_html_e( 'No instant preview and no generation of chart images', 'm-chart' ); ?></span>
							</label>
						</fieldset>
					</td>
				</tr>
				<tr>
					<th scope="row"><?php esc_html_e( 'Image Multiplier', 'm-chart' ); ?></th>
					<td>
						<fieldset>
							<legend class="screen-reader-text">
								<span><?php esc_html_e( 'Image Multiplier', 'm-chart' ); ?></span>
							</legend>
							<label>
								<input type="radio" name="<?php echo esc_attr( $this->get_field_name( 'image_multiplier' ) ); ?>" value="1"<?php checked( $settings['image_multiplier'], '1' ); ?> />
								<span><?php esc_html_e( '1x', 'm-chart' ); ?></span><br />
							</label><br />
							<label>
								<input type="radio" name="<?php echo esc_attr( $this->get_field_name( 'image_multiplier' ) ); ?>" value="2"<?php checked( $settings['image_multiplier'], '2' ); ?> />
								<span><?php esc_html_e( '2x', 'm-chart' ); ?></span><br />
							</label><br />
							<label>
								<input type="radio" name="<?php echo esc_attr( $this->get_field_name( 'image_multiplier' ) ); ?>" value="3"<?php checked( $settings['image_multiplier'], '3' ); ?> />
								<span><?php esc_html_e( '3x', 'm-chart' ); ?></span><br />
							</label><br />
							<label>
								<input type="radio" name="<?php echo esc_attr( $this->get_field_name( 'image_multiplier' ) ); ?>" value="4"<?php checked( $settings['image_multiplier'], '4' ); ?> />
								<span><?php esc_html_e( '4x', 'm-chart' ); ?></span><br />
							</label><br />
							<span class="description"><?php esc_html_e( 'The higher the multiplier the better the images will look on high DPI screens', 'm-chart' ); ?></span>
						</fieldset>
					</td>
				</tr>
				<tr>
					<th scope="row"><?php esc_html_e( 'Image Width', 'm-chart' ); ?></th>
					<td>
						<input type="number" name="<?php echo esc_attr( m_chart()->admin()->get_field_name( 'image_width' ) ); ?>" value="<?php echo absint( $settings['image_width'] ); ?>" />
						<p class="description">
							<?php esc_html_e( 'The width of the image generated from your chart', 'm-chart' ); ?>
						</p>
					</td>
				</tr>
				<tr>
					<th scope="row"><?php esc_html_e( 'Embeds', 'm-chart' ); ?></th>
					<td>
						<label>
							<input type="checkbox" name="<?php echo esc_attr( $this->get_field_name( 'embeds' ) ); ?>" value="enabled"<?php checked( $settings['embeds'], 'enabled' ); ?> />
							<span><?php esc_html_e( 'Enable iframe embeds', 'm-chart' ); ?></span><br />
							<span class="description"><?php esc_html_e( 'Allow charts to be remotely embedded via iframes', 'm-chart' ); ?></span>
						</label>
					</td>
				</tr>
				<tr>
					<th scope="row"><?php esc_html_e( 'Default CSV Delimiter', 'm-chart' ); ?></th>
					<td>
						<select name="<?php echo esc_attr( $this->get_field_name( 'csv_delimiter' ) ); ?>" id="<?php echo esc_attr( $this->get_field_id( 'csv-delimiter' ) ); ?>">
							<?php
							foreach ( m_chart()->csv_delimiters as $delimiter => $delimiter_name ) {
								?>
								<option value="<?php echo esc_attr( $delimiter ); ?>"<?php selected( $delimiter, $settings['csv_delimiter'] ); ?>>
									<?php esc_html_e( $delimiter_name, 'm-chart' ); ?>
								</option>
								<?php
							}
							?>
						</select>
						<span class="description"><?php esc_html_e( 'Default used when importing/exporting CSV files', 'm-chart' ); ?></span>
					</td>
				</tr>
			</tbody>
		</table>
		<?php do_action( 'm_chart_settings_admin' ); ?>
		<p class="submit">
			<input type="submit" name="submit" id="submit" class="button button-primary" value="<?php echo esc_attr_e( 'Save Changes', 'm-chart' ); ?>">
		</p>
	</form>
</div>