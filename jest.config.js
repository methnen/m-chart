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
	// The helper script in components/js is not listed: its tests load it as a classic script, which Jest can't instrument
	// A floor a few points under what the suite measured when it was set (86% statements, 79% branches, 77% functions),
	// so coverage can't quietly fall away, without failing a change over a point or two
	// Raise it when the measured numbers have moved up and stayed there
	coverageThreshold: {
		global: {
			statements: 82,
			branches:   75,
			functions:  72,
			lines:      82,
		},
	},
};
