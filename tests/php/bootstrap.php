<?php
/**
 * PHPUnit bootstrap — dual-mode.
 *
 * Tier A — Brain Monkey unit tests (no WP):
 *     vendor/bin/phpunit --testsuite unit
 *
 * Tier B — WP integration tests via wp-env:
 *     wp-env run tests-cli --env-cwd=wp-content/plugins/m-chart \
 *         vendor/bin/phpunit --testsuite integration
 *
 * The wp-env tests-cli container exposes WP_TESTS_DIR; we detect it and
 * load the full WP test suite when present, otherwise we set up Brain Monkey
 * for fast pure-function unit tests.
 */

require_once __DIR__ . '/../../vendor/autoload.php';

$tests_dir = getenv( 'WP_TESTS_DIR' );

if ( $tests_dir && file_exists( $tests_dir . '/includes/functions.php' ) ) {
	// Tier B — load the full WordPress test suite for integration tests
	require_once $tests_dir . '/includes/functions.php';

	tests_add_filter( 'muplugins_loaded', function () {
		require dirname( __DIR__, 2 ) . '/m-chart.php';
	} );

	require $tests_dir . '/includes/bootstrap.php';
} else {
	// Tier A — Brain Monkey for pure-function unit tests
	if ( ! defined( 'ABSPATH' ) ) {
		define( 'ABSPATH', dirname( __DIR__, 2 ) . '/' );
	}

	if ( ! defined( 'WPINC' ) ) {
		define( 'WPINC', 'wp-includes' );
	}
}
