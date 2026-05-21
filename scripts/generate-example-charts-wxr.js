#!/usr/bin/env node
/**
 * Generates example-charts/pickle-charts.wxr.xml from the canonical JSON fixtures
 * under tests/fixtures/charts/pickle-*.json
 *
 * Run with `npm run build:example-charts` (or `node scripts/generate-example-charts-wxr.js`).
 *
 * Each fixture becomes one m-chart post with status `draft`. The fixture's
 * entire JSON object is PHP-serialized and stored under the `m-chart`
 * post_meta key, matching how the plugin reads/writes its meta at runtime.
 *
 * The WXR file is then importable via Tools → Import → WordPress on any
 * WP install.
 */

const fs   = require( 'fs' );
const path = require( 'path' );

const ROOT         = path.resolve( __dirname, '..' );
const FIXTURES_DIR = path.join( ROOT, 'tests', 'fixtures', 'charts' );
const OUTPUT_DIR   = path.join( ROOT, 'example-charts' );
const OUTPUT_PATH  = path.join( OUTPUT_DIR, 'pickle-charts.wxr.xml' );

// Ensure the output directory exists (it's gitignored but committed-by-content in CI)
if ( ! fs.existsSync( OUTPUT_DIR ) ) {
	fs.mkdirSync( OUTPUT_DIR, { recursive: true } );
}

// Display-name lookup for unit-term slugs. m-chart stores the slug in
// the y_units / x_units fields and resolves the display name at render
// time via get_term_by( 'slug', ..., 'm-chart-units' ). The WXR must
// include a <category> entry per unit so the post→term association is
// created on import — without it, the chart renders but the unit isn't
// formally attached to the post (orphan term lookup still works, but
// the post's term list is empty in the admin).
const UNIT_NAMES = {
	tonnes:     'Tonnes',
	tons:       'Tons',
	kilograms:  'Kilograms',
	grams:      'Grams',
	milligrams: 'Milligrams',
	pounds:     'Pounds',
	ounces:     'Ounces',
	usd:        'USD',
	eur:        'EUR',
	gbp:        'GBP',
	jpy:        'JPY',
	cny:        'CNY',
	days:       'Days',
	years:      'Years',
	percent:    'Percent',
};

// Human-readable post titles per chart type. The fixture file's slug
// (pickle-<type>.json) maps to a title here. Stays in this file rather
// than the fixtures so the fixtures remain pure data.
const TITLES = {
	'line':           'Cucumber yield by top producer country, 2014-2023',
	'spline':         'Per-capita kimchi consumption in Korea',
	'area':           'South Korean kimchi exports',
	'column':         'Top cucumber-producing countries (2022)',
	'stacked-column': 'Korean kimchi exports by destination',
	'bar':            'Sodium content of signature pickles',
	'stacked-bar':    'US pickle product mix by retail brand',
	'pie':            'Chinese preserved-vegetable industry by category',
	'doughnut':       'Kimchi varieties by share of consumption',
	'scatter':        'Fermentation time vs final pH (4 pickle types)',
	'bubble':         'Cucumber consumption × production × exports',
	'radar':          'Flavor profile of 5 globally distinct pickles',
	'radar-area':     'Nutritional profile (4 pickle types)',
	'polar':          'Google Trends interest in "pickling" (US)',
	'treemap':        'Top table olive producers by region (2022/23)',
	'boxplot':        'Finished pH across 5 commercial pickle types',
	'violin':         'Sodium content across commercial pickle brands',
};

/**
 * PHP serialize a JS value the way WP's maybe_unserialize() can unpack
 * Strings are length-prefixed in BYTES (not characters) per the PHP spec
 */
function phpSerialize( val ) {
	if ( val === null || val === undefined ) {
		return 'N;';
	}
	if ( typeof val === 'boolean' ) {
		return 'b:' + ( val ? 1 : 0 ) + ';';
	}
	if ( typeof val === 'number' ) {
		if ( Number.isInteger( val ) ) {
			return 'i:' + val + ';';
		}
		return 'd:' + val + ';';
	}
	if ( typeof val === 'string' ) {
		return 's:' + Buffer.byteLength( val, 'utf8' ) + ':"' + val + '";';
	}
	if ( Array.isArray( val ) ) {
		let body = '';
		val.forEach( ( v, i ) => {
			body += 'i:' + i + ';' + phpSerialize( v );
		} );
		return 'a:' + val.length + ':{' + body + '}';
	}
	if ( typeof val === 'object' ) {
		const keys = Object.keys( val );
		let body = '';
		keys.forEach( ( k ) => {
			body += phpSerialize( k ) + phpSerialize( val[ k ] );
		} );
		return 'a:' + keys.length + ':{' + body + '}';
	}
	throw new Error( 'Cannot PHP-serialize ' + typeof val );
}

/**
 * Wraps text in CDATA. Doesn't try to encode `]]>` since none of our
 * data contains it; throws if it does so the caller knows
 */
