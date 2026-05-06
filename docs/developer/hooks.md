# PHP Hooks & Filters

These WordPress action and filter hooks are available for plugins and themes to customize M Chart behavior on the server side.

## Action Hooks

### `m_chart_update_post_meta`

Fires after chart post meta is saved.

```php
add_action( 'm_chart_update_post_meta', function( $post_id, $post_meta, $meta ) {
	// Do something after chart data is saved
}, 10, 3 );
```

**Parameters:**
- `$post_id` _(int)_ — The chart post ID
- `$post_meta` _(array)_ — The parsed, sanitized post meta that was saved
- `$meta` _(array)_ — The raw post meta as submitted (before parsing)

---

### `m_chart_get_chart_start`

Fires at the start of chart output generation, before any HTML is rendered.

```php
add_action( 'm_chart_get_chart_start', function( $post_id, $args ) {
	// Runs before chart HTML is generated
}, 10, 2 );
```

**Parameters:**
- `$post_id` _(int)_ — The chart post ID
- `$args` _(array)_ — Display arguments: `show` (string), `width` (string), `share` (string)

---

### `m_chart_get_chart_end`

Fires at the end of chart output generation, after all HTML has been rendered.

```php
add_action( 'm_chart_get_chart_end', function( $post_id, $args ) {
	// Runs after chart HTML is generated
}, 10, 2 );
```

**Parameters:**
- `$post_id` _(int)_ — The chart post ID
- `$args` _(array)_ — Display arguments: `show` (string), `width` (string), `share` (string)

---

### `m_chart_after_chart_args`

Fires after the Chart.js chart arguments array has been fully assembled. Use this to inspect or log chart args at the PHP level. To modify chart args, use the `m_chart_chart_args` filter instead.

```php
add_action( 'm_chart_after_chart_args', function( $post_id, $args, $instance ) {
	// Inspect chart args for this post
}, 10, 3 );
```

**Parameters:**
- `$post_id` _(int)_ — The chart post ID
- `$args` _(array)_ — Display arguments: `show` (string), `width` (string), `share` (string)
- `$instance` _(int)_ — The chart instance counter, incremented for each chart on the page

---

### `m_chart_admin_scripts`

Fires in the admin footer after M Chart has enqueued its scripts. Use to enqueue additional scripts for the chart edit screen.

```php
add_action( 'm_chart_admin_scripts', function( $library, $post_id ) {
	if ( 'chartjs' !== $library ) {
		return;
	}

	wp_enqueue_script( 'my-chartjs-extension', get_template_directory_uri() . '/js/my-extension.js' );
}, 10, 2 );
```

**Parameters:**
- `$library` _(string)_ — The active charting library slug (e.g. `'chartjs'`, `'highcharts'`)
- `$post_id` _(int)_ — The chart post ID

---

### `m_chart_admin_footer_javascript`

Fires inside the admin footer `<script>` block for the chart edit screen.

---

### `m_chart_settings_admin`

Fires at the bottom of the plugin settings form, just before the Save Changes button. Use this to add custom settings fields to the M Chart settings screen.

```php
add_action( 'm_chart_settings_admin', function() {
	$value = get_option( 'my_plugin_option', '' );
	echo '<h3>My Plugin Settings</h3>';
	echo '<label>My Option <input type="text" name="my_plugin_option" value="' . esc_attr( $value ) . '" /></label>';
} );
```

No parameters.

---

### `m_chart_after_chartjs_plugins`

Fires inside the front-end `<script>` block after Chart.js plugins are registered with `Chart.register()`. Use this to register additional Chart.js plugins before the chart instance is created.

```php
add_action( 'm_chart_after_chartjs_plugins', function( $post_id, $args, $instance ) {
	echo 'Chart.register( MyChartJsPlugin );';
}, 10, 3 );
```

**Parameters:**
- `$post_id` _(int)_ — The chart post ID
- `$args` _(array)_ — Display arguments: `show` (string), `width` (string), `share` (string)
- `$instance` _(int)_ — The chart instance counter

