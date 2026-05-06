# Admin UI JavaScript Hooks

Available since version 2.0. The React-based chart admin UI uses the WordPress `wp.hooks` API for extensibility. Library plugins (e.g. M Chart Highcharts Library) use these hooks to replace or augment the default Chart.js interface.

## Filter Hooks

### `m_chart.render_chart`

Filters chart rendering in the admin preview. Return `true` to signal that your code has handled rendering, preventing the default Chart.js renderer from running. Return `false` (or the value of `handled`) to pass through to the next filter or to Chart.js.

```js
wp.hooks.addFilter(
	'm_chart.render_chart',
	'my-plugin/render',
	( handled, canvas, chartArgs, onComplete, existingInstance ) => {
		if ( handled ) {
			return handled;
		}

		// Destroy the previous instance before creating a new one
		if ( existingInstance ) {
			existingInstance.destroy();
		}

		// Render your own chart on `canvas` using `chartArgs`, then call `onComplete`
		const instance = MyLibrary.render( canvas, chartArgs );
		onComplete( instance );

		return true; // Prevent Chart.js from also rendering
	}
);
```

**Parameters passed to the filter:**
- `handled` _(bool)_ — Whether a previous filter already handled rendering
- `canvas` _(HTMLCanvasElement)_ — The canvas element to render into
- `chartArgs` _(object)_ — The full chart arguments object from the server
- `onComplete` _(function)_ — Callback to invoke with the chart instance after rendering is complete; M Chart uses this to store the instance reference
- `existingInstance` _(object|null)_ — The previous chart instance, if any; call `.destroy()` on it before creating a new one to avoid memory leaks

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

---

### `m_chart.spreadsheet_metabox_extension`

Filters the content rendered between the sheet tabs and the spreadsheet grid in the spreadsheet meta box. Return a React element to inject custom UI into that area, or return `null` (the default) to render nothing.

```js
wp.hooks.addFilter(
	'm_chart.spreadsheet_metabox_extension',
	'my-plugin/spreadsheet-extension',
	( content, context ) => {
		const { state, dispatch, getActiveWorksheet, setSheetDataOnWorksheet } = context;

		return wp.element.createElement(
			'div',
			{ className: 'my-plugin-extension' },
			'Custom content here'
		);
	}
);
```

**Parameters passed to the filter:**
- `content` _(null)_ — Default is `null`; return a React element or `null`
- `context` _(object)_ — Context object with the following properties:
  - `state` _(object)_ — The full `ChartAdminContext` state
  - `dispatch` _(function)_ — The `ChartAdminContext` dispatch function
  - `getActiveWorksheet` _(function)_ — Returns the current active worksheet instance
  - `setSheetDataOnWorksheet` _(function)_ — Updates the data on the active worksheet

## Action Hooks

### `m_chart.chart_args_success`

Fires after the admin successfully fetches new chart arguments from the server (after any spreadsheet or settings change).

```js
wp.hooks.addAction(
	'm_chart.chart_args_success',
	'my-plugin/on-args',
	( chartArgs, postId ) => {
		console.log( 'New chart args for post', postId, chartArgs );
	}
);
```

**Parameters:**
- `chartArgs` _(object)_ — The chart arguments returned from the server
- `postId` _(int)_ — The chart post ID

---

### `m_chart.render_done`

Fires after the chart instance has been created or updated in the admin preview.

```js
wp.hooks.addAction(
	'm_chart.render_done',
	'my-plugin/render-done',
	( chart ) => {
		// `chart` is the chart instance for the active library
		console.log( chart.data );
	}
);
```

**Parameters:**
- `chart` _(object)_ — The chart instance for the active library. This is a Chart.js instance when Chart.js is active, or a Highcharts instance when the [M Chart Highcharts Library](../highcharts/javascript-events.md) is active.
