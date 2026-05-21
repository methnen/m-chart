/**
 * Playwright global setup — runs once before any tests
 *
 * Logs in as the default wp-env admin via wp-login.php and writes the
 * resulting auth cookies to a storage-state JSON file. playwright.config.js
 * then loads that file via `use.storageState` so every test starts already
 * authenticated as admin — no per-test login overhead, no flake from racing
 * login redirects with admin-page assertions.
 *
 * The default wp-env credentials are admin / password on both the dev (8888)
 * and tests (8889) instances. This setup runs against the tests instance
 * (matches playwright.config.js baseURL).
 */
const { request } = require( '@playwright/test' );
const { RequestUtils } = require( '@wordpress/e2e-test-utils-playwright' );
const path = require( 'path' );

const STORAGE_STATE_PATH = path.join( __dirname, '..', '.playwright-auth-state.json' );

module.exports = async function globalSetup() {
	// Use the RequestUtils helper to log in via wp-login.php and capture cookies
	const requestContext = await request.newContext( {
		baseURL: 'http://localhost:8889',
	} );

	const requestUtils = new RequestUtils( requestContext, {
		user: { username: 'admin', password: 'password' },
		storageStatePath: STORAGE_STATE_PATH,
	} );

	await requestUtils.setupRest();

	// Save the authenticated state (cookies + local storage) to disk so
	// the playwright `use.storageState` config picks it up
	await requestContext.storageState( { path: STORAGE_STATE_PATH } );
	await requestContext.dispose();
};

module.exports.STORAGE_STATE_PATH = STORAGE_STATE_PATH;
