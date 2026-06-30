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
		?>
		<thead>
			<tr>
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
			<tr>
				<?php
				$row_count  = 1;
				$total_rows = count( m_chart()->parse()->raw_data ) / count( $first_row );

				foreach ( m_chart()->parse()->raw_data as $key => $raw ) {
					?>
					<td><?php echo esc_html( m_chart()->parse()->format_raw( $raw ) ); ?></td>
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
		</tbody>
	<?php
	}
	?>
</table>
