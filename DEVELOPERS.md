# Developer Instructions #

## Build Environment Install ##

`npm install`

## Build Commands ##

Build everything:

```
npm run build
```

Build CSS only:

```
npm run build:css
```

Build JS (minify helpers):

```
npm run build:js
```

Build block only:

```
npm run build:block
```

Build admin React app only:

```
npm run build:admin-ui
```

Convert readme.txt to README.md:

```
npm run build:readme
```

## Watch Commands ##

Watch everything (CSS, JS, block, and admin app):

```
npm run watch
```

Watch admin app only:

```
npm run watch:admin-ui
```

## Deployment ##

Deploy to WordPress.org via GitHub Actions:

Actions tab → "Deploy to WordPress.org" → "Run workflow"

---

## Admin UI Architecture ##

The chart post-edit screen uses a React app (`components/admin-ui-src/`) compiled to `components/admin-ui/` by `@wordpress/scripts`.

### Source layout

```
components/admin-ui-src/
  index.js                    Entry point — mounts portals into each meta box div
  context/
    ChartAdminContext.js       Single shared reducer (all components read/write here)
  hooks/
    useChartRefresh.js         Debounced AJAX fetch for updated chart args
    useImageGeneration.js      Captures Chart.js canvas → base64 PNG → hidden textarea
    useLongPress.js            500ms pointer-event long-press (tab rename on mobile)
  components/
    ChartMetaBox.js            Root for the Chart meta box (preview + settings)
    ChartPreview.js            Imperative Chart.js instance managed via refs
    ChartSettings.js           Settings form container
    TypeAndThemeRow.js         Type / Theme / Height inputs
    ParseAndFlagsRow.js        Parse direction, Labels, Legend, Shared tooltip
    AxisRows.js                Vertical/horizontal axis title + units, Y-min
    ShortcodeAndImageRow.js    Shortcode display, image URL, library hidden input
    SpreadsheetMetaBox.js      Root for the Data meta box
    SheetTabs.js               Tab bar (conditionally shown for multi-sheet types)
    SheetTab.js                Individual tab — click/dblclick/long-press rename, delete
    JspreadsheetWrapper.js     Thin imperative wrapper around a Jspreadsheet worksheet
    CsvControls.js             CSV import (fetch + FormData) and export (temp form POST)
    SubtitleField.js           Controlled subtitle input (replaces subtitle-field.php)
```

### Data flow

1. PHP localises initial state into `window.m_chart_admin` via `wp_localize_script`.
2. `ChartAdminContext` seeds a `useReducer` from that object — all components share one context.
3. User changes (settings, spreadsheet, title, subtitle) update context state.
4. `useChartRefresh` debounces 300 ms then POSTs to `admin-ajax.php?action=m_chart_get_chart_args`.
5. The response updates `chartArgs` in context; `ChartPreview` patches its Chart.js instance.
6. On form submit, `SpreadsheetMetaBox` serialises all sheet data to the hidden `textarea[name="m-chart[data]"]`.

### Mount points (PHP)

| PHP method | Mount div | Component |
|---|---|---|
| `edit_form_before_permalink()` | `#m-chart-subtitle-root` | `<SubtitleField />` |
| `spreadsheet_meta_box()` | `#m-chart-spreadsheet-root` | `<SpreadsheetMetaBox />` |
| `chart_meta_box()` | `#m-chart-chart-root` | `<ChartMetaBox />` |

All three share a single `ChartAdminProvider` rendered into a hidden container appended to `<form id="post">`, with portals projecting into each mount div.

### Non-chartjs libraries

Libraries other than Chart.js (e.g. Highcharts via the M Chart Highcharts Library plugin) continue to use the legacy jQuery + Handlebars admin stack (`m-chart-admin.js`, `handlebars.php`, `subtitle-field.php`, `spreadsheet-meta-box.php`). The PHP enqueue logic in `current_screen()` branches on `$library` to load the correct stack.

### Extensibility (wp.hooks)

See `version-2-notes.md` for the full list of JavaScript hooks available to library plugin authors.
