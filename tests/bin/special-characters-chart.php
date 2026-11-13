<?php
/**
 * Creates the Special characters test chart on a WordPress site, or refreshes it if it is already there
 *
 * A chart to look at by hand: every kind of awkward text (ampersands, angle brackets, quotes, typed entities,
 * typed tags, accents, non-Latin script, backslashes, dashes) in the title, subtitle, both axis titles, the source,
 * the sheet name, the series names and the labels. A page beside it shows the chart and its table together
 *
 * The text comes from tests/fixtures/charts/special-characters.json, written as a person would type it
 * It is saved through the plugin's own save, the same call the editor's form post ends in,
 * so the database holds what the editor would have stored and nothing has to be kept in step by hand
 *
 * Run it again after a database reset, or after changing the fixture: it updates the same chart and page
 *
 *   A wp-env site:   npx wp-env run cli wp eval-file wp-content/plugins/m-chart/tests/bin/special-characters-chart.php
 *   Any other site:  php tests/bin/special-characters-chart.php /path/to/wordpress [host name]
 *
 * The second form is for sites WP-CLI can't reach, such as MAMP's, and needs a PHP that can reach the site's database
 */

// Run on its own, so load WordPress from the folder given
if ( ! defined( 'ABSPATH' ) ) {
	if ( 'cli' !== PHP_SAPI ) {
		exit;
	}

	$m_chart_test_root = rtrim( (string) ( $argv[1] ?? '' ), '/' );

	if ( '' === $m_chart_test_root || ! is_file( $m_chart_test_root . '/wp-load.php' ) ) {
		fwrite( STDERR, "Usage: php special-characters-chart.php /path/to/wordpress [host name]\n" );
		exit( 1 );
	}

	// WordPress wants a host to build its addresses from, the folder name plus .local is right for a MAMP site
	$_SERVER['HTTP_HOST']   = $argv[2] ?? basename( $m_chart_test_root ) . '.local';
	$_SERVER['REQUEST_URI'] = '/';

	define( 'M_CHART_TEST_RUN_FIXTURE', true );

	require $m_chart_test_root . '/wp-load.php';
}

/**
 * The fixture, text as typed
 *
 * @return array
 */
function m_chart_test_special_characters_fixture() {
	return json_decode( file_get_contents( dirname( __DIR__ ) . '/fixtures/charts/special-characters.json' ), true );
}

/**
 * The chart's meta as the editor's form would post it, before any slashing
 *
 * Parsed by rows: the top row holds a label for every string, each row below it is a series named in its first cell
 *
 * @param array $fixture the fixture
 *
 * @return array
 */
function m_chart_test_special_characters_meta( array $fixture ) {
	$sheet = [ array_merge( [ '' ], $fixture['strings'] ) ];

	foreach ( $fixture['series'] as $index => $series ) {
		$row = [ $series ];

		// Any numbers will do, these give two different shapes that are easy to tell apart
		foreach ( array_keys( $fixture['strings'] ) as $position ) {
			$row[] = (string) ( 0 === $index ? 10 + ( $position * 3 ) % 17 : 28 - ( $position * 5 ) % 19 );
		}

		$sheet[] = $row;
	}

	return [
		'library'        => 'chartjs',
		'type'           => $fixture['type'],
		'theme'          => '_default',
		'parse_in'       => 'rows',
		'labels'         => 1,
		'legend'         => 1,
		'include_source' => 1,
		'height'         => $fixture['height'],
		'subtitle'       => $fixture['subtitle'],
		'x_title'        => $fixture['x_title'],
		'y_title'        => $fixture['y_title'],
		'source'         => $fixture['source'],
		'source_url'     => $fixture['source_url'],
		'set_names'      => [ $fixture['set_name'] ],
		'data'           => [ $sheet ],
	];
}

/**
 * Create or refresh the chart and the page that shows it
 *
 * @return array{chart: int, page: int} the two post IDs
 */
function m_chart_test_create_special_characters_chart() {
	$fixture = m_chart_test_special_characters_fixture();

	$find = static function ( $slug, $post_type ) {
		$found = get_posts( [ 'name' => $slug, 'post_type' => $post_type, 'post_status' => 'any', 'numberposts' => 1, 'fields' => 'ids' ] );

		return $found ? (int) $found[0] : 0;
	};

	$chart_id = wp_insert_post( wp_slash( [
		'ID'          => $find( $fixture['slug'], m_chart()->slug ),
		'post_type'   => m_chart()->slug,
		'post_status' => 'publish',
		'post_name'   => $fixture['slug'],
		'post_title'  => $fixture['title'],
	] ), true );

	if ( is_wp_error( $chart_id ) ) {
		return $chart_id;
	}

	// The way the editor's form post arrives: every value slashed, the sheets as a JSON string
	$meta = m_chart_test_special_characters_meta( $fixture );
	$data = $meta['data'];

	unset( $meta['data'] );

	$meta         = wp_slash( $meta );
	$meta['data'] = wp_slash( wp_json_encode( $data ) );

	m_chart()->update_post_meta( $chart_id, $meta );

	$page_id = wp_insert_post( wp_slash( [
		'ID'           => $find( $fixture['page_slug'], 'page' ),
		'post_type'    => 'page',
		'post_status'  => 'publish',
		'post_name'    => $fixture['page_slug'],
		'post_title'   => $fixture['page_title'],
		'post_content' => "<p>The chart, then the same data as a table.</p>\n\n[chart id=\"{$chart_id}\"]\n\n[chart id=\"{$chart_id}\" show=\"table\"]",
	] ), true );

	return [ 'chart' => $chart_id, 'page' => is_wp_error( $page_id ) ? 0 : $page_id ];
}

// Run when called on its own or through wp eval-file, a test that only wants the functions gets just those
if ( defined( 'M_CHART_TEST_RUN_FIXTURE' ) || ( defined( 'WP_CLI' ) && WP_CLI ) ) {
	if ( ! function_exists( 'm_chart' ) ) {
		fwrite( STDERR, "M Chart is not active on this site\n" );
		exit( 1 );
	}

	// Saved as an administrator: WordPress strips anything that looks like a tag from a title for a user who may not post HTML
	$m_chart_test_admins = get_users( [ 'role' => 'administrator', 'number' => 1, 'orderby' => 'ID', 'fields' => 'ids' ] );

	if ( $m_chart_test_admins ) {
		wp_set_current_user( (int) $m_chart_test_admins[0] );
		kses_init();
	}

	$m_chart_test_made = m_chart_test_create_special_characters_chart();

	if ( is_wp_error( $m_chart_test_made ) ) {
		fwrite( STDERR, $m_chart_test_made->get_error_message() . "\n" );
		exit( 1 );
	}

	echo 'Chart ' . $m_chart_test_made['chart'] . ': ' . get_permalink( $m_chart_test_made['chart'] ) . "\n";
	echo 'Edit:  ' . admin_url( 'post.php?post=' . $m_chart_test_made['chart'] . '&action=edit' ) . "\n";
	echo 'Page ' . $m_chart_test_made['page'] . ':  ' . get_permalink( $m_chart_test_made['page'] ) . "\n";
}
