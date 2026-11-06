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
	image_multiplier:    '2',
	image_width:         640,
	csv_delimiters:      { ',': 'Comma' },
	default_delimiter:   ',',
	post_meta:           {},
	spreadsheet_data:    [ [ [ '' ] ] ],
	set_names:           [ 'Sheet 1' ],
	chart_args:          null,
	type_options:        [ 'line', 'bar', 'pie', 'venn', 'euler' ],
	type_option_names:   { line: 'Line', bar: 'Bar', pie: 'Pie', venn: 'Venn', euler: 'Euler' },
	themes:              [],
	unit_terms:          [],
	image_url:           '',
	multi_sheet_types:   [ 'scatter', 'bubble', 'radar', 'radar-area', 'boxplot', 'violin' ],
	chartjs_plugin_globals: [ 'MChartHelper', 'ChartDataLabels' ],
	chart_types:         { line: 'line', bar: 'bar', pie: 'pie', venn: 'venn', euler: 'euler' },
	type_traits:         {
		line:  { native: 'line', axes: true,  points: true,  shared_tooltip: true,  legend: true,  labels: true,  data_point_colors: false, simple_2d_required: false, single_sheet_required: false, boxplot_points: false, y_min: true,  constrain_y: false, multi_sheet: false, raw_grid: false, data_lines: 1 },
		bar:   { native: 'bar',  axes: true,  points: false, shared_tooltip: false, legend: true,  labels: true,  data_point_colors: true,  simple_2d_required: true,  single_sheet_required: false, boxplot_points: false, y_min: false, constrain_y: false, multi_sheet: false, raw_grid: false, data_lines: 1 },
		pie:   { native: 'pie',  axes: false, points: false, shared_tooltip: false, legend: true,  labels: true,  data_point_colors: false, simple_2d_required: false, single_sheet_required: false, boxplot_points: false, y_min: false, constrain_y: false, multi_sheet: false, raw_grid: false, data_lines: 1 },
		venn:  { native: 'venn', axes: false, points: false, shared_tooltip: false, legend: false, labels: true,  data_point_colors: false, simple_2d_required: false, single_sheet_required: false, boxplot_points: false, y_min: false, constrain_y: false, multi_sheet: false, raw_grid: true,  data_lines: 1 },
		euler: { native: 'euler', axes: false, points: false, shared_tooltip: false, legend: false, labels: true, data_point_colors: false, simple_2d_required: false, single_sheet_required: false, boxplot_points: false, y_min: false, constrain_y: false, multi_sheet: false, raw_grid: true,  data_lines: 1 },
	},
	height_range:        { min: 300, max: 1500 },
};
