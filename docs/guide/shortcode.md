# Chart Shortcode

Each chart has an auto-generated shortcode shown at the top of the chart edit screen. The shortcode intelligently selects the best display format based on context.

## Default Behavior

```
[chart id="123"]
```

By default, the shortcode renders an interactive JavaScript chart. On RSS feeds and AMP pages, it automatically serves a static image instead.

## Display Options

### `show`

Controls the output format explicitly.

| Value     | Description |
|-----------|-------------|
| `default` | JavaScript chart (default); falls back to image in RSS/AMP |
| `image`   | Always renders a static image |
| `table`   | Renders the chart data as an HTML table (available since v1.5) |

**Example — force image output:**
```
[chart id="123" show="image"]
```

**Example — render as a data table:**
```
[chart id="123" show="table"]
```

### `share`

Displays an embed code box below the chart, allowing visitors to copy the shortcode and embed the chart on their own WordPress site.

```
[chart-share id="123"]
```

Available since version 1.6.

### `width`

Overrides the chart's default width.

```
[chart id="123" width="600"]
```

## Block Editor

See [Block Editor](./block.md) for documentation on embedding charts using the M Chart block.
