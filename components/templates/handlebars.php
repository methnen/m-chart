<script type="text/x-handlebars-template" id="m-chart-sheet-div">
	<div id="hands-on-table-sheet-{{post_id}}-{{instance}}" class="hands-on-table-sheet"></div>
</script>
<script type="text/x-handlebars-template" id="m-chart-sheet-tab">
	<a href="#hands-on-table-sheet-{{post_id}}-{{instance}}" id="hands-on-table-sheet-tab-{{post_id}}-{{instance}}" class="{{class}}" title="<?php esc_attr_e( 'Double click or long press tab to edit name', 'm-chart' ); ?>" data-instance="{{instance}}">
		<span class="dashicons dashicons-dismiss"></span><input class="hands-on-table-sheet-tab-input" id="hands-on-table-sheet-tab-input-{{post_id}}-{{instance}}" type="text" value="{{value}}" name="<?php echo $this->get_field_name( '{{instance}}', 'set_names' ); ?>" disabled="disabled" />
	</a>
</script>