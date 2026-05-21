const { defineConfig, devices } = require( '@playwright/test' );
const { STORAGE_STATE_PATH } = require( './tests/e2e/global-setup' );

module.exports = defineConfig( {
	testDir: './tests/e2e',
	fullyParallel: true,
	forbidOnly: !! process.env.CI,
	retries: process.env.CI ? 2 : 0,
	workers: process.env.CI ? 2 : undefined,
	// Logs in as the wp-env admin once via wp-login.php and writes cookies
	// to a storage-state JSON. Every test then starts authenticated, so any
	// admin-page navigation (post.php?action=edit, etc) works out of the box
	globalSetup: require.resolve( './tests/e2e/global-setup.js' ),
	// Multiple reporters always:
	//   - 'github' / 'list' — terminal output (github annotations in CI, list locally)
	//   - 'html'  — interactive trace viewer at playwright-report/ (uploaded as artifact in CI)
	//   - 'junit' — XML feed for mikepenz/action-junit-report so failed test
	//                names show inline in the PR Checks tab
	reporter: [
		[ process.env.CI ? 'github' : 'list' ],
		[ 'html',  { outputFolder: 'playwright-report', open: 'never' } ],
		[ 'junit', { outputFile:   'tests/junit/playwright.xml' } ],
	],
	use: {
		// Use the wp-env "tests" instance (8889) — matches the default
		// WP_BASE_URL in @wordpress/e2e-test-utils-playwright. The "dev"
		// instance (8888) holds development data and isn't used by E2E.
		baseURL:      'http://localhost:8889',
		trace:        'on-first-retry',
		screenshot:   'only-on-failure',
		// Pre-authenticated session written by global-setup.js — every test
		// starts already logged in as admin so admin.visitAdminPage works
		storageState: STORAGE_STATE_PATH,
	},
	projects: [
		{
			name: 'chromium',
			use:  { ...devices[ 'Desktop Chrome' ] },
		},
		// firefox + webkit are nightly-only in CI but defined here so the
		// playwright runner accepts --project=firefox / --project=webkit
		// when the nightly cron run dispatches them
		{
			name: 'firefox',
			use:  { ...devices[ 'Desktop Firefox' ] },
		},
		{
			name: 'webkit',
			use:  { ...devices[ 'Desktop Safari' ] },
		},
	],
	webServer: {
		command:             'npm run wp-env start',
		url:                 'http://localhost:8889',
		// Always reuse an existing wp-env on port 8889. In CI the workflow's
		// "Start wp-env" step starts it before this config runs; locally the
		// developer may have wp-env already up. In both cases we want Playwright
		// to skip its own start rather than fight for the port.
		reuseExistingServer: true,
		timeout:             180000,
	},
} );
