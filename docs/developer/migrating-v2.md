# Migrating to v2

Version 2.0 introduced breaking changes for code that extends the Chart.js admin UI or hooks into front-end chart events. This page covers what changed and how to update.

## Front-End JavaScript Events

### jQuery → native `CustomEvent`

In v1.x, M Chart dispatched jQuery custom events on the `.m-chart` container:

```js
// v1.x (no longer works)
$( '.m-chart' ).on( 'render_done', function( event, postId, instance, chart ) {
	console.log( chart );
} );
```

In v2.0+, events are native `CustomEvent` objects dispatched on the `<canvas>` element. Event data is accessed via `event.detail`:

```js
// v2.0+
document.querySelectorAll( '.m-chart canvas' ).forEach( ( canvas ) => {
	canvas.addEventListener( 'render_done', ( event ) => {
		const { post_id, instance, chart } = event.detail;
		console.log( chart );
	} );
} );
```

### `canvas_done` removed

The `canvas_done` event from v1.x has been removed with no replacement.

### New `render_start` event

A `render_start` event is now fired before rendering begins. See [JavaScript Events](./javascript-events.md).

## Admin UI JavaScript

### jQuery events removed

The admin `chart_args_success` and `render_done` jQuery custom events from v1.x have been removed. Use `wp.hooks` instead:

```js
// v1.x (no longer works)
$( document ).on( 'chart_args_success', function( event, chartArgs ) {} );

// v2.0+
wp.hooks.addAction( 'm_chart.chart_args_success', 'my-plugin', ( chartArgs ) => {} );
```

### Hooking into chart rendering

```js
// v2.0+
wp.hooks.addFilter(
	'm_chart.render_chart',
	'my-plugin/render',
	( handled, chartArgs, canvas ) => {
		// render your library here
		return true;
	}
);
```

See [Admin UI Hooks](./admin-ui-hooks.md) for the full API.

## PHP

No breaking changes to PHP hooks or the save logic in v2.0. Existing `add_action` / `add_filter` calls targeting `m_chart_chart_args`, `m_chart_after_chart_args`, and other PHP hooks continue to work unchanged.
