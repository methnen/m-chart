# Themes

Available since version 1.8 (Chart.js).

Themes control the color palette and point styles used by Chart.js charts. The active default theme is selected in **Chart → Settings**.

## Built-in Themes

M Chart ships with four themes:

| Theme | Description |
|-------|-------------|
| **Chart.js** | Uses the default Chart.js 4.x color palette |
| **Chart.js 3.x** | Uses the default Chart.js 3.x color palette |
| **Color Blind Safe** | A palette designed to be distinguishable for users with common forms of color blindness |
| **Highcharts 4.x** | Approximates the default color scheme from Highcharts 4 |

## Custom Themes

Create custom themes by adding PHP files to an `m-chart-chartjs-themes` directory inside your active WordPress theme folder:

```
wp-content/themes/your-theme/
└── m-chart-chartjs-themes/
    └── my-theme.php
```

A theme file returns an array with `colors` and optionally `points`:

```php
<?php

/**
 * Theme Name: My Custom Theme
 */

return [
	'colors' => [
		'#e63946',
		'#457b9d',
		'#2a9d8f',
		'#e9c46a',
		'#f4a261',
		'#264653',
	],
];
```

### Point Styles

Optionally customize the point markers used on line/scatter charts:

```php
<?php

/**
 * Theme Name: My Custom Theme
 */

return [
	'colors' => [ '#e63946', '#457b9d' ],
	'points' => [
		[ 'point' => [ 'pointStyle' => 'circle' ] ],
		[ 'point' => [ 'pointStyle' => 'rect' ] ],
		[ 'point' => [ 'pointStyle' => 'triangle' ] ],
	],
];
```

Once your file is in place, the theme will appear in the theme selector on each chart edit screen and in the default theme setting.

## Per-Chart Theme

Each chart can use a different theme regardless of the site-wide default. Select the theme in the **Theme** dropdown on the chart edit screen.
