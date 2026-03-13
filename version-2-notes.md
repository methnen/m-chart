# M Chart — Version 2 Notes

## Admin UI Rewrite (Chart.js)

The chart post-edit admin screen for Chart.js charts has been rewritten in React using `@wordpress/` packages. This is a **breaking change** for library plugins that extended the jQuery-based admin.

---

## Breaking Changes for Library Plugin Authors

### JavaScript Events Replaced by wp.hooks

The jQuery custom events fired on `.m-chart` elements are no longer used for Chart.js charts. Replace them with WordPress JS hooks.

#### chart_args_success

**Before:**
```js
$( '.m-chart' ).on( 'chart_args_success', function( event ) {
    const chartArgs = event.response.data;
    // ...
} );
```

**After:**
```js
wp.hooks.addAction( 'm_chart.chart_args_success', 'my-plugin', function( chartArgs, postId ) {
    // chartArgs — the new Chart.js args object
    // postId    — the current post ID
} );
```

#### render_done

**Before:**
```js
$( '.m-chart' ).on( 'render_done', function( event ) {
    const chart = event.chart; // Chart.js instance (old API differed)
} );
```

**After (admin):** use `wp.hooks`:
```js
wp.hooks.addAction( 'm_chart.render_done', 'my-plugin', function( postId, instance, chart ) {
    // postId   — the current post ID
    // instance — always 1 in the admin context
    // chart    — the Chart.js instance
} );
```

**After (front-end):** the jQuery event has been replaced with a native `CustomEvent` dispatched on each `.m-chart` canvas element. `post_id` and `instance` are on `event.detail`:
```js
document.querySelectorAll( '.m-chart' ).forEach( el => {
    el.addEventListener( 'render_done', ( event ) => {
        const { post_id, instance } = event.detail;
    } );
} );
```

### Settings Panel (PHP filter still exists; JS filter added)

The PHP filter `m_chart_settings_template` is unchanged and continues to control which PHP template is loaded for non-chartjs libraries. For Chart.js, settings are now rendered by a React component.

Library plugins that need to inject custom settings into the Chart.js admin panel should use the JS filter (to be wired in a future release):

```js
// Placeholder — not yet wired; contact the M Chart maintainers if you need this.
wp.hooks.addFilter( 'm_chart.settings_component', 'my-plugin', function( DefaultSettings ) {
    return MyCustomSettingsComponent;
} );
```

---

## What Did Not Change

- The **front-end chart template** (`chartjs-chart.php`) has been modernized — jQuery removed, global variables replaced with locals, and `render_done` is now a native `CustomEvent` (see above). The rendered HTML output is unchanged.
- The **Gutenberg block** is unchanged.
- The **PHP AJAX handlers** (`ajax_get_chart_args`, `ajax_import_csv`, `ajax_export_csv`) are unchanged — React calls the same endpoints.
- The **PHP save logic** (`save_post`, `validate_post_meta`) is unchanged — the form still submits all fields with the same `name="m-chart[field]"` attributes.
- **Non-chartjs libraries** (e.g. Highcharts) continue to use the legacy jQuery admin stack.

---

## Build

The admin React app source lives in `components/admin-ui-src/` and compiles to `components/admin-ui/`.

```
npm run build:admin-ui   # production build
npm run watch:admin-ui   # development watch
```

See `DEVELOPERS.md` for the full source layout and data-flow documentation.
