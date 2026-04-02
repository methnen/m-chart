# CSV Import & Export

M Chart supports importing and exporting chart data as CSV files.

![CSV Controls](/m-chart/ui/csv.png)

## Exporting

Click the **Export** button below the spreadsheet to download the current chart data as a `.csv` file.

## Importing

Click the **Import** button below the spreadsheet and select a CSV file from your computer. The data will replace the current spreadsheet contents.

### Delimiter

By default, M Chart uses a comma (`,`) as the CSV delimiter. If your CSV uses a different delimiter (e.g. semicolons or tabs), you can:

1. **Override per-import** — A delimiter option appears on the import dialog, allowing you to specify a different character for that import.
2. **Change the default** — Set a site-wide default delimiter in **Settings → M Chart**.

![CSV Controls](/m-chart/ui/csv-import.png)

## Tips

- The first row and/or first column of your CSV become the chart labels, depending on your data format. See [Creating a Chart](./creating-a-chart.md) for how label detection works.
- Values with currency symbols (`$`, `£`) or unit suffixes (`%`, `°C`, `K`, `M`, `B`, `T`) are parsed correctly — the symbol is preserved in tooltips while the numeric value is used for the chart.
