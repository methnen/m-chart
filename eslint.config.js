/**
 * ESLint flat config — replaces the legacy .eslintrc.json that ESLint 9+ no longer reads by default
 *
 * Mirrors the previous .eslintrc.json one-for-one
 *   - WordPress recommended ruleset
 *   - prettier/prettier disabled (project follows WP-flavored formatting, not stock prettier)
 *   - m_chart_admin / Chart globals declared for the React admin UI
 *   - m_chart_* snake_case identifiers allowed (they come from PHP-side data)
 *   - JSDoc destructured-param requirements loosened
 *   - test-unit overlay for *.test.js files; jest globals for setup files; node globals for e2e
 */
const wpPlugin = require( '@wordpress/eslint-plugin' );
const globals  = require( 'globals' );

module.exports = [
	{
		ignores: [
			'components/admin-ui/**',
			'components/block/**',
			'components/external/**',
			'components/js/m-chart-chartjs-helper.min.js',
			'node_modules/**',
			'vendor/**',
		],
	},

	...wpPlugin.configs.recommended,

	{
		languageOptions: {
			globals: {
				...globals.browser,
				m_chart_admin: 'readonly',
				Chart:         'readonly',
			},
		},
		settings: {
			// @wordpress/* packages are provided as runtime externals by WP core (window.wp.*)
			// Some are also installed in node_modules transitively
			// Listing them as core modules silences import/no-unresolved + import/no-extraneous-dependencies
			'import/core-modules': [
				'@wordpress/blocks',
				'@wordpress/block-editor',
				'@wordpress/primitives',
				'@wordpress/html-entities',
			],
		},
		rules: {
			'prettier/prettier': 'off',
			eqeqeq: [ 'error', 'always', { null: 'ignore' } ],
			camelcase: [ 'error', {
				properties:          'never',
				ignoreDestructuring: true,
				allow:               [ '^m_chart' ],
			} ],
			'jsdoc/require-param': [ 'error', {
				checkDestructured:      false,
				checkDestructuredRoots: false,
			} ],
		},
	},

	...wpPlugin.configs[ 'test-unit' ].map( ( c ) => ( {
		...c,
		files: [ '**/@(test|__tests__)/**/*.js', '**/?(*.)test.js' ],
	} ) ),

	{
		files: [ 'tests/js/setup*.js' ],
		languageOptions: {
			globals: { ...globals.jest },
		},
	},

	{
		files: [ 'tests/e2e/**/*.js' ],
		languageOptions: {
			globals: { ...globals.node },
		},
		rules: {
			// Playwright's `use( ... )` fixture callback collides with the React `use` hook detector
			// These are NOT React hooks — disable the rule for the e2e tree
			'react-hooks/rules-of-hooks': 'off',
		},
	},
];
