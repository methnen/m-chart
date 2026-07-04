<?php if ( ! defined( 'ABSPATH' ) ) { exit; } ?>
<table class="<?php echo esc_attr( $classes ); ?>">
	<?php
	$set_name = '';

	if ( $multiple ) {
		$set_name = ': ' . $post_meta['set_names'][ $set ];
	}
	?>
	<caption><?php echo esc_html( get_the_title( $post_id ) . $set_name ); ?></caption>
	<?php
	if ( isset( m_chart()->parse()->value_labels[ M_Chart_Parse::LABELS_FIRST_ROW ] ) ) {
		$first_row = m_chart()->parse()->value_labels[ M_Chart_Parse::LABELS_FIRST_ROW ];
		$labels    = m_chart()->parse()->value_labels[ M_Chart_Parse::LABELS_FIRST_COLUMN ];

		$row_column = false;

		if ( isset( m_chart()->parse()->raw_data[0] ) && count( $first_row ) == count( m_chart()->parse()->raw_data[0] ) ) {
			$row_column = true;
		}
		?>
		<thead>
			<tr>
				<td></td>
				<?php
				foreach ( $first_row as $label ) {
					?>
					<th scope="col"><?php echo esc_html( $label ); ?></th>
					<?php
				}
				?>
			</tr>
		</thead>
		<tbody>
			<?php
			foreach ( $labels as $row => $label ) {
				?>
				<tr>
					<th scope="row"><?php echo esc_html( $label ); ?></th>
					<?php
					foreach ( $first_row as $column => $label ) {
						if ( $row_column ) {
							$raw = m_chart()->parse()->raw_data[ $row ][ $column ] ?? null;
						} else {
							$raw = m_chart()->parse()->raw_data[ $column ][ $row ] ?? null;
						}
						?>
						<td><?php echo esc_html( m_chart()->parse()->format_raw( $raw ) ); ?></td>
						<?php
					}
					?>
				</tr>
				<?php
			}
			?>
		</tbody>
		<?php
	} else {
		$first_row = m_chart()->parse()->value_labels;

		// Chunk the flat cell stream into rows of one label-width each
		// Multi-row bodies get a generated row header so every data cell has row context
		$columns   = count( $first_row );
		$rows      = $columns ? array_chunk( m_chart()->parse()->raw_data, $columns ) : [];
		$multi_row = 1 < count( $rows );
		?>
		<thead>
			<tr>
				<?php
				if ( $multi_row ) {
					?>
					<td></td>
					<?php
				}

				foreach ( $first_row as $label ) {
					?>
					<th scope="col"><?php echo esc_html( $label ); ?></th>
					<?php
				}
				?>
			</tr>
		</thead>
		<tbody>
			<?php
			foreach ( $rows as $row => $cells ) {
				?>
				<tr>
					<?php
					if ( $multi_row ) {
						?>
						<th scope="row">
							<?php
							// translators: %d is the row number in the chart's data table
							echo esc_html( sprintf( __( 'Row %d', 'm-chart' ), $row + 1 ) );
							?>
						</th>
						<?php
					}

					foreach ( $cells as $raw ) {
						?>
						<td><?php echo esc_html( m_chart()->parse()->format_raw( $raw ) ); ?></td>
						<?php
					}
					?>
				</tr>
				<?php
			}
			?>
		</tbody>
	<?php
	}
	?>
</table>
