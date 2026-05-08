<?php
if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

// Make sure we isntantiate the library so any library specific filters/setup get run
$library = $this->get_post_meta( $post->ID, 'library' );
$this->library( $library );
?>
<!doctype html>
<html>
    <head>
        <meta charset="utf-8">
        <meta http-equiv="X-UA-Compatible" content="IE=edge,chrome=1">
        <title><?php echo esc_html( get_the_title( $post->ID ) ); ?></title>
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
		// IMPORTANT: filter consumers MUST sanitize their own CSS. Only register
		// from trusted code paths — this is a privileged hook.
		$iframe_inline_styles = apply_filters( 'm_chart_iframe_inline_styles', [], $post->ID );

		foreach ( $iframe_inline_styles as $css ) {
			$css = (string) $css;

			if ( '' === trim( $css ) ) {
				continue;
			}

			// Defense in depth: strip tags, prevent </style> breakout, and remove
			// known CSS escape vectors (@import, expression, behavior, binding, javascript:)
			$css = wp_strip_all_tags( $css );
			$css = preg_replace( '#</style#i', '', $css );
			$css = preg_replace( '#(expression|behavior|binding|@import|javascript:)#i', '', $css );

			echo '<style>' . $css . '</style>' . "\n";
		}
		?>
    </head>
	<!-- overflow: hidden; prevents the iframe from scrolling -->
    <body style="overflow: hidden;">
		<?php
		$args = array_intersect_key( $_GET, $this->get_chart_default_args );
		$args = array_map( 'sanitize_text_field', $args );
		echo $this->get_chart( $post->ID, $args );
		?>
    </body>
</html>