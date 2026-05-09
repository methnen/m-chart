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

## Running Tests ##

This plugin has automated tests across four layers — PHP unit, PHP integration, JS unit, and Playwright E2E. All test materials live under `/tests/` at the repo root.

### One-time setup

```bash
composer install        # PHP dev dependencies (PHPUnit, Brain Monkey, etc.)
npm ci                  # JS dev dependencies (Jest, Playwright, wp-env)
npx playwright install  # Playwright browser binaries (only needed once per machine)
```

### PHP unit tests (Brain Monkey, no WP)

Fast, no Docker, runs against the source directly:

```bash
composer test:unit
```

Covers `M_Chart_Parse`, `M_Chart_Parsed_Data_Point`, `clean_labels()` (Wordfence M-Chart-194 CVE regression), and `neutralize_csv_cell()`.

### PHP integration tests (full WP via wp-env)

Requires Docker. Spins up a real WP install with the plugin active and runs against a real MariaDB:

```bash
npx wp-env start
npx wp-env run tests-cli --env-cwd=wp-content/plugins/m-chart \
    vendor/bin/phpunit --testsuite integration
```

Covers the save_post pipeline, CSV import/export AJAX, the REST API permission callbacks, and a Contributor-role end-to-end XSS regression test.

### JS unit tests (Jest)

```bash
npm run test:js              # one-shot
npm run test:js:watch        # interactive
npm run test:js:coverage     # with coverage report
```

Covers the `ChartAdminContext` reducer (every action type) and `useChartRefresh` race-condition guards.

### E2E tests (Playwright)

The `pretest:e2e` script runs `npm run build` and starts wp-env automatically:

```bash
npm run test:e2e             # all chromium specs
npm run test:e2e:ui          # interactive Playwright UI
npm run test:a11y            # axe-core accessibility gate
```

For the visual-regression suite (Tier 3), see `tests/e2e/visual/` and `npm run test:e2e:visual`.

### CVE regression suite

The Wordfence M-Chart-194 stored-XSS CVE has dedicated regression tests at three layers:
- `tests/php/unit/CleanLabelsTest.php` — pure-function payload neutralization
- `tests/php/integration/XssRegressionTest.php` — Contributor-role end-to-end render
- `tests/e2e/security-regression-xss.spec.js` — real browser execution check

If `M_Chart_Parse::clean_labels()` ever regresses to a state that lets `<script>` tags through, all three fail loudly. Tag: `@security`.

### Linting

The project uses `@wordpress/scripts` ESLint config with Prettier formatting rules disabled (`.eslintrc.json`). Lint scope is restricted to source directories — `components/admin-ui-src/`, `components/block-src/`, `components/js/m-chart-chartjs-helper.js`, `tests/js/`, `tests/e2e/` — to avoid choking on vendored libraries in `components/external/` and compiled webpack output in `components/admin-ui/` / `components/block/`.

```sh
npm run lint:js              # one-shot lint
npm run lint:js:fix          # auto-fix what's safe to auto-fix
npm run lint:js:watch        # re-lint on file save
```

There are pre-existing ESLint errors in older source files (no-var, eqeqeq, missing JSDoc descriptions, etc.) that surfaced once the lint step was unhung. They will be cleaned up incrementally — the lint job in CI flags them but isn't a hard block.

### CI

Three GitHub Actions workflows under `.github/workflows/`:
- `test-php.yml` — PHP unit + integration matrix (PHP 8.1/8.2/8.3 × WP 6.5/6.6/6.7/trunk)
- `test-js.yml` — Jest + ESLint
- `test-e2e.yml` — Playwright (chromium on PR, full firefox/webkit nightly)

---

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

- **`CsvControls.js` — file input.** Triggered programmatically via `fileInputRef.current.click()`. Visually-hidden via `screen-reader-text` class so it remains accessible to screen readers. `FormFileUpload` has different semantics.
- **`ShortcodeAndImageRow.js` — `<input type="hidden">` for the library name.** Not a UI element; hidden inputs have no component counterpart.

## Accessibility

This plugin targets WCAG 2.1 Level AA. A few things to know when extending or maintaining it:

### Data entry for screen-reader users

Screen-reader users should use **CSV Import** as the primary data-entry path. The Jspreadsheet CE library used in the spreadsheet UI provides partial keyboard accessibility but is not fully WCAG-compliant in forms mode. CSV import handles the same data shapes and is fully accessible.

### `m_chart_screen_reader_text` action

Fires inside the visually-hidden context container after the auto-emitted data table for every chart render (canvas, image, AMP). Use it to inject additional context — methodology notes, trend descriptions, alt-text-style summaries — that helps screen-reader users understand the chart beyond the raw data values.

```php
add_action( 'm_chart_screen_reader_text', function ( $post_id, $args ) {
    $note = get_post_meta( $post_id, 'chart_a11y_note', true );

    if ( $note ) {
        echo '<p>' . esc_html( $note ) . '</p>';
    }
}, 10, 2 );
```

### Heading hierarchy

The React admin UI sits inside meta-box `<h2>` elements provided by WordPress core. When inserting headings inside React components, level them appropriately (typically `<h3>` or `<h4>`) so the document outline stays sensible.

### Status announcements

The admin UI uses `wp.a11y.speak()` from `@wordpress/a11y` for transient status announcements (chart refreshed, sheet renamed, CSV imported, shortcode copied, etc.). Library plugin authors hooking into the React data-flow should consider doing the same.
