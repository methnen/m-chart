# Libraries

M Chart supports two charting libraries: **Chart.js** (default) and **Highcharts** (optional).

## Chart.js

[Chart.js](https://www.chartjs.org) is the default library and is bundled directly with M Chart. It is released under the **MIT license**, making it fully GPL-compatible and suitable for use in any WordPress project without additional licensing concerns.

As of version 1.8, Chart.js supports all chart types and settings previously available in the Highcharts version of this plugin except for the Source and Source URL values.

## Highcharts

[Highcharts](https://www.highcharts.com) is available via the separate **[M Chart Highcharts Library](https://github.com/methnen/m-chart-highcharts-library)** plugin. Install and activate that plugin alongside M Chart to enable Highcharts as a library option in the M Chart settings.

::: warning Highcharts Licensing
Highcharts now requires a commercial license for use on many websites. Review the [Highcharts licensing page](https://www.highcharts.com/blog/products/highcharts/) before using it in production. I now recommend Chart.js for most users due to Highcharts' increasingly strict and expensive licensing terms.
:::

## Switching Libraries

The default library is selected in the **M Chart Settings** page (`Settings → M Chart`). All charts on the site use the library they were created in. Switching libraries does not migrate chart data, but the underlying data format is compatible meaning you can copy/paste the data from a Highcharts chart and use it in a Chart.js chart of the same type.