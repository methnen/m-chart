<div class="export">
	<a href="#export-csv" title="<?php esc_attr_e( 'Export CSV', 'm-chart' ); ?>" class="button"><?php esc_html_e( 'Export', 'm-chart' ); ?></a>
</div>
<div class="import">
	<div class="controls">
		<a href="#select-csv" title="<?php esc_attr_e( 'Select CSV File', 'm-chart' ); ?>" class="button select"><?php esc_html_e( 'Select File', 'm-chart' ); ?></a>
		<a href="#import-csv" title="<?php esc_attr_e( 'Import', 'm-chart' ); ?>" class="button import hide"><?php esc_html_e( 'Import', 'm-chart' ); ?></a>
		<p class="file error hide"><?php esc_html_e( 'You can only import CSV files', 'm-chart' ); ?></p>
		<p class="import error hide"></p>
		<p class="import in-progress hide"><?php esc_html_e( 'Importing file', 'm-chart' ); ?></p>
		<div class="file-info hide">
			<a href="#cancel" title="<?php esc_attr_e( 'Cancel Import', 'm-chart' ); ?>" class="dashicons dashicons-dismiss"></a>
			File: <span class="file-name"></span><br />
			<span class="warning"><?php esc_html_e( 'Importing this file will replace all existing data', 'm-chart' ); ?></span>
		</div>
	</div>
</div>