---

### `m_chart_get_chart_begin`

Fires just before the chart template is included, after the output buffer has been opened. This is the last action that fires before chart HTML is written. It is distinct from `m_chart_get_chart_start`, which fires before the output buffer is opened.

```php
add_action( 'm_chart_get_chart_begin', function( $post_id, $args ) {
	// Runs just before the chart template is included
}, 10, 2 );
```

**Parameters:**
- `$post_id` _(int)_ — The chart post ID
- `$args` _(array)_ — Display arguments: `show` (string), `width` (string), `share` (string)

## Filter Hooks

### `m_chart_chart_args`

Filters the complete Chart.js chart arguments array before it is passed to JavaScript.

```php
add_filter( 'm_chart_chart_args', function( $chart_args, $post, $post_meta, $args ) {
	// Add a custom plugin option
	$chart_args['options']['plugins']['myPlugin']['enabled'] = true;
	return $chart_args;
}, 10, 4 );
```

**Parameters:**
- `$chart_args` _(array)_ — The Chart.js args array
- `$post` _(WP\_Post)_ — The chart post object
- `$post_meta` _(array)_ — The chart post meta
- `$args` _(array)_ — Display arguments passed to `get_chart()`

---

### `m_chart_chartjs_colors`

Filters the array of colors used by the active Chart.js theme.

```php
add_filter( 'm_chart_chartjs_colors', function( $colors, $post ) {
	return [ '#ff0000', '#00ff00', '#0000ff' ];
}, 10, 2 );
```

---

### `m_chart_chartjs_points`

Filters the array of point style definitions used by the active Chart.js theme.

---

### `m_chart_show_image`

Filters whether to show an image instead of an interactive chart. Return `true` to force image output.

```php
add_filter( 'm_chart_show_image', function( $show_image, $post_id, $args ) {
	// Force image output on mobile
	return wp_is_mobile();
}, 10, 3 );
```

---

### `m_chart_image_support`

Filters whether image generation is supported by the active library. Library plugins use this to advertise image support. Return `'no'` to disable image generation even when the library supports it.

```php
add_filter( 'm_chart_image_support', function( $supports, $library ) {
	// Disable image generation for all libraries
	return 'no';
}, 10, 2 );
```

**Parameters:**
- `$supports` _(string)_ — `'yes'` or `'no'`
- `$library` _(string)_ — The active library slug

---

### `m_chart_instant_preview_support`

Filters whether instant chart preview is supported by the active library. Library plugins use this to advertise instant preview support. Return `'no'` to disable live preview updates.

```php
add_filter( 'm_chart_instant_preview_support', function( $supports, $library ) {
	// Disable instant preview for a specific library
	if ( 'my-library' === $library ) {
		return 'no';
	}
	return $supports;
}, 10, 2 );
```

**Parameters:**
- `$supports` _(string)_ — `'yes'` or `'no'`
- `$library` _(string)_ — The active library slug

## Library Plugin Integration

These filters are the primary extension points for charting library plugins such as M Chart Highcharts Library.

### `m_chart_get_libraries`

Filters the array of registered charting libraries. Library plugins add their slug and display name here so they appear in the Library select on the plugin settings screen. This is the registration hook for library plugins.

```php
add_filter( 'm_chart_get_libraries', function( $libraries ) {
	$libraries['my-library'] = 'My Library';
	return $libraries;
} );
```

**Parameters:**
- `$libraries` _(array)_ — Associative array of `[ 'slug' => 'Display Name' ]`

---

### `m_chart_library_class`

Filters the library class instance returned by `m_chart()->library()`. Library plugins return their own class instance here. This is the primary PHP integration point for library plugins.

```php
add_filter( 'm_chart_library_class', function( $library_class, $library ) {
	if ( 'my-library' === $library ) {
		return new My_Library_Chart_Class();
	}
	return $library_class;
}, 10, 2 );
```

