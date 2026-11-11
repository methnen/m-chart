<?php
if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

// Make sure we instantiate the library so any library specific filters/setup get run
$library = $this->get_post_meta( $post->ID, 'library' );
$this->library( $library );

// Resolve the stylesheets, inline styles and font descriptors upfront so we can emit one header before any output begins
$style_urls       = apply_filters( 'm_chart_iframe_styles',        [], $post->ID );
$inline_styles    = apply_filters( 'm_chart_iframe_inline_styles', [], $post->ID );
$font_descriptors = apply_filters( 'm_chart_iframe_fonts',         [], $post->ID );

// Generate per-response CSP nonce — cryptographically random, NOT a CSRF nonce (wp_create_nonce is the wrong tool here)
$nonce = bin2hex( random_bytes( 16 ) );

// The allowlists, their filters and the sanitising of every source live in M_Chart::iframe_csp()
header( 'Content-Security-Policy: ' . $this->iframe_csp( $nonce, $post->ID, $style_urls, $font_descriptors ) );

// Expose the nonce to chartjs-chart.php so its inline <script> can carry a matching nonce attribute
$this->iframe_csp_nonce = $nonce;
?>
<!doctype html>
<html <?php language_attributes(); ?>>
    <head>
        <meta charset="utf-8">
        <meta http-equiv="X-UA-Compatible" content="IE=edge,chrome=1">
        <title><?php echo esc_html( get_the_title( $post->ID ) ); ?></title>
        <meta name="description" content="">
        <meta name="viewport" content="width=device-width, initial-scale=1">
		<?php wp_print_scripts( apply_filters( 'm_chart_iframe_scripts', $scripts, $post->ID ) ); ?>
		<?php
		// Stylesheet URLs to inject into the iframe head
		// Used by extensions that need to load external CSS (e.g. Google Fonts, Adobe Typekit) inside the iframe
		// iframes don't inherit parent-page font/style loads
		foreach ( $style_urls as $style_url ) {
			printf( '<link rel="stylesheet" href="%s" />' . "\n", esc_url( $style_url ) );
		}

		// Inline CSS strings to inject into the iframe head
		// Used by extensions that need to emit raw CSS — typically custom-uploaded @font-face rules where the producer's own sanitizer is the trust boundary
		// Distinct from m_chart_iframe_fonts below, which generates @font-face from validated field-by-field descriptors
		// Use this hook only when the CSS is already authored as CSS (e.g. m-chart-pro themes' customFontFace blocks)
		foreach ( $inline_styles as $css ) {
			if ( '' === trim( (string) $css ) ) {
				continue;
			}

			printf( "<style>%s</style>\n", $css );
		}

		// Structured @font-face injection, each descriptor goes through M_Chart::render_font_face() which allowlists every slot
		foreach ( $font_descriptors as $font ) {
			echo M_Chart::render_font_face( (array) $font );
		}
		?>
		<style>
			/* Mirror WP's .screen-reader-text rule since theme styles don't load inside the iframe */
			.screen-reader-text {
				border: 0;
				clip-path: inset(50%);
				height: 1px;
				margin: -1px;
				overflow: hidden;
				padding: 0;
				position: absolute;
				width: 1px;
				word-wrap: normal !important;
			}

			/* Un-hide the source attribution while its link has keyboard focus, mirrors m-chart-frontend.scss */
			.m-chart-source.screen-reader-text:focus-within {
				position: static;
				width: auto;
				height: auto;
				margin: 0;
				overflow: visible;
				clip-path: none;
			}

			/* Strip user-agent margin from <figure> so the chart fills the iframe edge-to-edge */
			body, figure { margin: 0; }
		</style>
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
