# Developer Instructions #

## Documentation ##

Full user and developer documentation is available at **https://docs.mch.art/**. The developer section covers PHP hooks, JavaScript events, and the admin UI hooks API.

## Build Environment Install ##

```
npm install
```

> **Note:** `package.json` includes a `postinstall` script that runs `npm run build` automatically, so a full build on first install is expected.

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
- **`m_chart.render_chart` filter** — handle chart rendering in the admin preview, returning your chart instance (anything other than `false`) to prevent the default Chart.js renderer from running; returning `false` on a later render hands the canvas back to Chart.js, and M Chart destroys your instance first
- **`m_chart.settings_component` filter** — replace the default Chart.js settings UI with a library-specific React component

See the [Admin UI Hooks reference](https://docs.mch.art/developer/admin-ui-hooks.html) for the full list of available hooks.

### Extensibility (wp.hooks)

See the [Admin UI Hooks reference](https://docs.mch.art/developer/admin-ui-hooks.html) for the full list of JavaScript hooks available to library plugin authors, and the [Migrating to v2 guide](https://docs.mch.art/developer/migrating-v2.html) for what changed when migrating from v1.x.

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

### Sheet tabs

The sheet tab bar looks like a row of tabs with a delete button inside each and an Add Sheet button at the start, and its markup is deliberately not that. A tab list may contain only tabs, and a tab may not contain another control, so:

- The tab list is an empty element (`.m-chart-sheet-tablist`) that claims the tabs with `aria-owns`. It does not wrap them, which keeps the Add Sheet and delete buttons out of the list
- What looks like a tab is a box (`.m-chart-sheet-tab`) holding three siblings: the tab itself (the sheet's name, `role="tab"`), that sheet's delete button, and the rename field
- The stylesheet stretches the tab over the whole box so a click anywhere on it still lands on the tab, shows the delete button first although the tab comes first in the markup (so the Tab key reaches the tab first), and draws the focus rings on the box

Don't "simplify" this back to buttons inside tabs inside a tab list. `tests/js/components/SheetTabs.test.js` and `tests/e2e/a11y/editor.spec.js` both run axe against the bar and will fail.

### Status announcements

The admin UI uses `wp.a11y.speak()` from `@wordpress/a11y` for transient status announcements (chart refreshed, sheet renamed, CSV imported, shortcode copied, etc.). Library plugin authors hooking into the React data-flow should consider doing the same.

## Translations (i18n) ##

To regenerate the .pot file with any new strings, run:

```
wp i18n make-pot . components/languages/m-chart.pot --exclude=components/admin-ui,components/block
```

The `--exclude` skips the compiled bundle directories. Without it, `make-pot` would also reference the compiled `components/admin-ui/index.js` and `components/block/index.js` (which contain the same strings as their `-src` sources). `wp i18n make-json` would then emit a stray hash-named JSON file for each of those bundle paths, and because the `build:i18n` merge step only consumes `-src`-sourced files, those `m-chart-{locale}-{md5}.json` strays would never get cleaned up.

PHP translations use `.po` / `.mo` files managed in Poedit. JavaScript translations require additional steps because `wp-scripts` bundles multiple source files into a single compiled file, and WordPress needs handle-named JSON files to load them.

All locale files (`.po`, `.mo`, `.l10n.php`) live in `components/languages/`.

### Workflow

1. Open the `.po` file for the locale you are updating (e.g. `components/languages/m-chart-zh_CN.po`) in Poedit.
2. Go to Translation -> Update from POT file...
  - Do not choose "Update from Source Code"; it fails to retrieve everything and your translation will be missing strings.
3. Translate any new or updated strings.
4. Save in Poedit (this generates the `.mo` and `.l10n.php` files automatically).
5. Generate per-source-file JSON translation files:

```
wp i18n make-json components/languages/m-chart-zh_CN.po --no-purge
wp i18n make-json components/languages/m-chart-nl_NL.po --no-purge
wp i18n make-json components/languages/m-chart-ja_JP.po --no-purge
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

This plugin has automated tests at four layers: PHP unit, PHP integration, JS unit, and Playwright E2E. All test materials live under `/tests/` at the repo root.

### One-time setup

```bash
composer install        # PHP dev dependencies (PHPUnit, Brain Monkey, etc.)
npm ci                  # JS dev dependencies (Jest, Playwright, wp-env)
npx playwright install  # Playwright browser binaries (only needed once per machine)
```

Integration and E2E tests run WordPress in Docker via wp-env, so Docker must be running first (`colima start` or Docker Desktop). The `test:e2e` / `test:a11y` scripts run a preflight check and fail with a friendly message if it isn't.

`wp-env start` handles plugin activation and pretty permalinks automatically via the `lifecycleScripts.afterStart` entry in `.wp-env.json` — the same setup runs locally and in CI.

### PHP unit tests (Brain Monkey, no WP)

Fast, no Docker, runs against the source directly:

```bash
composer test:unit
```

Covers `M_Chart_Parse`, `M_Chart_Parsed_Data_Point`, `clean_labels()` (Wordfence M-Chart-194 CVE regression), `neutralize_csv_cell()` and the chart image check. Two tests here guard the repository rather than the code: `VersionConsistencyTest` (the version is the same in every place it is written) and `VendoredLibrariesTest` (see [Vendored libraries](#vendored-libraries)).

### PHP integration tests (full WP via wp-env)

Requires Docker. Spins up a real WP install with the plugin active and runs against a real MariaDB:

```bash
npx wp-env start
npx wp-env run tests-cli --env-cwd=wp-content/plugins/m-chart \
    vendor/bin/phpunit --testsuite integration
```

Covers the save_post pipeline, CSV import/export AJAX, the block's REST routes, the settings save, shortcodes, the embed and its Content-Security-Policy, the Highcharts migration handlers, the upgrade routines, password protected charts, and a Contributor-role end-to-end XSS regression test.

New integration tests should extend `M_Chart_Integration_Test_Case` (`tests/php/integration/class-m-chart-integration-test-case.php`, loaded by the bootstrap for this tier only) rather than `WP_UnitTestCase`. `WP_UnitTestCase` restores the hook table and rolls the database back after every test but the plugin object lives on, so the base class re-registers the lazily created Chart.js hooks and resets what the plugin memoises (settings, `is_iframe`, the CSP nonce, the instance counter, the request superglobals, the current screen). It also has the shared helpers: `create_chart()`, `validated_meta()`, `render()`, `add_admin_hook()`, `start_rest_server()` and `catch_redirect()` for handlers that end in `wp_safe_redirect(); exit;`. Tests that need `WP_Ajax_UnitTestCase` can't extend it and do their own resets.

### JS unit tests (Jest)

```bash
npm run test:js              # one-shot
npm run test:js:watch        # interactive
npm run test:js:coverage     # with coverage report
```

Covers the `ChartAdminContext` reducer (every action type), the hooks, the editor components (sheet tabs, CSV controls, type and theme, the submit gate), the block's edit component, and the front-end helper through the Chart.js plugin hooks it exposes. `jest.config.js` sets a coverage floor a few points under what the suite measures.

### E2E tests (Playwright)

```bash
npm run test:e2e             # every spec in every installed browser, then the site settings tests (reuses a running wp-env, starts one if needed)
npm run test:e2e -- --project=chromium   # the fast loop: Chromium only, without the site settings tests
npm run test:e2e:ui          # interactive Playwright UI
npm run test:a11y            # axe-core accessibility suite only (tests/e2e/a11y)
npm run test:e2e:full        # one-shot: build assets + start wp-env + run everything
npm run test:e2e:site-settings  # only the settings page and embed tests, on their own
npm run test:package         # build the release zip and check what is in it
```

`test:e2e` does NOT rebuild assets. After changing plugin source, run `npm run build` first, or use `test:e2e:full`. wp-env is left running between test runs so iteration stays fast; stop it with `npm run wp-env stop` when you're done.

What the specs in `tests/e2e/` cover:

| Spec | Covers |
|---|---|
| `chart-create.spec.js` | A chart built from Charts → Add New: typing cells, changing type, publishing, reopening, the public page, and `show="image"` |
| `chart-edit-flow.spec.js` | A seeded chart on the front end, `show="table"`, and the edit screen mounting |
| `csv.spec.js` | Importing a file through the editor and the bytes the Export button downloads |
| `sheets.spec.js` | Adding, renaming and deleting sheet tabs |
| `block.spec.js` | The chart block: search, pick, the Show setting, publish |
| `chart-types.spec.js` | Every chart type draws in a real browser, using the example charts in `tests/fixtures/charts/pickle-*.json` (it fails if a type is added without an example) |
| `security-regression-xss.spec.js` | Stored payloads never execute, including a real Contributor typing them into the editor |
| `submit-gate-regression.spec.js` | The save waits for an in-progress cell edit and a fresh chart image |
| `site-settings.spec.js` | The settings page and the iframe embed, see below |
| `a11y/` | axe-core scans, see below |

Things worth knowing when writing one:

- `tests/e2e/fixtures.js` has the helpers. `chartFactory` seeds a chart with one WP-CLI call and `postFactory` makes a post to carry a shortcode; both delete what they made. `chartFactory` writes the meta row directly, it does not go through the plugin's save, so give text fields (subtitle, axis titles, source) in their stored, HTML-encoded form. To exercise the save, build the chart through the editor with `awaitChartEditor()` and `typeIntoCell()` and register it with the `cleanup` fixture.
- WP-CLI calls are the slow part and are queued across workers, so use `createCharts()` when a test needs many charts.
- Tests start signed in as the admin. The `contributorPage` and `editorPage` fixtures give a page signed in as that role, in its own browser context. The users are made once in `tests/e2e/global-setup.js`.
- `site-settings.spec.js` changes settings for the whole site (switching embeds on turns every chart on every page into an iframe), so it cannot run beside the other specs. It has its own Playwright project, `site-settings`, which depends on the others: a plain `npx playwright test` runs it last, `--project=chromium` leaves it out, and `npx playwright test --project=site-settings --no-deps` runs it alone. It puts the settings back when it finishes. Anything else that changes site-wide state belongs in that file.
- Running the PHP integration suite resets the same tests database: the plugin and theme end up inactive and permalinks unset. Before the next E2E run, re-run the `tests-cli` commands from `lifecycleScripts.afterStart` in `.wp-env.json`, or `npx wp-env start` again.

### Accessibility tests (axe-core)

`tests/e2e/a11y/` scans the plugin's own markup against the WCAG 2.1 A/AA axe rule set:

- `frontend.spec.js` — the rendered chart region (canvas ARIA wiring, screen-reader summary/table/source link) and the `show="table"` output
- `editor.spec.js` — the chart edit screen's React mounts (the Jspreadsheet grid internals are excluded; the CSV Import flow is the accessible data-entry path)

These run as part of the regular chromium E2E pass in CI. Tag: `@a11y`.

### CVE regression suite

The Wordfence M-Chart-194 stored-XSS CVE has dedicated regression tests at three layers:
- `tests/php/unit/CleanLabelsTest.php` — pure-function payload neutralization
- `tests/php/integration/XssRegressionTest.php` — Contributor-role end-to-end render
- `tests/e2e/security-regression-xss.spec.js` — real browser execution check, ending with a Contributor typing the payloads into the editor and an administrator opening the result

If `M_Chart_Parse::clean_labels()` ever regresses to a state that lets `<script>` tags through, all three fail loudly. Tag: `@security`.

### Special characters test chart

For checking by eye how awkward text renders, there is a chart with every kind of it (ampersands, angle brackets, quotes, typed entities, typed tags, accents, non-Latin script, backslashes, dashes) in the title, subtitle, both axis titles, the source, the sheet name, the series names and the labels, and a page that shows the chart and its table together.

```bash
# A wp-env site ("cli" is the development site, "tests-cli" the tests site)
npx wp-env run cli wp eval-file wp-content/plugins/m-chart/tests/bin/special-characters-chart.php

# Any other local site, such as a MAMP one WP-CLI can't reach (use a PHP that can reach its database)
php tests/bin/special-characters-chart.php /path/to/wordpress [host name]
```

It prints the chart's address, its edit screen and the page. Running it again refreshes the same chart and page, so use it after a database reset or after changing the text.

The text lives in `tests/fixtures/charts/special-characters.json`, written as a person would type it, and the script saves it through the plugin's own save. The strings are the same set `TextAsTypedTest` runs through every field, and `SpecialCharactersFixtureTest` checks the chart built from the fixture shows each one exactly as typed.

The chart's title shows curly quotes where straight ones were typed. That is WordPress's own typography for post titles, not the plugin.

### Linting

The project uses `@wordpress/scripts` ESLint config with Prettier formatting rules disabled (`.eslintrc.json`). Lint scope is restricted to source directories — `components/admin-ui-src/`, `components/block-src/`, `components/js/m-chart-chartjs-helper.js`, `tests/js/`, `tests/e2e/` — to avoid choking on vendored libraries in `components/external/` and compiled webpack output in `components/admin-ui/` / `components/block/`.

```sh
npm run lint:js              # one-shot lint
npm run lint:js:fix          # auto-fix what's safe to auto-fix
npm run lint:js:watch        # re-lint on file save
```

### CI

Five GitHub Actions workflows under `.github/workflows/`:
- `test-php.yml` — PHP unit matrix (PHP 8.1–8.5, which also parses every PHP file on each version) + integration matrix
- `test-js.yml` — Jest + ESLint
- `test-e2e.yml` — Playwright including the a11y suite
- `package.yml` — builds the release zip with `npm run build:zip`, checks its contents with `tests/bin/check-package.js`, keeps the zip as an artifact, and runs WordPress's Plugin Check on it (report only)
- `deploy.yml` — manual WordPress.org deploy, gated on all four of the above

The test workflows run on pushes to `main`, on every pull request, by hand from the Actions tab (`workflow_dispatch`, against any branch), and when the deploy calls them. A new push to a pull request cancels the run before it.

The integration matrix is a list of pairings chosen for a reason, not a full cross product:

| PHP | WordPress | Why |
|---|---|---|
| 8.1 | 6.6 | The oldest of each that `readme.txt` says is supported, change both together |
| 8.2 | 6.8 | Older pairings sites are still on |
| 8.3 | 7.0 | |
| 8.4 | latest release | Collects clover coverage inside the wp-env container and uploads it to Codecov |
| 8.5 | latest release | The newest PHP |
| 8.4 | trunk | Early warning. Reports without failing the run, a trunk break is rarely ours |

"Latest release" is looked up from api.wordpress.org when the workflow runs (`tests/bin/wp-core-ref.js`), so nothing needs editing when WordPress ships a version.

End-to-end tests run Chromium against the latest WordPress release on pushes and pull requests. The nightly run adds Firefox and WebKit, one Chromium run against trunk, and `--fail-on-flaky-tests`, so a test that only passes on a retry turns the nightly red instead of going unnoticed. `.wp-env.json` itself still points at trunk for local work; CI overrides it with `WP_ENV_CORE`.

Every job installs with `npm ci --ignore-scripts`, which skips the `postinstall` build, and the jobs that need built assets run `npm run build` themselves. Third-party actions are pinned to a commit with the version in a comment; Dependabot updates them.

Codecov uploads need a `CODECOV_TOKEN` repository secret.

---

## Styling overrides ##

m-chart exposes its color palette as CSS custom properties on `:root`, so themes and library plugins can re-skin the admin UI without recompiling SASS. The full token list lives at the top of `components/sass/_global-mixins-and-variables.scss`. Override any of them at any matching selector:

```css
/* Example: change the accent color and the destructive-action red */
.m-chart-container {
    --m-chart-accent:      #ff6b35;
    --m-chart-alert-error: #b00020;
}
```

The accent token chains through to WordPress's `--wp-admin-theme-color`, so the chart-edit screen's accent (sheet-tab underline, focus rings, hover states) automatically follows the user's Admin Color Scheme (Users → Profile). Other tokens hold direct hex defaults because WP's component library does not reliably emit gray/foreground/notice colors as runtime custom properties. If a future version does, those tokens can be migrated to chain through with one-line changes.

Available tokens:
`--m-chart-accent`, `--m-chart-accent-bg-hover`, `--m-chart-text`, `--m-chart-text-muted`, `--m-chart-text-inactive`, `--m-chart-border`, `--m-chart-border-strong`, `--m-chart-bg-sectioned`, `--m-chart-icon`, `--m-chart-icon-inactive`, `--m-chart-disabled`, `--m-chart-alert-error`, `--m-chart-alert-success`, `--m-chart-alert-warning`.

---

## Example charts ##

The repo ships 19 pickle-themed example charts (one per chart type), useful for documentation, screenshots, and test data fixtures.

- **Canonical data:** [`tests/fixtures/charts/pickle-*.json`](tests/fixtures/charts/) — one JSON file per chart type with the full meta + `data.sets` payload
- **Human-readable doc:** [`docs/example-charts.md`](docs/example-charts.md) — concept blurb, data table, and source citations per chart
- **WP-importable file:** [`example-charts/pickle-charts.wxr.xml`](example-charts/) — WordPress eXtended RSS (WXR) export creating all 19 posts as drafts

Each example exercises a different real-world dataset (FAOSTAT cucumber production, KITA kimchi exports, USDA FoodData Central sodium figures, Chinese pao cai / zha cai industry data, Korean kimchi fermentation studies, Google Trends, etc.) and includes a `subtitle` field that surfaces any data caveats (rounding, interpolation, normalization) directly on the rendered chart.

### Regenerating the WXR

The JSON fixtures are the source of truth. After editing a fixture, regenerate the WXR with:

```sh
npm run build:example-charts
```

Implementation lives at [`scripts/generate-example-charts-wxr.js`](scripts/generate-example-charts-wxr.js) — a hand-rolled Node script that PHP-serializes each fixture's contents and wraps them in a valid WXR 1.2 envelope. No dependencies beyond Node's stdlib.

### Importing into WordPress

```sh
npx wp-env run cli wp import example-charts/pickle-charts.wxr.xml --authors=skip
```

…or through the WP admin: **Tools → Import → WordPress** (install the WP Importer plugin if prompted), then upload `example-charts/pickle-charts.wxr.xml`. The 19 example charts will appear as drafts under **M Chart → All Chart Posts**.

### Adding a new example chart

1. Create a new fixture under `tests/fixtures/charts/pickle-<slug>.json` matching the existing shape (every fixture has `library`, `type`, `parse_in`, `set_names`, `subtitle`, `source`, `source_url`, and `data`).
2. Add a `<slug> =>` entry to the `TITLES` map at the top of `scripts/generate-example-charts-wxr.js`.
3. Add a section to `docs/example-charts.md`.
4. Run `npm run build:example-charts` and commit the regenerated WXR.

### WXR contents notes

- Each chart imports with `wp:status = draft` — review before publishing.
- The PHP-serialized blob in `<wp:meta_value>` is what WP's importer unpacks via `maybe_unserialize()` and then re-serializes via `update_post_meta()`. The end result in `wp_postmeta` is identical to what the m-chart admin UI would produce when saving the same chart manually.
- Post IDs in the WXR start at 1000 to avoid collisions with low-numbered posts on the destination site. The importer will reassign IDs if they conflict.

---

## Dependencies and Dependabot ##

Three kinds of dependency, treated differently because they carry different risk:

| Kind | Where | Reaches a site? | Dependabot |
|---|---|---|---|
| Build and test tools | `devDependencies` in `package.json`, `require-dev` in `composer.json` | No | One grouped pull request a month, and one rolling grouped pull request for their security fixes |
| Bundled packages | `dependencies` in `package.json` | Yes, compiled into `components/admin-ui/` and `components/block/` | Individual pull requests |
| Vendored libraries | `components/external/`, listed in `tests/external-libraries/` | Yes | Checked weekly, individual pull requests titled "Vendored library" |

Keep `dependencies` meaning exactly "ends up in shipped JavaScript". `@wordpress/*` packages are provided by WordPress at run time, not bundled, so they belong in `devDependencies`.

A vulnerability in a build tool can't reach a visitor, which is why those alerts are batched and can wait. What a build tool can do is run during the deploy and alter what gets shipped, and a newer version doesn't protect against that, a known one does. So:

- The deploy installs from `package-lock.json` with `npm ci --ignore-scripts`
- Dependabot waits seven days before proposing any new release (`cooldown`), security fixes excepted
- Major versions of build tools are never proposed, do those deliberately

The configuration and the reasoning for each entry are in `.github/dependabot.yml`.

---

## Vendored libraries ##

Everything in `components/external/` is manually copied from upstream dist builds — nothing there is managed by npm or composer, and no build step touches it. When updating one, copy the new dist build over the existing file(s) and make sure a version banner survives at the top of each JS file (some upstream builds strip theirs; add a one-line `/*! name vX.Y.Z */` comment if needed so the vendored version stays identifiable).

`tests/external-libraries/` lists every one of these at its vendored version (`package.json` and `composer.json`, each with a lockfile). Nothing is ever installed from it. It is there because GitHub can only watch dependencies it can see in a manifest, and these are the dependencies that actually ship. See [Dependencies and Dependabot](#dependencies-and-dependabot).

`tests/php/unit/VendoredLibrariesTest.php` fails when that list and the files disagree, so updating a library is always the same three steps:

1. Copy the new files in and check the version banner
2. Change the version in `tests/external-libraries/package.json` (or `composer.json`) and refresh its lockfile: `npm install --package-lock-only --ignore-scripts`, or `composer update --no-install`, run in that folder
3. Update the table below

When Dependabot opens a "Vendored library" pull request it has done step 2 for you. The pull request stays red until step 1 is pushed to it.

| Library | Version | Upstream |
|---|---|---|
| Chart.js | 4.5.1 | [chart.js on npm](https://www.npmjs.com/package/chart.js) (`dist/chart.umd.js`) |
| chartjs-plugin-datalabels | 2.2.0 | [npm](https://www.npmjs.com/package/chartjs-plugin-datalabels) |
| chartjs-chart-treemap | 4.2.0 | [npm](https://www.npmjs.com/package/chartjs-chart-treemap) (`dist/chartjs-chart-treemap.min.js`) |
| chartjs-chart-boxplot | 4.4.5 | [@sgratzl/chartjs-chart-boxplot on npm](https://www.npmjs.com/package/@sgratzl/chartjs-chart-boxplot) (`build/index.umd.min.js`) |
| chartjs-chart-venn | 4.3.7 | [npm](https://www.npmjs.com/package/chartjs-chart-venn) (`build/index.umd.min.js`) |
| Jspreadsheet CE | 5.0.4 | [jspreadsheet-ce on npm](https://www.npmjs.com/package/jspreadsheet-ce) — pairs with jsuites 5.x (`^5.12.0`) |
| jsuites | 5.13.5 | [npm](https://www.npmjs.com/package/jsuites) — do not move to 6.x while Jspreadsheet CE 5 is bundled |
| Freemius SDK | 2.13.5 | [GitHub releases](https://github.com/Freemius/wordpress-sdk/releases) — replace the directory wholesale but preserve `assets/img/m-chart.png` (our plugin icon, not part of the SDK) |
| parseCSV | 1.3.2 | [GitHub](https://github.com/parsecsv/parsecsv-for-php) — upstream dormant since 2021. Carries one local change: every PHP file has a `defined( 'ABSPATH' ) || exit;` guard after its namespace line, re-add it if the library is ever replaced |

---

## Deployment ##

Deploy to WordPress.org via GitHub Actions:

Actions tab → "Deploy to WordPress.org" → "Run workflow"

The workflow first runs every test workflow and the package check against the branch being deployed, and only deploys if all of them pass. Tick "Dry run" to go through the whole thing, including preparing the WordPress.org commit, without committing anything.

Before triggering the workflow:
- Bump the version number in `m-chart.php`, `class-m-chart.php`, and `readme.txt` (`tests/php/unit/VersionConsistencyTest.php` fails if they differ, or if the changelog has no entry for the new version)
- Run `npm run build` and commit all compiled assets
- Run `npm run build:readme` and commit the updated `README.md`
- Target the `main` branch when running the workflow
