<script type="text/javascript" charset="utf-8">
	var hands_on_table_data = <?php echo json_encode( $sheet_data ); ?>;
</script>
<nav id="hands-on-table-sheet-tabs" class="nav-tab-wrapper hide">
	<a href="#add-sheet" class="add-sheet" title="<?php esc_html_e( 'Add Sheet', 'm-chart' ); ?>"><span class="dashicons dashicons-plus-alt"></span></a>
</nav>
<div id="hands-on-table-sheets"></div>
<div id="m-chart-csv">
	<div class="export">
		<br />
		<a href="#export-csv" title="<?php esc_attr_e( 'Export CSV', 'm-chart' ); ?>" class="button"><?php esc_html_e( 'Export', 'm-chart' ); ?></a>
	</div>
	<div class="import">
		<?php esc_html_e( 'CSV Import/Export', 'm-chart' ); ?><br />
		<div class="controls">
			<a href="#select-csv" title="<?php esc_attr_e( 'Select CSV File', 'm-chart' ); ?>" class="button select"><?php esc_html_e( 'Select File', 'm-chart' ); ?></a>
			<div class="confirmation hide">
				<a href="#import-csv" title="<?php esc_attr_e( 'Import', 'm-chart' ); ?>" class="button"><?php esc_html_e( 'Import', 'm-chart' ); ?></a>
				<select name="<?php echo esc_attr( $this->get_field_name( 'csv_delimiter' ) ); ?>">
					<?php
					$csv_delimiter = m_chart()->get_settings( 'csv_delimiter' );
				
					foreach ( m_chart()->csv_delimiters as $delimiter => $delimiter_name ) {
						?>
						<option value="<?php echo esc_attr( $delimiter ); ?>"<?php selected( $delimiter, $csv_delimiter ); ?>>
							<?php esc_html_e( $delimiter_name . ' Delimited', 'm-chart' ); ?>
						</option>
						<?php
					}
					?>
				</select>
			</div>
			<p class="file error hide"><?php esc_html_e( 'You can only import CSV files', 'm-chart' ); ?></p>
			<p class="import error hide"></p>
			<p class="import in-progress hide"><?php esc_html_e( 'Importing file', 'm-chart' ); ?></p>
			<div class="file-info hide">
				<a href="#cancel" title="<?php esc_attr_e( 'Cancel Import', 'm-chart' ); ?>" class="dashicons dashicons-dismiss"></a>
				File: <span class="file-name"></span><br />
				<span class="warning"><?php esc_html_e( 'Importing this file will replace all existing data in this sheet', 'm-chart' ); ?></span>
			</div>
		</div>
	</div>
</div>
<textarea name="<?php echo esc_attr( $this->get_field_name( 'data' ) ); ?>" rows="8" cols="40" class="data hide"></textarea>
<?php
wp_nonce_field( m_chart()->slug . '-save-post', $this->get_field_name( 'nonce' ) );