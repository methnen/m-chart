# Highcharts PHP Hooks & Filters

These hooks are provided by the M Chart Highcharts Library plugin.

## Action Hooks

### `m_chart_post_render_javascript`

Fires inside the Highcharts render callback after the chart has finished rendering. Use this to inject inline JavaScript that runs in the context of the rendered Highcharts chart object.

```php
add_action( 'm_chart_post_render_javascript', function( $post_id, $args, $instance ) {
	// Inline JS runs in the Highcharts render callback
	echo 'console.log("Chart rendered:", chart);';
}, 10, 3 );
```

**Parameters:**
- `$post_id` _(int)_ — The chart post ID
- `$args` _(array)_ — Display arguments
- `$instance` _(int)_ — The chart instance number

## Filter Hooks

### `m_chart_chart_options`

Filters the Highcharts chart options array. Use this to modify chart configuration for localization or other customizations.

```php
add_filter( 'm_chart_chart_options', function( $options, $post_id ) {
	$options['lang']['decimalPoint'] = ',';
	return $options;
}, 10, 2 );
```

---

### `m_chart_enable_highcharts_accessibility`

Available since version 1.2.3. Filters whether the Highcharts accessibility module is loaded. Return `false` to disable it.

```php
add_filter( 'm_chart_enable_highcharts_accessibility', '__return_false' );
```

---

### `m_chart_enable_highcharts_export`

Available since version 1.2.3. Filters whether the Highcharts export module is loaded. Return `false` to disable the export/download button.

```php
add_filter( 'm_chart_enable_highcharts_export', '__return_false' );
```

---

### `m_chart_highcharts_available_themes`

Available since version 1.2.3. Filters the array of available Highcharts themes. Use this to add, remove, or modify themes programmatically.

```php
add_filter( 'm_chart_highcharts_available_themes', function( $themes ) {
	// Remove a built-in theme
	unset( $themes['highcharts-v3'] );
	return $themes;
} );
```

See [Highcharts Themes](./themes.md) for information on creating custom themes.
