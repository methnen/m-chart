# Radar & Radar Area Charts

Available since version 1.8.

Radar charts (also called spider or web charts) plot multiple variables on axes radiating from the center point, making it easy to compare profiles across several dimensions.

**Radar Area** is the same chart with the polygon area filled.

## Data Format

Radar charts use the same single-series data format as pie charts:

- **Column 1** contains the axis labels (the "spokes" of the web)
- **Column 2** contains the values

<table>
	<tbody>
		<tr>
			<td>Speed</td>
			<td>85</td>
		</tr>
		<tr>
			<td>Strength</td>
			<td>70</td>
		</tr>
		<tr>
			<td>Accuracy</td>
			<td>90</td>
		</tr>
		<tr>
			<td>Endurance</td>
			<td>60</td>
		</tr>
        <tr>
			<td>Agility</td>
			<td>78</td>
		</tr>
	</tbody>
</table>

## Multiple Datasets

Radar charts support multiple datasets via the sheet tab interface. Each sheet becomes a separate polygon overlaid on the same chart. This is useful for comparing multiple subjects across the same set of variables.

Sheet 1 (Player A):

<table>
	<tbody>
		<tr>
			<td>Speed</td>
			<td>85</td>
		</tr>
		<tr>
			<td>Strength</td>
			<td>70</td>
		</tr>
		<tr>
			<td>Accuracy</td>
			<td>90</td>
		</tr>
	</tbody>
</table>

Sheet 2 (Player B):

<table>
	<tbody>
		<tr>
			<td>Speed</td>
			<td>72</td>
		</tr>
		<tr>
			<td>Strength</td>
			<td>88</td>
		</tr>
		<tr>
			<td>Accuracy</td>
			<td>65</td>
		</tr>
	</tbody>
</table>

The sheet name is used as the series label in the legend.
