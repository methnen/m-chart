# Admin UI JavaScript Hooks

Available since version 2.0. The React-based chart admin UI uses the WordPress `wp.hooks` API for extensibility. Library plugins (e.g. M Chart Highcharts Library) use these hooks to replace or augment the default Chart.js interface.

## Filter Hooks

### `m_chart.render_chart`

Filters chart rendering in the admin preview. Return `true` to signal that your code has handled rendering, preventing the default Chart.js renderer from running.

```js
wp.hooks.addFilter(
	'm_chart.render_chart',
	'my-plugin/render',
	( handled, chartArgs, canvas ) => {
		if ( handled ) {
			return handled;
		}

		// Render your own chart on `canvas` using `chartArgs`
		MyLibrary.render( canvas, chartArgs );

		return true; // Prevent Chart.js from also rendering
	}
);
```

**Parameters passed to the filter:**
- `handled` _(bool)_ — Whether a previous filter already handled rendering
- `chartArgs` _(object)_ — The full chart arguments object from the server
- `canvas` _(HTMLCanvasElement)_ — The canvas element to render into

---

### `m_chart.settings_component`

Filters the React component rendered in the chart type/settings panel. Use this to replace the default Chart.js settings UI with a custom component (e.g. Highcharts-specific settings).

```js
wp.hooks.addFilter(
	'm_chart.settings_component',
	'my-plugin/settings',
	( DefaultComponent ) => MySettingsComponent
);
```

**Parameters:**
- `DefaultComponent` _(React component)_ — The default Chart.js settings component

---

### `m_chart.multi_sheet_types`

Filters the set of chart types that show the multi-sheet tab bar in the spreadsheet editor. By default only `scatter`, `bubble`, `radar`, and `radar-area` show multiple sheets.

```js
wp.hooks.addFilter(
	'm_chart.multi_sheet_types',
	'my-plugin/multi-sheet',
	( types ) => {
		// Add a custom type
		return new Set( [ ...types, 'my-custom-type' ] );
	}
);
```

**Parameters:**
- `types` _(Set)_ — The current set of multi-sheet chart type strings

## Action Hooks

### `m_chart.chart_args_success`

Fires after the admin successfully fetches new chart arguments from the server (after any spreadsheet or settings change).

```js
wp.hooks.addAction(
	'm_chart.chart_args_success',
	'my-plugin/on-args',
	( chartArgs ) => {
		console.log( 'New chart args:', chartArgs );
	}
);
```

**Parameters:**
- `chartArgs` _(object)_ — The chart arguments returned from the server

---

### `m_chart.render_done`

Fires after the Chart.js chart instance has been created or updated in the admin preview.

```js
wp.hooks.addAction(
	'm_chart.render_done',
	'my-plugin/render-done',
	( chart ) => {
		// `chart` is the Chart.js instance
		console.log( chart.data );
	}
);
```

**Parameters:**
- `chart` _(object)_ — The Chart.js chart instance