function cdata( text ) {
	if ( String( text ).includes( ']]>' ) ) {
		throw new Error( 'CDATA content contains the close delimiter "]]>"' );
	}
	return '<![CDATA[' + text + ']]>';
}

const pubDate = new Date().toUTCString();
const today   = new Date().toISOString().slice( 0, 10 ) + ' 00:00:00';

const fixtures = fs.readdirSync( FIXTURES_DIR )
	.filter( ( f ) => f.startsWith( 'pickle-' ) && f.endsWith( '.json' ) )
	.sort();

const items = fixtures.map( ( filename, index ) => {
	const slug    = filename.replace( /^pickle-/, '' ).replace( /\.json$/, '' );
	const title   = TITLES[ slug ] || `M Chart example — ${ slug }`;
	const fullSlug = `pickle-${ slug }`;
	const postId  = 1000 + index;

	const meta = JSON.parse( fs.readFileSync( path.join( FIXTURES_DIR, filename ), 'utf8' ) );
	const serializedMeta = phpSerialize( meta );

	// Build <category> entries for the taxonomy associations m-chart relies on:
	// - m-chart-library: which renderer (chartjs / highcharts)
	// - m-chart-units: y_units and x_units terms (looked up by slug at render time)
	// The save_post pipeline at class-m-chart.php:418-431 sets these via
	// wp_set_object_terms during normal admin save. WXR imports skip that
	// pipeline (no $_POST data), so the WXR must encode the relationships
	// directly via <category> tags.
	const categories = [];
	if ( meta.library ) {
		categories.push(
			`		<category domain="m-chart-library" nicename="${ meta.library }">${ cdata( meta.library ) }</category>`
		);
	}
	for ( const unitKey of [ 'y_units', 'x_units' ] ) {
		const slug = meta[ unitKey ];
		if ( ! slug ) {
			continue;
		}
		const name = UNIT_NAMES[ slug ] || slug;
		categories.push(
			`		<category domain="m-chart-units" nicename="${ slug }">${ cdata( name ) }</category>`
		);
	}

	return `	<item>${ categories.length ? '\n' + categories.join( '\n' ) : '' }
		<title>${ cdata( title ) }</title>
		<link>https://example.com/?post_type=m-chart&amp;p=${ postId }</link>
		<pubDate>${ pubDate }</pubDate>
		<dc:creator>${ cdata( 'admin' ) }</dc:creator>
		<guid isPermaLink="false">https://example.com/?post_type=m-chart&amp;p=${ postId }</guid>
		<description></description>
		<content:encoded>${ cdata( '' ) }</content:encoded>
		<excerpt:encoded>${ cdata( '' ) }</excerpt:encoded>
		<wp:post_id>${ postId }</wp:post_id>
		<wp:post_date>${ cdata( today ) }</wp:post_date>
		<wp:post_date_gmt>${ cdata( today ) }</wp:post_date_gmt>
		<wp:comment_status>${ cdata( 'closed' ) }</wp:comment_status>
		<wp:ping_status>${ cdata( 'closed' ) }</wp:ping_status>
		<wp:post_name>${ cdata( fullSlug ) }</wp:post_name>
		<wp:status>${ cdata( 'draft' ) }</wp:status>
		<wp:post_parent>0</wp:post_parent>
		<wp:menu_order>0</wp:menu_order>
		<wp:post_type>${ cdata( 'm-chart' ) }</wp:post_type>
		<wp:post_password>${ cdata( '' ) }</wp:post_password>
		<wp:is_sticky>0</wp:is_sticky>
		<wp:postmeta>
			<wp:meta_key>${ cdata( 'm-chart' ) }</wp:meta_key>
			<wp:meta_value>${ cdata( serializedMeta ) }</wp:meta_value>
		</wp:postmeta>
	</item>`;
} ).join( '\n' );

const xml = `<?xml version="1.0" encoding="UTF-8" ?>
<rss version="2.0"
	xmlns:excerpt="http://wordpress.org/export/1.2/excerpt/"
	xmlns:content="http://purl.org/rss/1.0/modules/content/"
	xmlns:wfw="http://wellformedweb.org/CommentAPI/"
	xmlns:dc="http://purl.org/dc/elements/1.1/"
	xmlns:wp="http://wordpress.org/export/1.2/"
>
<channel>
	<title>M Chart — Pickle example charts</title>
	<link>https://example.com/</link>
	<description>17 example m-chart posts (one per chart type) using real pickle-themed data</description>
	<pubDate>${ pubDate }</pubDate>
	<language>en-US</language>
	<wp:wxr_version>1.2</wp:wxr_version>
	<wp:base_site_url>https://example.com/</wp:base_site_url>
	<wp:base_blog_url>https://example.com/</wp:base_blog_url>

${ items }

</channel>
</rss>
`;

fs.writeFileSync( OUTPUT_PATH, xml, 'utf8' );

console.log( `Wrote ${ fixtures.length } chart posts to ${ path.relative( process.cwd(), OUTPUT_PATH ) }` );
