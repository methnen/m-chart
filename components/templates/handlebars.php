<script type="text/x-handlebars-template" id="m-chart-sheet-div">
	<div id="spreadsheet-{{post_id}}-{{instance}}" class="spreadsheet"></div>
</script>
<script type="text/x-handlebars-template" id="m-chart-sheet-tab">
	<a href="#spreadsheet-{{post_id}}-{{instance}}" id="spreadsheet-tab-{{post_id}}-{{instance}}" class="{{class}}" title="<?php esc_attr_e( 'Double click or long press tab to edit name', 'm-chart' ); ?>" data-instance="{{instance}}">
		<span class="dashicons dashicons-dismiss"></span><span class="tab-title">{{value}}</span><input class="spreadsheet-tab-input hide" id="spreadsheet-tab-input-{{post_id}}-{{instance}}" type="text" value="{{value}}" name="<?php echo $this->get_field_name( '{{instance}}', 'set_names' ); ?>" />
	</a>
</script>