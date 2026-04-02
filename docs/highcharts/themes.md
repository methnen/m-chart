# Highcharts Themes

Available since version 1.2 (Highcharts).

Custom Highcharts themes are created by adding PHP files to an `m-chart-highcharts-themes` directory inside your active WordPress theme folder:

```
wp-content/themes/your-theme/
└── m-chart-highcharts-themes/
    └── my-theme.php
```

## Built-in Themes

| Theme | Description |
|-------|-------------|
| **Highcharts 4.x (Default)** | The default Highcharts 4 color scheme |
| **Color Blind Safe** | Accessible color palette |
| **Highcharts 3.x** | Color scheme from Highcharts 3 |
| **Highcharts 2.x** | Color scheme from Highcharts 2 |

## Creating a Custom Theme

A theme file returns an array with a `name` and a Highcharts options object:

```php
<?php

/**
 * Theme Name: My Highcharts Theme
 */

return [
	'colors'  => [ '#7cb5ec', '#434348', '#90ed7d', '#f7a35c' ],
	'options' => [
		'chart' => [
			'backgroundColor' => '#ffffff',
			'style'           => [
				'fontFamily' => 'sans-serif',
			],
		],
	],
];
```

The `options` array is merged directly into the Highcharts configuration object, so most valid Highcharts options can be set here.

## Filtering Available Themes

Use the `m_chart_highcharts_available_themes` filter (available since v1.2.3) to add, remove, or modify themes programmatically:

```php
add_filter( 'm_chart_highcharts_available_themes', function( $themes ) {
	// Remove a built-in theme
	unset( $themes['highcharts-v3'] );
	return $themes;
} );
```
