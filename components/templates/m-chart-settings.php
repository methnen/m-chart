<div id="m-chart-settings-page" class="wrap">
	<h1><?php esc_html_e( 'M Chart Settings', 'm-chart' ); ?></h1>
	<form method="post">
		<?php wp_nonce_field( m_chart()->slug . '-save-settings', $this->get_field_name( 'nonce' ) ); ?>
		<table class="form-table">
			<tbody>
				<tr>
					<th scope="row"><?php esc_html_e( 'Performance', 'm-chart' ); ?></th>
					<td>
						<fieldset>
							<legend class="screen-reader-text">
								<span><?php esc_html_e( 'Performance', 'm-chart' ); ?></span>
							</legend>
							<label>
								<input type="radio" name="<?php echo $this->get_field_name( 'performance' ); ?>" value="default"<?php checked( $settings['performance'], 'default' ); ?> />
								<span><?php esc_html_e( 'Default', 'm-chart' ); ?></span><br />
								<span class="description"><?php esc_html_e( 'Provides all functionality', 'm-chart' ); ?></span>
							</label><br />
							<label>
								<input type="radio" name="<?php echo $this->get_field_name( 'performance' ); ?>" value="no-images"<?php checked( $settings['performance'], 'no-images' ); ?> />
								<span><?php esc_html_e( 'No Images', 'm-chart' ); ?></span><br />
								<span class="description"><?php esc_html_e( 'No generation of chart images', 'm-chart' ); ?></span>
							</label><br />
							<label>
								<input type="radio" name="<?php echo $this->get_field_name( 'performance' ); ?>" value="no-preview"<?php checked( $settings['performance'], 'no-preview' ); ?> />
								<span><?php esc_html_e( 'No Instant Preview', 'm-chart' ); ?></span><br />
								<span class="description"><?php esc_html_e( 'No instant preview and no generation of chart images', 'm-chart' ); ?></span>
							</label><br />
						</fieldset>
					</td>
				</tr>
				<tr>
					<th scope="row">
						<label for="<?php echo $this->get_field_id( 'default_theme' ); ?>">
							<?php esc_html_e( 'Default Highcharts Theme', 'm-chart' ); ?>
						</label>
					</th>
					<td>
						<select name="<?php echo $this->get_field_name( 'default_theme' ); ?>" id="<?php echo $this->get_field_id( 'default_theme' ); ?>">
							<?php
							foreach ( m_chart()->highcharts()->get_themes() as $theme ) {
								?>
								<option value="<?php echo esc_attr( $theme->slug ); ?>"<?php selected( $theme->slug, $settings['default_theme'] ); ?>>
									<?php esc_html_e( $theme->name, 'm-chart' ); ?>
								</option>
								<?php
							}
							?>
						</select>
						<p class="description">
							<?php esc_html_e( 'See the M Chart documentation for more info on how to use themes:', 'm-chart' ); ?>
							<a href="https://github.com/methnen/m-chart/wiki/Themes">https://github.com/methnen/m-chart/wiki/Themes</a>
						</p>
					</td>
				</tr>
			</tbody>
		</table>
		<p class="submit">
			<input type="submit" name="submit" id="submit" class="button button-primary" value="<?php echo esc_attr_e( 'Save Changes', 'm-chart' ); ?>">
		</p>
	</form>
</div>