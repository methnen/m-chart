# Developer Guide

M Chart is extensible via PHP hooks and a JavaScript `wp.hooks` API. This section documents the available hooks for themes and plugins that want to customize chart behavior.

## Quick Links

- [PHP Hooks & Filters](./hooks.md) — Server-side action and filter hooks
- [JavaScript Events](./javascript-events.md) — Front-end `CustomEvent` API (v2.0+)
- [Admin UI Hooks](./admin-ui-hooks.md) — `wp.hooks` API for the React admin interface
- [Migrating to v2](./migrating-v2.md) — Breaking changes and upgrade guide

## Build Environment

To work on the plugin source you will need Node.js installed. Then from the plugin root:

```sh
npm install
```

**Build commands:**

| Command | Description |
|---------|-------------|
| `npm run build` | Build everything (CSS, JS, block, admin app) |
| `npm run build:css` | Build CSS only |
| `npm run build:js` | Minify JS helpers only |
| `npm run build:block` | Build the Gutenberg block only |
| `npm run build:admin-ui` | Build the React admin app only |

**Watch commands:**

| Command | Description |
|---------|-------------|
| `npm run watch` | Watch everything |
| `npm run watch:admin-ui` | Watch the React admin app only |

::: tip
For additional build commands, translation tooling, and test setup, see [DEVELOPERS.md](https://github.com/methnen/m-chart/blob/master/DEVELOPERS.md) in the repository.
:::
