# PHP Hooks & Filters

These WordPress action and filter hooks are available for plugins and themes to customize M Chart behavior on the server side.

## Action Hooks

### `m_chart_update_post_meta`

Fires after chart post meta is saved.

```php
add_action( 'm_chart_update_post_meta', function( $post_id, $post_meta ) {
	// Do something after chart data is saved
}, 10, 2 );
```

**Parameters:**
- `$post_id` _(int)_ — The chart post ID
- `$post_meta` _(array)_ — The saved post meta array

---

### `m_chart_get_chart_start`

Fires at the start of chart output generation, before any HTML is rendered.

```php
add_action( 'm_chart_get_chart_start', function( $post_id, $args ) {
	// Runs before chart HTML is generated
}, 10, 2 );
```

---

### `m_chart_get_chart_end`

Fires at the end of chart output generation, after all HTML has been rendered.

```php
add_action( 'm_chart_get_chart_end', function( $post_id, $args ) {
	// Runs after chart HTML is generated
}, 10, 2 );
```

---

### `m_chart_after_chart_args`

Fires after the Chart.js chart arguments array has been fully assembled. Use this to modify chart args at the PHP level before they are JSON-encoded and passed to JavaScript.

```php
add_action( 'm_chart_after_chart_args', function( $chart_args, $post_id ) {
	// Modify $chart_args here
}, 10, 2 );
```

---

### `m_chart_admin_scripts`

Fires in the admin footer after M Chart has enqueued its scripts. Use to enqueue additional scripts for the chart edit screen.

---

### `m_chart_admin_footer_javascript`

Fires inside the admin footer `<script>` block for the chart edit screen.

## Filter Hooks

### `m_chart_chart_args`

Filters the complete Chart.js chart arguments array before it is passed to JavaScript.

```php
add_filter( 'm_chart_chart_args', function( $chart_args, $post_id, $args ) {
	// Add a custom plugin option
	$chart_args['options']['plugins']['myPlugin']['enabled'] = true;
	return $chart_args;
}, 10, 3 );
```

**Parameters:**
- `$chart_args` _(array)_ — The Chart.js args array
- `$post_id` _(int)_ — The chart post ID
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

Filters whether image generation is supported in the current environment. Return `false` to disable it.

---

### `m_chart_instant_preview_support`

Filters whether instant chart preview is supported in the admin. Return `false` to disable live preview updates.
