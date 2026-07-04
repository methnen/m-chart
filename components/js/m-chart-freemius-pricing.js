'use strict';

/**
 * Re-point the Freemius pricing page contact links at M Chart's own pages
 *
 * The pricing React app builds every "contact us" link from a single contact_url and appends a ?topic= param ("refund" or "pre_sale_question")
 * We rewrite the rendered anchors by that topic refund goes to the support page, everything else goes to the contact page
 *
 * Injected inline on the pricing screen via the templates/pricing.php filter (see M_Chart::freemius_filters)
 */
( function () {
	var SUPPORT_URL = 'https://mch.art/support/';
	var CONTACT_URL = 'https://mch.art/contact/';

	// Rewrite a single contact anchor based on its topic param
	// Links without a topic param are left alone so we only touch the Freemius contact links
	function rewrite( a ) {
		var href  = a.getAttribute( 'href' ) || '';
		var match = href.match( /[?&]topic=([^&#]+)/ );

		if ( ! match ) {
			return;
		}

		// Compare the raw param rather than decoding it
		// The expected values contain no encoded characters and decodeURIComponent throws on malformed sequences
		var dest = 'refund' === match[ 1 ] ? SUPPORT_URL : CONTACT_URL;

		if ( a.getAttribute( 'href' ) !== dest ) {
			a.setAttribute( 'href', dest );
		}
	}

	// Rewrite every contact anchor found within a given root
	function scan( root ) {
		if ( ! root.querySelectorAll ) {
			return;
		}

		var links = root.querySelectorAll( 'a[href*="topic="]' );

		for ( var i = 0; i < links.length; i++ ) {
			rewrite( links[ i ] );
		}
	}

	function init() {
		// Rewrite anything already present
		scan( document );

		// The React app renders links after load and portals the refund modal onto the body
		// So watch the whole body and rewrite links as they appear
		// href attribute mutations are watched too since a React re-render can rewrite an existing anchor in place
		// The href !== dest guard in rewrite() keeps our own setAttribute from looping the observer
		var observer = new MutationObserver( function ( mutations ) {
			for ( var i = 0; i < mutations.length; i++ ) {
				if ( 'attributes' === mutations[ i ].type ) {
					rewrite( mutations[ i ].target );
					continue;
				}

				var added = mutations[ i ].addedNodes;

				for ( var j = 0; j < added.length; j++ ) {
					var node = added[ j ];

					if ( 1 !== node.nodeType ) {
						continue;
					}

					if ( node.matches && node.matches( 'a[href*="topic="]' ) ) {
						rewrite( node );
					}

					scan( node );
				}
			}
		} );

		observer.observe( document.body, {
			childList:       true,
			subtree:         true,
			attributes:      true,
			attributeFilter: [ 'href' ],
		} );
	}

	if ( 'loading' === document.readyState ) {
		document.addEventListener( 'DOMContentLoaded', init );
	} else {
		init();
	}
} )();
