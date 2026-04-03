# JavaScript Events

Available since version 2.0. These are native `CustomEvent` events dispatched on the chart's `<canvas>` element on the front end.

## `render_start`

Fired on the canvas element immediately before chart rendering begins.

```js
document.querySelectorAll( '.m-chart canvas' ).forEach( ( canvas ) => {
	canvas.addEventListener( 'render_start', ( event ) => {
		const { post_id, instance } = event.detail;
		console.log( `Chart ${post_id} (instance ${instance}) is about to render` );
	} );
} );
```

**`event.detail` properties:**
- `post_id` _(int)_ — The chart post ID
- `instance` _(int)_ — The instance number (for multiple embeds of the same chart on one page)

---

## `render_done`

Fired on the canvas element after the chart has finished rendering. Includes a reference to the Chart.js chart instance.

```js
document.querySelectorAll( '.m-chart canvas' ).forEach( ( canvas ) => {
	canvas.addEventListener( 'render_done', ( event ) => {
		const { post_id, instance, chart } = event.detail;
		// `chart` is the Chart.js instance
		console.log( chart.data );
	} );
} );
```

**`event.detail` properties:**
- `post_id` _(int)_ — The chart post ID
- `instance` _(int)_ — The instance number
- `chart` _(object)_ — The Chart.js chart instance

::: tip Highcharts
These same events (`render_start`, `render_done`) are also dispatched when the M Chart Highcharts Library plugin is active. The `chart` property in `render_done` will be the Highcharts chart instance rather than a Chart.js instance. See [Highcharts JavaScript Events](../highcharts/javascript-events.md) for Highcharts-specific details.
:::

::: tip Migrating from v1
In v1.x these events were jQuery custom events (`.on('render_done', ...)`). In v2.0+ they are native `CustomEvent` events dispatched on the canvas element. Event data is accessed via `event.detail` rather than the jQuery handler arguments. See [Migrating to v2](./migrating-v2.md).
:::
