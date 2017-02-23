<?php
if ( 1 == $this->instance ) {
	?>
	<script type="text/javascript">
	var m_chart_share = {};

	(function( $ ) {
		'use strict';

		m_chart_share.init = function() {
			$( '.m-chart-share' ).on( 'click', function () {
				$( this ).select();
			});
		};

		$( function() {
			m_chart_share.init();
		} );
	})( jQuery );
	</script>
	<?php
}
?>
<label for="m-chart-share-<?php echo absint( $post_id ); ?>-<?php echo absint( $this->instance ); ?>"><?php echo esc_html__( 'Share:', 'm-chart' ); ?></label><textarea rows="3" id="m-chart-share-<?php echo absint( $post_id ); ?>-<?php echo absint( $this->instance ); ?>" class="m-chart-share"><?php echo $this->get_chart_iframe( $post_id, $args ); ?></textarea>