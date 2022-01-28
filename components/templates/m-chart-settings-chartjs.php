<h2><?php esc_html_e( 'Chart.js Settings', 'm-chart' ); ?></h2>
<table class="form-table">
	<tbody>
		<tr>
			<th scope="row">
				<label for="<?php echo esc_attr( $this->get_field_id( 'default_theme' ) ); ?>">
					<?php esc_html_e( 'Default Chart.js Theme', 'm-chart' ); ?>
				</label>
			</th>
			<td>
				<select name="<?php echo esc_attr( $this->get_field_name( 'default_theme' ) ); ?>" id="<?php echo $this->get_field_id( 'default_theme' ); ?>">
					<?php
					foreach ( m_chart()->library( 'chartjs' )->get_themes() as $theme ) {
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
		<tr>
			<th scope="row"><?php esc_html_e( 'Number Format Locale', 'm-chart' ); ?></th>
			<td>
				<select name="<?php echo esc_attr( $this->get_field_name( 'locale' ) ); ?>" id="<?php echo $this->get_field_id( 'locale' ); ?>">
					<?php
					foreach ( m_chart()->get_locales() as $locale => $locale_name ) {
						?>
						<option value="<?php echo esc_attr( $locale ); ?>"<?php selected( $locale, $settings['locale'] ); ?>>
							<?php esc_html_e( $locale_name, 'm-chart' ); ?>
						</option>
						<?php
					}
					?>
				</select>
				<p class="description">
					<?php esc_html_e( 'The locale you want Intl.NumberFormat to use when parsing the numbers in the chart', 'm-chart' ); ?>
			</td>
		</tr>
	</tbody>
</table>