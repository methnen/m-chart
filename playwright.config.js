const { defineConfig, devices } = require( '@playwright/test' );

module.exports = defineConfig( {
	testDir: './tests/e2e',
	fullyParallel: true,
	forbidOnly: !! process.env.CI,
	retries: process.env.CI ? 2 : 0,
	workers: process.env.CI ? 2 : undefined,
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
		baseURL:    'http://localhost:8889',
		trace:      'on-first-retry',
		screenshot: 'only-on-failure',
	},
	projects: [
		{
			name: 'chromium',
			use:  { ...devices[ 'Desktop Chrome' ] },
		},
		// firefox + webkit are nightly-only; see .github/workflows/test-e2e.yml
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
