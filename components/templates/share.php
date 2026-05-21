<?php
if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

if ( 1 == $this->instance ) {
	?>
	<script type="text/javascript">
	document.addEventListener( 'DOMContentLoaded', function() {
		document.querySelectorAll( '.m-chart-share' ).forEach( function( el ) {
			el.addEventListener( 'click', function() {
				el.select();
			} );
		} );
	} );
	</script>
	<?php
}
?>
<label for="m-chart-share-<?php echo absint( $post_id ); ?>-<?php echo absint( $this->instance ); ?>"><?php echo esc_html__( 'Share:', 'm-chart' ); ?></label><textarea rows="3" id="m-chart-share-<?php echo absint( $post_id ); ?>-<?php echo absint( $this->instance ); ?>" class="m-chart-share"><?php echo esc_textarea( $this->get_chart_iframe( $post_id, $args ) ); ?></textarea>