**Parameters:**
- `$library_class` _(object)_ — The current library class instance
- `$library` _(string)_ — The active library slug (e.g. `'chartjs'`, `'my-library'`)

---

### `m_chart_default_settings`

Filters the plugin's default settings array. Library plugins add their own setting keys and default values here so those keys survive the settings save validation loop.

```php
add_filter( 'm_chart_default_settings', function( $settings ) {
	$settings['my_library_option'] = 'default_value';
	return $settings;
} );
```

**Parameters:**
- `$settings` _(array)_ — The plugin's default settings

---

### `m_chart_validated_settings`

Fires at the end of settings save validation, after all core settings have been validated and sanitized. Library plugins use this to validate and save their own custom settings from the submitted form data.

```php
add_filter( 'm_chart_validated_settings', function( $validated_settings, $submitted_settings ) {
	if ( isset( $submitted_settings['my_library_option'] ) ) {
		$validated_settings['my_library_option'] = sanitize_text_field( $submitted_settings['my_library_option'] );
	}
	return $validated_settings;
}, 10, 2 );
```

**Parameters:**
- `$validated_settings` _(array)_ — Already-validated core settings
- `$submitted_settings` _(array)_ — Raw `$_POST` data from the settings form

---

### `m_chart_get_settings`

Filters the full plugin settings array on every call to `get_settings()`, after default values have been merged in. Use this for computed or environment-based overrides.

```php
add_filter( 'm_chart_get_settings', function( $settings ) {
	// Force a specific setting in a particular environment
	if ( defined( 'MY_ENV' ) && MY_ENV === 'staging' ) {
		$settings['performance'] = 'no-images';
	}
	return $settings;
} );
```

**Parameters:**
- `$settings` _(array)_ — The fully merged settings array

---

### `m_chart_chart_template`

Filters the path to the front-end chart template file. Library plugins use this to substitute their own template (containing the markup and `<script>` block for their library).

```php
add_filter( 'm_chart_chart_template', function( $template, $library, $post_id ) {
	if ( 'my-library' === $library ) {
		return plugin_dir_path( __FILE__ ) . 'templates/my-library-chart.php';
	}
	return $template;
}, 10, 3 );
```

**Parameters:**
- `$template` _(string)_ — Absolute path to the template file
- `$library` _(string)_ — The active library slug
- `$post_id` _(int)_ — The chart post ID

---

### `m_chart_table_template`

Filters the path to the data table template file. Fires when `show=table` is requested. Library plugins can substitute their own table template here.

```php
add_filter( 'm_chart_table_template', function( $template, $library, $post_id ) {
	if ( 'my-library' === $library ) {
		return plugin_dir_path( __FILE__ ) . 'templates/my-library-table.php';
	}
	return $template;
}, 10, 3 );
```

**Parameters:**
- `$template` _(string)_ — Absolute path to the template file
- `$library` _(string)_ — The active library slug
- `$post_id` _(int)_ — The chart post ID

---

### `m_chart_share_template`

Filters the path to the share link template rendered below embedded iframes when `share=show`.

```php
add_filter( 'm_chart_share_template', function( $template ) {
	return plugin_dir_path( __FILE__ ) . 'templates/my-share.php';
} );
```

**Parameters:**
- `$template` _(string)_ — Absolute path to the share template file

---

### `m_chart_iframe_scripts`

Filters the array of script handles passed to `wp_print_scripts()` in the iframe embed page. Library plugins use this to inject their own scripts into the iframe rendering context.

```php
add_filter( 'm_chart_iframe_scripts', function( $scripts, $post_id ) {
	$scripts[] = 'my-library-script';
	return $scripts;
}, 10, 2 );
```

**Parameters:**
- `$scripts` _(array)_ — Script handles to print in the iframe
- `$post_id` _(int)_ — The chart post ID

---

### `m_chart_multi_sheet_types`

