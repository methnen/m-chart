<?php if ( ! defined( 'ABSPATH' ) ) { exit; } ?>
<table class="<?php echo esc_attr( $classes ); ?> table">
	<?php
	// Cells, labels and set names of a Chart.js chart are stored exactly as typed, so every character is escaped
	// esc_html() leaves "&amp;" and "&lt;" alone, which would show a cell typed that way as "&" or "<"
	// Other libraries' data can still hold entities from the tag stripping, those keep esc_html()
	$m_chart_esc = m_chart()->library_paints_plain_text( $library ) ? [ 'M_Chart', 'esc_text' ] : 'esc_html';

	$set_name = '';

	if ( $multiple ) {
		$set_name = ': ' . ( $post_meta['set_names'][ $set ] ?? '' );
	}
	?>
	<caption><?php echo esc_html( get_the_title( $post_id ) ) . call_user_func( $m_chart_esc, $set_name ); // The title is HTML, the set name is text ?></caption>
	<?php
	if ( isset( m_chart()->parse()->value_labels[ M_Chart_Parse::LABELS_FIRST_ROW ] ) ) {
		$first_row = m_chart()->parse()->value_labels[ M_Chart_Parse::LABELS_FIRST_ROW ];
		$labels    = m_chart()->parse()->value_labels[ M_Chart_Parse::LABELS_FIRST_COLUMN ];

		// Rows parsing collects the data as raw_data[ row ][ column ] while columns parsing collects it as raw_data[ column ][ row ]
		$row_column = M_Chart_Parse::PARSE_ROWS === m_chart()->parse()->parse_in;
		?>
		<thead>
			<tr>
				<td></td>
				<?php
				foreach ( $first_row as $label ) {
					?>
					<th scope="col"><?php echo call_user_func( $m_chart_esc, $label ); ?></th>
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
					<th scope="row"><?php echo call_user_func( $m_chart_esc, $label ); ?></th>
					<?php
					foreach ( $first_row as $column => $label ) {
						if ( $row_column ) {
							$raw = m_chart()->parse()->raw_data[ $row ][ $column ] ?? null;
						} else {
							$raw = m_chart()->parse()->raw_data[ $column ][ $row ] ?? null;
						}
						?>
						<td><?php echo call_user_func( $m_chart_esc, m_chart()->parse()->format_raw( $raw ) ); ?></td>
						<?php
					}
					?>
				</tr>
				<?php
			}
			?>
		</tbody>
		<?php
	} elseif (
		   M_Chart_Parse::LABELS_FIRST_COLUMN === m_chart()->parse()->value_labels_position
		&& M_Chart_Parse::PARSE_ROWS === m_chart()->parse()->parse_in
		&& [] !== m_chart()->parse()->value_labels
	) {
		// The labels came from the first column of the spreadsheet
		// Render one table row per label so the table matches the spreadsheet's vertical arrangement
		$labels  = m_chart()->parse()->value_labels;
		$raw     = m_chart()->parse()->raw_data;
		$per_row = (int) ceil( count( $raw ) / count( $labels ) );
		$chunks  = $per_row ? array_chunk( $raw, $per_row ) : [];
		?>
		<tbody>
			<?php
			foreach ( $labels as $row => $label ) {
				?>
				<tr>
					<th scope="row"><?php echo call_user_func( $m_chart_esc, $label ); ?></th>
					<?php
					foreach ( $chunks[ $row ] ?? [] as $raw ) {
						?>
						<td><?php echo call_user_func( $m_chart_esc, m_chart()->parse()->format_raw( $raw ) ); ?></td>
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
					<th scope="col"><?php echo call_user_func( $m_chart_esc, $label ); ?></th>
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
						<td><?php echo call_user_func( $m_chart_esc, m_chart()->parse()->format_raw( $raw ) ); ?></td>
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
