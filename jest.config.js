const wpJestConfig = require( '@wordpress/scripts/config/jest-unit.config' );

module.exports = {
	...wpJestConfig,
	rootDir: '.',
	testMatch: [ '<rootDir>/tests/js/**/*.test.js' ],
	setupFiles: [ '<rootDir>/tests/js/setup.js' ],
	setupFilesAfterEnv: [
		...( wpJestConfig.setupFilesAfterEnv || [] ),
		'<rootDir>/tests/js/setup-after-env.js',
	],
	moduleNameMapper: {
		...( wpJestConfig.moduleNameMapper || {} ),
		'\\.(scss|css)$': '<rootDir>/tests/js/style-mock.js',
	},
	// CI-friendly reporters: keep the default for human-readable terminal output,
	// add jest-junit so GitHub Actions can surface failed test names inline in
	// the PR Checks tab (via mikepenz/action-junit-report)
	reporters: [
		'default',
		[ 'jest-junit', {
			outputDirectory: '<rootDir>/tests/junit',
			outputName:      'jest.xml',
			suiteName:       'Jest unit tests',
			classNameTemplate: '{classname}',
			titleTemplate:     '{title}',
			ancestorSeparator: ' › ',
		} ],
	],
	collectCoverageFrom: [
		'components/admin-ui-src/**/*.js',
		'components/block-src/**/*.js',
		'!**/index.js',
	],
	// Coverage thresholds intentionally not enforced yet — the suite covers
	// only the highest-risk paths (reducer + useChartRefresh) so far, and a
	// global threshold would fail loudly without informing maintenance choices.
	// Coverage is still collected and uploaded as an artifact; reinstate
	// thresholds once meaningful per-file coverage is in place.
};
