# Scatter & Bubble Charts

Available since version 1.6.

## Scatter Charts

Scatter charts plot data as individual x/y coordinate pairs. Each dataset requires **two columns (or rows)** of numeric data — one for the x values and one for the y values and each column or row should start with a label.

<table>
	<tbody>
		<tr>
			<td>Label 1 (x)</td>
			<td>Label 2 (y)</td>
		</tr>
		<tr>
			<td>10</td>
			<td>5</td>
		</tr>
		<tr>
			<td>20</td>
			<td>15</td>
		</tr>
		<tr>
			<td>30</td>
			<td>25</td>
		</tr>
	</tbody>
</table>

Or alternately you could format the data with an additional label for each data point as a whole.

<table>
	<tbody>
		<tr>
            <td></td>
			<td>Label 1 (x)</td>
			<td>Label 2 (y)</td>
		</tr>
		<tr>
            <td>Something 1</td>
			<td>10</td>
			<td>5</td>
		</tr>
		<tr>
            <td>Something 2</td>
			<td>20</td>
			<td>15</td>
		</tr>
		<tr>
            <td>Something 3</td>
			<td>30</td>
			<td>25</td>
		</tr>
	</tbody>
</table>


## Bubble Charts

Bubble charts extend scatter charts with a third dimension — bubble size (radius). Each dataset requires **three columns (or rows)**: x, y, and radius.

<table>
	<tbody>
		<tr>
			<td>Label 1 (x)</td>
			<td>Label 2 (y)</td>
            <td>Label 3 (radius)</td>
		</tr>
		<tr>
			<td>10</td>
			<td>5</td>
            <td>95</td>
		</tr>
		<tr>
			<td>20</td>
			<td>15</td>
            <td>75</td>
		</tr>
		<tr>
			<td>30</td>
			<td>25</td>
            <td>30</td>
		</tr>
	</tbody>
</table>

The first column is x, the second is y, the third is the bubble radius value.

Or just like with scatter charts you could include an additional label for each data point as a whole.

<table>
	<tbody>
		<tr>
            <td></td>
			<td>Label 1 (x)</td>
			<td>Label 2 (y)</td>
            <td>Label 3 (radius)</td>
		</tr>
		<tr>
            <td>Something 1</td>
			<td>10</td>
			<td>5</td>
            <td>95</td>
		</tr>
		<tr>
            <td>Something 2</td>
			<td>20</td>
			<td>15</td>
            <td>75</td>
		</tr>
		<tr>
            <td>Something 3</td>
			<td>30</td>
			<td>25</td>
            <td>30</td>
		</tr>
	</tbody>
</table>

::: tip Bubble Sizing
Bubble radii are automatically scaled relative to each other so they fit the chart area. The tooltip will show the original (pre-scaled) value.
:::

## Multiple Sheets

Scatter and bubble charts support multiple datasets via the sheet tab interface. Each sheet represents a separate dataset/series plotted on the same chart.
