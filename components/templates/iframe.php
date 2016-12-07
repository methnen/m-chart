<!doctype html>
<html>
    <head>
        <meta charset="utf-8">
        <meta http-equiv="X-UA-Compatible" content="IE=edge,chrome=1">
        <title><?php echo get_the_title( $post->ID ); ?></title>
        <meta name="description" content="">
        <meta name="viewport" content="width=device-width, initial-scale=1">
		<?php wp_print_scripts( array( 'highcharts', 'jquery' )); ?>
    </head>
	<!-- overflow: hidden; prevents the iframe from scrolling -->
    <body style="overflow: hidden;">
		<?php echo $this->get_chart( $post->ID, $_GET ); ?>
    </body>
</html>