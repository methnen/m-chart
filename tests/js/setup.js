/**
 * Test environment globals — runs BEFORE the Jest test framework loads.
 * Anything that touches the test framework (expect, jest-dom matchers,
 * beforeEach hooks) must live in setup-after-env.js instead.
 */
const { createHooks } = require( '@wordpress/hooks' );

// The React admin UI reads global window.wp.* at runtime; reproduce the surface
// it expects so individual tests don't have to set up wp themselves
global.wp = {
	hooks: createHooks(),
	a11y:  { speak: () => {} },
};

// The admin UI reads window.m_chart_admin (set via wp_localize_script in PHP)
// to bootstrap initial state. Provide a minimal default; tests can override
// per-suite via beforeEach
global.m_chart_admin = {
	slug:                'm-chart',
	post_id:             0,
	nonce:               'test-nonce',
	ajax_url:            'http://localhost/wp-admin/admin-ajax.php',
	library:             'chartjs',
	performance:         'default',
	image_support:       'yes',
	instant_preview_support: 'yes',
	image_multiplier:    '2',
	image_width:         640,
	csv_delimiters:      { ',': 'Comma' },
	default_delimiter:   ',',
	post_meta:           {},
	spreadsheet_data:    [ [ [ '' ] ] ],
	set_names:           [ 'Sheet 1' ],
	chart_args:          null,
	type_options:        [ 'line', 'bar', 'pie' ],
	type_option_names:   { line: 'Line', bar: 'Bar', pie: 'Pie' },
	themes:              [],
	unit_terms:          [],
	image_url:           '',
	multi_sheet_types:   [ 'scatter', 'bubble', 'radar', 'radar-area', 'boxplot', 'violin' ],
};
