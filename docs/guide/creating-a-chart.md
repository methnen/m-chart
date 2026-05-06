# Creating a Chart

Charts are created as a custom post type in the WordPress admin. Navigate to **M Chart → Add New** to create one.

## The Spreadsheet Interface

Data is entered in a spreadsheet-style editor. You can type values directly into cells or [import a CSV file](./csv.md).

![Spreadsheet Interface](/m-chart/ui/data.png)

### Multi-Series Charts (Line, Spline, Area, Column, Bar)

For charts with multiple data series, organize your data so that:

- The **top-left cell is empty**
- **Column headers** (row 1, starting at column 2) are the x-axis labels
- **Row headers** (column 1, starting at row 2) become the series names shown in the legend
- **Data values** fill the remaining cells

**Example:**

<table>
    <tbody>
        <tr>
            <td></td>
            <td>Jan</td>
            <td>Feb</td>
            <td>Mar</td>
        </tr>
        <tr>
            <td>Dogs</td>
            <td>10</td>
            <td>14</td>
            <td>12</td>
        </tr>
        <tr>
            <td>Cats</td>
            <td>8</td>
            <td>11</td>
            <td>15</td>
        </tr>
    </tbody>
</table>

### Single-Series Charts (Pie, Doughnut, Polar)

For single-series charts, the top-left cell contains the first label — there is no empty corner cell:

- **Column 1** contains the category labels
- **Column 2** contains the values

**Example:**

<table>
    <tbody>
        <tr>
            <td>Dogs</td>
            <td>42</td>
        </tr>
        <tr>
            <td>Cats</td>
            <td>28</td>
        </tr>
        <tr>
            <td>Fish</td>
            <td>15</td>
        </tr>
    </tbody>
</table>

::: tip
This single-series data format also works for multi-series chart types (line, bar, etc.) when you only have one data series. M Chart detects the format automatically.
:::

## Chart Settings

Below the spreadsheet and directly below the live preview you'll find the chart settings.

![Chart Settings](/m-chart/ui/chart-preview-settings.png)

You'll find settings for:

- **Chart Type** — Select from all [supported chart types](./chart-types.md)
- **Parse data in** — Whether to parse data by rows or columns (default: rows)
- **Theme** — Visual color theme
- **Legend** — Show or hide the chart legend
- **Shared Tooltip** — Show all series values in a single tooltip (line/area/spline/radar only)
- **X Axis Title / Y Axis Title** — Optional axis labels
- **X Axis Units / Y Axis Units** — Optional unit labels appended to axis titles (also populates a taxonomy)
- **Force vertical axis minimum** — Locks the y-axis minimum to 0

## Embedding

Each chart has an auto-generated shortcode shown at the bottom of the Chart Settings that can be copied and pasted into your posts. See [Shortcode](./shortcode.md) for embedding options. You can alternately use the [M Chart block](./block.md) in the WordPress block editor.

::: warning
If a chart is not published it will not render in your site and will not show in the Block UI.
:::