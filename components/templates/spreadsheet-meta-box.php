<script type="text/javascript" charset="utf-8">
	var hands_on_table_data = <?php echo json_encode( $sheet_data ); ?>;
</script>
<div id="hands-on-table-sheet-<?php echo absint( $post->ID ); ?>" class="hands-on-table-sheet"></div>
<textarea name="<?php echo esc_attr( $this->get_field_name( 'data' ) ); ?>" rows="8" cols="40" class="data hide"></textarea>
<?php
wp_nonce_field( m_chart()->slug . '-save-post', $this->get_field_name( 'nonce' ) );