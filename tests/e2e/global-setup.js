/**
 * Playwright global setup — runs once before any tests
 *
 * Logs in as the default wp-env admin via wp-login.php and writes the
 * resulting auth cookies to a storage-state JSON file. playwright.config.js
 * then loads that file via `use.storageState` so every test starts already
 * authenticated as admin — no per-test login overhead, no flake from racing
 * login redirects with admin-page assertions.
 *
 * It then makes sure a Contributor and an Editor exist and stores a signed-in
 * state for each, for the tests that have to act as someone who is not an admin
 * (the contributorPage and editorPage fixtures open a browser context from them)
 *
 * The default wp-env credentials are admin / password on both the dev (8888)
 * and tests (8889) instances. This setup runs against the tests instance
 * (matches playwright.config.js baseURL).
 */
const { request } = require( '@playwright/test' );
const { RequestUtils } = require( '@wordpress/e2e-test-utils-playwright' );
const path = require( 'path' );

const BASE_URL = 'http://localhost:8889';

const STORAGE_STATE_PATH = path.join( __dirname, '..', '.playwright-auth-state.json' );

// Signed-in states for the lower roles, written beside the admin one and gitignored the same way
const ROLE_USERS = {
	contributor: { username: 'e2e-contributor', password: 'e2e-contributor-password' },
	editor:      { username: 'e2e-editor',      password: 'e2e-editor-password' },
};

const roleStatePath = ( role ) => path.join( __dirname, '..', `.playwright-auth-state-${ role }.json` );

/**
 * Logs a user in through wp-login.php and writes their cookies to a storage-state file
 *
 * @param {{ username: string, password: string }} user
 * @param {string}                                 storageStatePath
 * @return {Promise<RequestUtils>} the signed-in REST helper, its context still open
 */
async function signIn( user, storageStatePath ) {
	const requestContext = await request.newContext( { baseURL: BASE_URL } );
	const requestUtils   = new RequestUtils( requestContext, { user, storageStatePath } );

	await requestUtils.setupRest();
	await requestContext.storageState( { path: storageStatePath } );

	return requestUtils;
}

module.exports = async function globalSetup() {
	// Use the RequestUtils helper to log in via wp-login.php and capture cookies
	// The authenticated state (cookies + local storage) is saved to disk so
	// the playwright `use.storageState` config picks it up
	const admin = await signIn( { username: 'admin', password: 'password' }, STORAGE_STATE_PATH );

	for ( const [ role, user ] of Object.entries( ROLE_USERS ) ) {
		// The tests database keeps its users between runs, only create the ones that are missing
		const existing = await admin.rest( { path: '/wp/v2/users', params: { search: user.username, context: 'edit' } } );

		if ( ! existing.some( ( found ) => found.username === user.username ) ) {
			await admin.rest( {
				method: 'POST',
				path:   '/wp/v2/users',
				data:   { username: user.username, password: user.password, email: `${ user.username }@example.com`, roles: [ role ] },
			} );
		}

		const signedIn = await signIn( user, roleStatePath( role ) );

		await signedIn.request.dispose();
	}

	await admin.request.dispose();
};

module.exports.STORAGE_STATE_PATH = STORAGE_STATE_PATH;
module.exports.BASE_URL           = BASE_URL;
module.exports.roleStatePath      = roleStatePath;
