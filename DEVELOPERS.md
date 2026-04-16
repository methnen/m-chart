# Developer Instructions #

## Documentation ##

Full user and developer documentation is available at **https://docs.mch.art/**. The developer section covers PHP hooks, JavaScript events, and the admin UI hooks API.

## Build Environment Install ##

```
npm install
```

> **Note:** `package.json` includes a `postinstall` script that runs `npm run build` automatically after `npm install` completes. This means a full build will fire on first install — this is expected.

## Build Commands ##

Build everything:

```
npm run build
```

Build CSS only:

```
npm run build:css
```

Build JS (minifies `components/js/m-chart-chartjs-helper.js`):

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

Watch everything (CSS, JS, block, admin app, and readme):

```
npm run watch
```

Individual watch targets are also available:

| Command | Watches |
|---------|---------|
| `npm run watch:admin-ui` | React admin app |
| `npm run watch:block` | Gutenberg block |
| `npm run watch:css` | SCSS → CSS |
| `npm run watch:js` | `m-chart-chartjs-helper.js` |
| `npm run watch:readme` | `readme.txt` → `README.md` |

## Translations (i18n) ##

To create a new .pot file with any new string run:

```
wp i18n make-pot . components/languages/m-chart.pot
```

PHP translations use `.po` / `.mo` files managed in Poedit. JavaScript translations require additional steps because `wp-scripts` bundles multiple source files into a single compiled file, and WordPress needs handle-named JSON files to load them.

All locale files (`.po`, `.mo`, `.l10n.php`) live in `components/languages/`.

### Workflow

1. Open the `.po` file for the locale you are updating (e.g. `components/languages/m-chart-zh_CN.po`) in Poedit.
2. Go to Translation -> Update from POT file...
  - Do not choose Update from Source Code it will fail to retrieve everything and your tanslation will be missing necessary items
3. Translate any new or updated strings.
4. Save in Poedit (this generates the `.mo` and `.l10n.php` files automatically).
5. Generate per-source-file JSON translation files:

```
wp i18n make-json components/languages/m-chart-zh_CN.po --no-purge
```

6. Merge the hash-based JSON files into handle-named files that WordPress can find:

```
npm run build:i18n
```

Repeat steps 1–6 for each locale.

### Why the merge step is needed

`wp i18n make-json` generates one JSON file per source file, named with the md5 hash of the source path (e.g. `components/admin-ui-src/components/AxisRows.js`). However, WordPress looks up translations using the md5 hash of the *compiled* file path (e.g. `components/admin-ui/index.js`). Since these hashes don't match, WordPress falls back to looking for `{domain}-{locale}-{handle}.json`. The `build:i18n` script merges the per-source-file JSONs into these handle-named files:

- `m-chart-{locale}-m-chart-admin-ui.json` — admin UI translations
- `m-chart-{locale}-m-chart-editor.json` — block editor translations

### Poedit configuration

Each `.po` file includes Poedit search path headers so that source scanning works correctly. These should exclude:

- `*.min.js` — minified files (duplicates of source)
- `node_modules` — third-party dependencies
- `components/external` — vendored libraries

If creating a new locale, copy these headers from an existing `.po` file (e.g. `m-chart-en_US.po`).

## Deployment ##

Deploy to WordPress.org via GitHub Actions:

Actions tab → "Deploy to WordPress.org" → "Run workflow"

Before triggering the workflow:
- Bump the version number in `m-chart.php`, `class-m-chart.php`, and `readme.txt`
- Run `npm run build` and commit all compiled assets
- Run `npm run build:readme` and commit the updated `README.md`
- Target the `main` branch when running the workflow

---

## Admin UI Architecture ##

The chart post-edit screen uses a React app (`components/admin-ui-src/`) compiled to `components/admin-ui/` by `@wordpress/scripts`. As of v2.0 the React admin UI is used for all charting libraries — the previous jQuery + Handlebars stack has been removed.

### Source layout

```
components/admin-ui-src/
  index.js                    Entry point — mounts portals into each meta box div
  context/
    ChartAdminContext.js       Single shared reducer (all components read/write here)
  hooks/
    useChartRefresh.js         Debounced AJAX fetch for updated chart args
    useFormSubmissionGuard.js  Gates Save/Publish buttons on state.formEnabled; blocks
                               form submission while a chart refresh is in flight
    useImageGeneration.js      Captures Chart.js canvas → base64 PNG → hidden textarea
    useLongPress.js            500ms pointer-event long-press (tab rename on mobile)
  utils/
    measureTextWidth.js        Canvas-based text measurement utility
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

1. PHP localises initial state into `window.m_chart_admin` via `wp_localize_script` (see `current_screen()` in `class-m-chart-admin.php`). The object contains: plugin metadata (`slug`, `version`), settings (`performance`, `image_support`, `image_multiplier`, etc.), the active `library`, chart post meta, spreadsheet data, available chart types and themes, a nonce, the AJAX URL, and initial chart args.
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

### Library plugins

Library plugins (e.g. M Chart Highcharts Library) integrate with the React admin UI via the `wp.hooks` API:

- **`m_chart_admin_scripts` action** — enqueue library-specific scripts after M Chart's scripts are loaded
- **`m_chart.render_chart` filter** — handle chart rendering in the admin preview, returning `true` to prevent the default Chart.js renderer from running
- **`m_chart.settings_component` filter** — replace the default Chart.js settings UI with a library-specific React component

See `version-2-notes.md` for the full list of available hooks.

### Extensibility (wp.hooks)

See `version-2-notes.md` for the full list of JavaScript hooks available to library plugin authors.

### Native form elements

The following elements are intentionally kept as native HTML and are **not** candidates for `@wordpress/components` swaps:

- **`CsvControls.js` — hidden file input.** Triggered programmatically via `fileInputRef.current.click()`. `FormFileUpload` has different semantics.
- **`CsvControls.js` — anchor-style buttons** (`Select File`, `Import`, `Export`, `Cancel`). These are `<a>` elements styled as `.button` with SCSS rules targeting `#m-chart-csv .button`. Converting to `Button` would require a full SCSS rework for minimal benefit.
- **`ShortcodeAndImageRow.js` — `<input type="hidden">` for the library name.** Not a UI element; hidden inputs have no component counterpart.
