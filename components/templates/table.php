<table class="<?php echo esc_attr( $classes ); ?>">
	<?php
	if ( isset( m_chart()->parse()->value_labels['first_row'] ) ) {
		if ( count( m_chart()->parse()->value_labels['first_row'] ) > count( m_chart()->parse()->value_labels['first_column'] ) ) {
			$first_row = m_chart()->parse()->value_labels['first_column'];
			$labels    = m_chart()->parse()->value_labels['first_row'];
		} else {
			$first_row = m_chart()->parse()->value_labels['first_row'];
			$labels    = m_chart()->parse()->value_labels['first_column'];
		}
		?>
		<tr><th colspan="<?php echo count( $first_row ) + 1; ?>"><?php echo get_the_title( $post_id ); ?></th></tr>
		<tr>
			<th></th>
			<?php
			foreach ( $first_row as $label ) {
				?>
				<th><?php echo esc_html( $label ); ?></th>
				<?php
			}
			?>
		</tr>
		<?php
		foreach ( $labels as $row => $label ) {
			?>
			<tr>
				<th><?php echo esc_html( $label ); ?></th>
				<?php
				foreach ( $first_row as $column => $label ) {
					$value = m_chart()->parse()->set_data[ $column ][ $row ];
					$value = number_format_i18n( $value, strlen( substr( strrchr( $value, '.'), 1 ) ) );
					$value = '' != $value ? m_chart()->parse()->data_prefix . $value . m_chart()->parse()->data_suffix : '';
					?>
					<td><?php echo esc_html( $value ); ?></td>
					<?php
				}
				?>
			</tr>
			<?php
		}
	} else {
		?>
		<tr><th colspan="2"><?php echo get_the_title( $post_id ); ?></th></tr>
		<?php

		foreach ( m_chart()->parse()->value_labels as $key => $label ) {
			$value = m_chart()->parse()->set_data[ $key ];
			$value = number_format_i18n( $value, strlen( substr( strrchr( $value, '.'), 1 ) ) );
			$value = '' != $value ? m_chart()->parse()->data_prefix . $value . m_chart()->parse()->data_suffix : '';
			?>
			<tr>
				<th><?php echo esc_html( $label ); ?></th>
				<td><?php echo esc_html( $value ); ?></td>
			</tr>
			<?php
		}
	}
	?>
</table>