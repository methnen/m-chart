# Highcharts Admin UI Hooks

Available since version 1.3. The M Chart Highcharts Library plugin uses the `wp.hooks` API to replace the default Chart.js admin interface with Highcharts-specific behavior.

## Filter Hooks

### `m_chart.render_chart`

The Highcharts Library plugin uses this filter to intercept chart rendering in the admin preview and render the chart using Highcharts instead of Chart.js.

If you are building on top of the Highcharts Library, you can use this same filter at a higher priority. Return `true` to signal that rendering has been handled:

```js
wp.hooks.addFilter(
	'm_chart.render_chart',
	'my-plugin/render',
	( handled, chartArgs, canvas ) => {
		if ( handled ) {
			return handled;
		}
		// Custom Highcharts rendering
		return true;
	},
	20 // Run after the Highcharts Library's handler (priority 10)
);
```

---

### `m_chart.settings_component`

The Highcharts Library uses this filter to replace the Chart.js settings panel with a Highcharts-specific settings UI that includes:

- Theme selection
- Decimal indicator
- Thousands separator
- Numeric symbols

To extend the Highcharts settings panel, filter the component at a higher priority:

```js
wp.hooks.addFilter(
	'm_chart.settings_component',
	'my-plugin/settings',
	( HighchartsSettingsComponent ) => MyExtendedComponent,
	20
);
```

## Front-End Events

Highcharts renders on the front end also dispatch the standard M Chart [JavaScript Events](../developer/javascript-events.md) (`render_start`, `render_done`) on the canvas element, with the Highcharts chart instance included in `event.detail.chart`.
