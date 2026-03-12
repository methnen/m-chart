<?php
$locale    = m_chart()->get_settings( 'locale' );
$formatter = class_exists( 'NumberFormatter' ) ? new NumberFormatter( $locale, NumberFormatter::DECIMAL ) : null;

/**
 * Formats an M_Chart_Parsed_Data_Point for table display.
 * Numeric cells are formatted with the locale-aware NumberFormatter;
 * non-numeric cells are returned as plain text.
 */
function m_chart_format_raw( ?M_Chart_Parsed_Data_Point $raw, ?NumberFormatter $formatter ): string {
	if ( null === $raw ) {
		return '';
	}

	if ( $raw->is_numeric() ) {
		$number = $formatter ? $formatter->format( $raw->value ) : (string) $raw->value;
		return $raw->prefix . $number . $raw->suffix;
	}

	return $raw->text;
}
?>
<table class="<?php echo esc_attr( $classes ); ?>">
	<?php
	$set_name = '';

	if ( $multiple ) {
		$set_name = ': ' . $post_meta['set_names'][ $set ];
	}

	if ( isset( m_chart()->parse()->value_labels[ M_Chart_Parse::LABELS_FIRST_ROW ] ) ) {
		$first_row = m_chart()->parse()->value_labels[ M_Chart_Parse::LABELS_FIRST_ROW ];
		$labels    = m_chart()->parse()->value_labels[ M_Chart_Parse::LABELS_FIRST_COLUMN ];

		$row_column = false;

		if ( count( $first_row ) == count( m_chart()->parse()->raw_data[0] ) ) {
			$row_column = true;
		}
		?>
		<tr><th colspan="<?php echo count( $first_row ) + 1; ?>"><?php echo get_the_title( $post_id ) . $set_name; ?></th></tr>
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
					if ( $row_column ) {
						$raw = m_chart()->parse()->raw_data[ $row ][ $column ] ?? null;
					} else {
						$raw = m_chart()->parse()->raw_data[ $column ][ $row ] ?? null;
					}
					?>
					<td><?php echo esc_html( m_chart_format_raw( $raw, $formatter ) ); ?></td>
					<?php
				}
				?>
			</tr>
			<?php
		}
	} else {
		$first_row = m_chart()->parse()->value_labels;
		?>
		<tr><th colspan="<?php echo count( $first_row ); ?>"><?php echo get_the_title( $post_id ) . $set_name; ?></th></tr>
		<tr>
			<?php
			foreach ( $first_row as $label ) {
				?>
				<th><?php echo esc_html( $label ); ?></th>
				<?php
			}
			?>
		</tr>
		<tr>
			<?php
			$row_count  = 1;
			$total_rows = count( m_chart()->parse()->raw_data ) / count( $first_row );

			foreach ( m_chart()->parse()->raw_data as $key => $raw ) {
				?>
				<td><?php echo esc_html( m_chart_format_raw( $raw, $formatter ) ); ?></td>
				<?php

				if ( ( $key + 1 ) / ( count( $first_row ) * $row_count ) == 1 ) {
					$row_count++;

					if ( $row_count <= $total_rows ) {
						?>
						</tr><tr>
						<?php
					}
				}
			}
			?>
		</tr>
	<?php
	}
	?>
</table>
