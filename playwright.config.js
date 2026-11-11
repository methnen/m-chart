const { defineConfig, devices } = require( '@playwright/test' );
const { STORAGE_STATE_PATH } = require( './tests/e2e/global-setup' );

// The one spec that changes settings for the whole site, see the note on the projects below
const SITE_SETTINGS_SPEC = /site-settings\.spec\.js$/;

// CI runs Playwright twice in one job (the parallel tests, then the site settings project on its own)
// Naming the second run keeps its reports and traces from replacing the first run's
const RUN = process.env.E2E_RUN_NAME ? `-${ process.env.E2E_RUN_NAME }` : '';

module.exports = defineConfig( {
	testDir: './tests/e2e',
	fullyParallel: true,
	// Default is 30s; chart fixtures shell out to wp-env's CLI and those calls
	// are serialized across workers (see wpCli in fixtures.js), so tests queued
	// behind other workers' fixture setup need the extra headroom
	timeout: 60000,
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
		[ 'html',  { outputFolder: `playwright-report${ RUN }`, open: 'never' } ],
		[ 'junit', { outputFile:   `tests/junit/playwright${ RUN }.xml` } ],
	],
	outputDir: `test-results${ RUN }`,
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
			name:       'chromium',
			testIgnore: SITE_SETTINGS_SPEC,
			use:        { ...devices[ 'Desktop Chrome' ] },
		},
		// firefox + webkit are nightly-only in CI but defined here so the
		// playwright runner accepts --project=firefox / --project=webkit
		// when the nightly cron run dispatches them
		{
			name:       'firefox',
			testIgnore: SITE_SETTINGS_SPEC,
			use:        { ...devices[ 'Desktop Firefox' ] },
		},
		{
			name:       'webkit',
			testIgnore: SITE_SETTINGS_SPEC,
			use:        { ...devices[ 'Desktop Safari' ] },
		},
		// site-settings.spec.js switches embeds on for the whole site, which would turn every chart on every
		// other test's page into an iframe, so it can't share a run with them
		// This project holds only that file and depends on the others, so in a plain `playwright test`
		// it starts once the parallel tests have finished
		// `--project=chromium` still runs the parallel tests alone, as it always has
		// To run just this file: `npx playwright test --project=site-settings --no-deps`
		{
			name:          'site-settings',
			testMatch:     SITE_SETTINGS_SPEC,
			dependencies:  [ 'chromium', 'firefox', 'webkit' ],
			fullyParallel: false,
			use:           { ...devices[ 'Desktop Chrome' ] },
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