Filters the PHP-side array of chart types that show the multi-sheet tab bar. This is the PHP-side counterpart to the `m_chart.multi_sheet_types` JavaScript filter — the return value of this filter is passed to `window.m_chart_admin.multi_sheet_types` so the React admin UI stays in sync.

```php
add_filter( 'm_chart_multi_sheet_types', function( $types ) {
	$types[] = 'my-custom-type';
	return $types;
} );
```

**Parameters:**
- `$types` _(array)_ — Chart type slugs that show multiple sheet tabs

## Post Meta

### `m_chart_get_post_meta`

Filters the chart post meta array after it has been retrieved from the database and normalized. Fires on every call to `get_post_meta()`, including during front-end rendering.

```php
add_filter( 'm_chart_get_post_meta', function( $post_meta, $raw_post_meta, $post_id ) {
	// Inject a default value if not set
	if ( empty( $post_meta['my_key'] ) ) {
		$post_meta['my_key'] = 'default';
	}
	return $post_meta;
}, 10, 3 );
```

**Parameters:**
- `$post_meta` _(array)_ — The normalized post meta
- `$raw_post_meta` _(array)_ — The raw values returned by `get_post_meta()`
- `$post_id` _(int)_ — The chart post ID

---

### `m_chart_validate_post_meta`

Fires at the end of `validate_post_meta()`, after all core meta fields have been validated and sanitized. Library plugins use this to validate and sanitize their own custom meta fields before the meta is saved.

```php
add_filter( 'm_chart_validate_post_meta', function( $chart_meta, $meta ) {
	if ( isset( $meta['my_custom_field'] ) ) {
		$chart_meta['my_custom_field'] = sanitize_text_field( $meta['my_custom_field'] );
	}
	return $chart_meta;
}, 10, 2 );
```

**Parameters:**
- `$chart_meta` _(array)_ — The validated meta array
- `$meta` _(array)_ — The raw submitted meta

## Rendering

### `m_chart_get_chart_image_tag`

Filters the image data array just before the `<img>` tag is built for image-mode output. Note: `width` and `height` have already been halved for retina display at this point.

```php
add_filter( 'm_chart_get_chart_image_tag', function( $image, $post_id, $args ) {
	// Add a CDN prefix to the image URL
	$image['url'] = 'https://cdn.example.com' . $image['url'];
	return $image;
}, 10, 3 );
```

**Parameters:**
- `$image` _(array)_ — Image data: `url` (string), `width` (int), `height` (int)
- `$post_id` _(int)_ — The chart post ID
- `$args` _(array)_ — Display arguments

---

### `m_chart_value_labels`

Filters the value labels array after it has been built from the spreadsheet data, before data set collection begins.

```php
add_filter( 'm_chart_value_labels', function( $value_labels, $value_labels_position, $data ) {
	return $value_labels;
}, 10, 3 );
```

**Parameters:**
- `$value_labels` _(array)_ — The parsed labels array
- `$value_labels_position` _(string)_ — Where labels were found: `first_row`, `first_column`, `both`, or `none`
- `$data` _(array)_ — The raw data grid

---

### `m_chart_set_data`

Filters the processed (numeric) data array after parsing. This is the data array used for chart rendering.

```php
add_filter( 'm_chart_set_data', function( $set_data_array, $data, $parse_in ) {
	return $set_data_array;
}, 10, 3 );
```

**Parameters:**
- `$set_data_array` _(array)_ — The processed, numeric data
- `$data` _(array)_ — The raw data grid
- `$parse_in` _(string)_ — Data orientation: `rows` or `columns`

---

### `m_chart_raw_data`

Filters the raw (label) data array alongside `m_chart_set_data`. Both filters run at the same point in the parse cycle.

```php
add_filter( 'm_chart_raw_data', function( $raw_data_array, $data, $parse_in ) {
	return $raw_data_array;
}, 10, 3 );
```

**Parameters:**
- `$raw_data_array` _(array)_ — The unprocessed label data
- `$data` _(array)_ — The raw data grid
- `$parse_in` _(string)_ — Data orientation: `rows` or `columns`
