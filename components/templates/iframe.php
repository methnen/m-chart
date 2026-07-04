<?php
if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

// Make sure we instantiate the library so any library specific filters/setup get run
$library = $this->get_post_meta( $post->ID, 'library' );
$this->library( $library );

// Resolve all CSP allowlists and font descriptors upfront so we can emit one header before any output begins
$style_urls       = apply_filters( 'm_chart_iframe_styles',        [], $post->ID );
$inline_styles    = apply_filters( 'm_chart_iframe_inline_styles', [], $post->ID );
$font_descriptors = apply_filters( 'm_chart_iframe_fonts',         [], $post->ID );

// Default allowed style-src hosts cover the well-known font-service stylesheet origins
// Site owners using Fontspring, FontAwesome CDN, an internal CDN, etc. can extend via the filter
$style_hosts = apply_filters( 'm_chart_iframe_csp_style_src', [ 'fonts.googleapis.com', 'use.typekit.net' ], $post->ID );
// Default allowed font-src hosts cover where Google Fonts + Adobe Typekit actually load their .woff2 files from
$font_hosts = apply_filters( 'm_chart_iframe_csp_font_src', [ 'fonts.gstatic.com', 'use.typekit.net', 'p.typekit.net' ], $post->ID );

// Auto-extract hosts from anything passed through m_chart_iframe_styles
// Site owners can add a stylesheet URL without also having to register its host in the CSP filter
foreach ( $style_urls as $style_url ) {
	$host = wp_parse_url( $style_url, PHP_URL_HOST );

	if ( $host ) {
		$style_hosts[] = $host;
	}
}

// Auto-extract hosts from m_chart_iframe_fonts font sources too
foreach ( $font_descriptors as $font ) {
	foreach ( (array) ( $font['src'] ?? [] ) as $src ) {
		$host = wp_parse_url( $src['url'] ?? '', PHP_URL_HOST );

		if ( $host ) {
			$font_hosts[] = $host;
		}
	}
}

$style_hosts = array_unique( array_filter( $style_hosts ) );
$font_hosts  = array_unique( array_filter( $font_hosts ) );

// frame-ancestors controls who's allowed to embed this iframe page
// Default 'self' permits same-origin embedding; site owners syndicating charts to third-party sites can add origins here
$frame_ancestors = apply_filters( 'm_chart_iframe_frame_ancestors', [ "'self'" ], $post->ID );

// Generate per-response CSP nonce — cryptographically random, NOT a CSRF nonce (wp_create_nonce is the wrong tool here)
$nonce = bin2hex( random_bytes( 16 ) );

// Whitelist the characters that can appear in a valid CSP source expression
// esc_attr() is for HTML attributes — it would encode 'self' as &#039;self&#039; here and break the directive
// Stripping anything outside this character class prevents header injection (CRLF, semicolons) while preserving keywords/hosts/schemes
$sanitize_csp_source = static function ( $value ) {
	return preg_replace( '/[^A-Za-z0-9.\-_:\/*\'+=@]/', '', (string) $value );
};

// style-src uses 'unsafe-inline' (not a nonce) because inline style="..." attributes can't carry a nonce
// CSS-driven exfiltration vectors (url(), @font-face src, @import) are still blocked by font-src / img-src / connect-src
// script-src keeps a nonce since the chart template emits a dynamic inline <script> we want strictly gated
$csp = sprintf(
	"default-src 'none'; style-src 'self' 'unsafe-inline' %s; script-src 'self' 'nonce-%s'; font-src 'self' data: %s; img-src 'self' data:; connect-src 'self'; frame-ancestors %s;",
	implode( ' ', array_map( $sanitize_csp_source, $style_hosts ) ),
	$nonce,
	implode( ' ', array_map( $sanitize_csp_source, $font_hosts  ) ),
	implode( ' ', array_map( $sanitize_csp_source, $frame_ancestors ) )
);

header( 'Content-Security-Policy: ' . $csp );

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

		// Structured @font-face injection — render each descriptor through a known-safe template
		// Every slot is allowlisted: family is char-class-stripped, weight/style/display are enum-validated
		// Src URLs are esc_url'd with HTTPS-only scheme constraint, format is alnum-stripped
		foreach ( $font_descriptors as $font ) {
			$family = preg_replace( '/[^A-Za-z0-9 _-]/', '', (string) ( $font['family'] ?? '' ) );

			if ( '' === $family ) {
				continue;
			}

			$weight  = preg_match( '/^[1-9]00$|^(normal|bold)$/', (string) ( $font['weight'] ?? '400' ) ) ? $font['weight'] : '400';
			$style   = in_array( $font['style']   ?? 'normal', [ 'normal', 'italic', 'oblique' ],                    true ) ? $font['style']   : 'normal';
			$display = in_array( $font['display'] ?? 'swap',   [ 'auto', 'block', 'swap', 'fallback', 'optional' ], true ) ? $font['display'] : 'swap';

			$srcs = [];

			foreach ( (array) ( $font['src'] ?? [] ) as $src ) {
				$url = esc_url( $src['url'] ?? '', [ 'https' ] );

				if ( '' === $url ) {
					continue;
				}

				$format = preg_replace( '/[^a-z0-9-]/', '', strtolower( (string) ( $src['format'] ?? '' ) ) );
				$srcs[] = sprintf( "url('%s')%s", $url, $format ? " format('{$format}')" : '' );
			}

			if ( empty( $srcs ) ) {
				continue;
			}

			printf(
				"<style>@font-face { font-family: '%s'; src: %s; font-weight: %s; font-style: %s; font-display: %s; }</style>\n",
				esc_html( $family ),
				implode( ', ', $srcs ),
				esc_html( $weight ),
				esc_html( $style ),
				esc_html( $display )
			);
		}
		?>
		<style>
			/* This prevents the screenreader stuff from being visible just like it behaves in it's regular context in the site  */
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
