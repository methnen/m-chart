# Settings

The M Chart settings page is located at **Chart → Settings** in the WordPress admin.

![M Chart Settings](/m-chart/ui/settings.png)

## General

### Library

Select the active charting library. **Chart.js** is the default. **Highcharts** is available if the [M Chart Highcharts Library](https://github.com/methnen/m-chart-highcharts-library) plugin is installed.

### Performance

A performance setting that allows you to either turn off image generation or additionally turn off instant previews.

::: warning
Both of the non Default options disable image generation which is required for the `show="image"` shortcode option and for the automatic image fallback in RSS/AMP contexts.
:::

### Image Multiplier

Controls the pixel density multiplier used when generating chart images. Higher values produce sharper images on high-DPI screens at the cost of larger file sizes. Default is 2.

### iFrame Embedding

Causes charts to be embedded via an iFrame (needs to be enabled to use the `share` shortcode option) and can also allow charts to more reliably work in some WordPress themes.

## Chart.js

These settings apply only when Chart.js is the active library.

### Theme

The default color theme applied to all charts. Individual charts can override this setting. See [Themes](./themes.md) for available options and how to create custom themes.

### Number Format Locale

The locale used for number formatting in chart tooltips (e.g. `en-US`, `de-DE`, `fr-FR`). Controls decimal separators and thousands grouping. Defaults to `en-US`.

## CSV

### Default Delimiter

The delimiter used when importing CSV files. Defaults to comma (`,`). Can be overridden per-import on the chart edit screen.

## Highcharts

These settings appear only when Highcharts is the active library. See the [Highcharts section](../highcharts/) for details.
