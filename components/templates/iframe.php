<?php
// Make sure we isntantiate the library so any library specific filters/setup get run
$library = $this->get_post_meta( $post->ID, 'library' );
$this->library( $library );
?>
<!doctype html>
<html>
    <head>
        <meta charset="utf-8">
        <meta http-equiv="X-UA-Compatible" content="IE=edge,chrome=1">
        <title><?php echo get_the_title( $post->ID ); ?></title>
        <meta name="description" content="">
        <meta name="viewport" content="width=device-width, initial-scale=1">
		<?php wp_print_scripts( apply_filters( 'm_chart_iframe_scripts', $scripts, $post->ID ) ); ?>
		<?php
		// Stylesheet URLs to inject into the iframe head — used by extensions
		// that need to load external CSS (e.g. Google Fonts) inside the iframe
		// because iframes don't inherit parent-page font/style loads.
		$iframe_styles = apply_filters( 'm_chart_iframe_styles', [], $post->ID );

		foreach ( $iframe_styles as $style_url ) {
			printf( '<link rel="stylesheet" href="%s" />' . "\n", esc_url( $style_url ) );
		}

		// Inline CSS to inject into the iframe head — sibling of the URL
		// filter above for cases where the CSS is a string (e.g. @font-face
		// rules for custom self-hosted fonts) rather than an external URL.
		$iframe_inline_styles = apply_filters( 'm_chart_iframe_inline_styles', [], $post->ID );

		foreach ( $iframe_inline_styles as $css ) {
			$css = (string) $css;

			if ( '' === trim( $css ) ) {
				continue;
			}

			echo '<style>' . wp_strip_all_tags( $css ) . '</style>' . "\n";
		}
		?>
    </head>
	<!-- overflow: hidden; prevents the iframe from scrolling -->
    <body style="overflow: hidden;">
		<?php echo $this->get_chart( $post->ID, $_GET ); ?>
    </body>
</html>