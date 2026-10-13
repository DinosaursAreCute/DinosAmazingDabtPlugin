# Changelog

All notable changes to the DABT Tools extension are documented in this file.

## [Unreleased]

## [0.2.0] - 2026-10-13

### Added
- Markup diagnostics while typing (`dabt.xml.lint`): unknown elements and attributes, missing required attributes, callbacks that name no function in the page's scripts or the API, missing `src`/`page` files, duplicate ids and theme classes the theme does not define (`dabt-xml-*` codes).
- Framework validator on open and save (`dabt.xml.validateOnSave`): runs `lib/markup/tui_validate.sh` from the detected install and shows its findings, layout rules included, as `dabt validate` diagnostics.
- Outline for DABT pages (panes and widgets by id, nested) and for callback files (callbacks and helpers).
- CodeLens above each callback: how many markup attributes name it (`dabt.codeLens.enable`); click to jump to the uses.
- `dabt-fork-in-callback` hint for external commands with a fork-free bash equivalent in `*_callbacks.sh` and `*.plugin.sh` (`dabt.lint.performance`).
- A line containing `dabt-ignore` is skipped by every shell rule.
- Unit tests (`npm test`, node's test runner, no editor host) and `npm run typecheck`.
- `scripts/gen-release-notes.js`: renders themed release notes from a CHANGELOG section into `release-notes/`.
- `scripts/gen-headers.js` / `npm run gen-headers`: block-font header images (`assets/headers/`) in the extension's colours, the same font and look as the DABT framework's `tools/gen_header.sh`; the release notes use them for the title and section headers.
- Abbreviation glossary grew from 65 to 132 entries: module prefixes (`MD`, `TV`, `HZ`, `RZ`, `RC`, `WT`, `TJ`, ...), result-variable suffixes (`R`, `C`, `H`, `X`, `Y`) and the dapk and markdown scratch names, each tied to the file that owns it.
- Abbreviation glossary: hovering an internal (`_`-prefixed) identifier like `_DLG_KIND` or `_TXLK` now explains its abbreviation segments (`src/data/dabtAbbreviations.json`), gated by `dabt.abbreviations.enable`.
- `scripts/gen-abbrev-candidates.js` / `npm run gen-abbrev-candidates`: scans a DABT checkout for undocumented abbreviation segments to keep the glossary current.
- Documentation site at https://dinosaursarecute.github.io/DinosAmazingDabtPlugin/ (`docs/`, Jekyll + Pagefind, same theme as the DABT docs): install, data source, shell, linting, XML markup, themes, fork/profiling and CLI guides, plus command, setting and lint-rule references and a development section. Deployed by `.github/workflows/pages.yml`.
- `DABT: Show Install Details (dabt doctor)` and `DABT: Clear Page Cache (dabt clear-cache)` commands.
- `DABT: Run App` also accepts a path (entry script or app folder), matching `dabt app run PATH`.
- Activates in workspaces containing a `.dabt.metadata` app descriptor.
- `homepage` and `bugs` links in the extension manifest.

### Changed
- Shell lint rules no longer match inside comments or single quotes (`echo -e`, backticks and `cat ... |` in a comment or string were flagged).
- Callback attributes now include `on_resize`, `on_toggle`, `on_detach` and `on_dock`, matching the schema.
- The data-source status tooltip names the bundled snapshot's dabt version and date.
- Bundled API/markup snapshot refreshed from DABT 0.0.24-preRelease (1,784 functions, 54 elements, 1,311 effective attributes).
- Abbreviation glossary `subsystem` paths updated to DABT's current `lib/` layout (`lib/chrome/`, `lib/widgets/`, `lib/input/`, ...).

### Fixed
- XML schema parsing now expands shared XSD attribute and child groups, preserving current pane/layer attributes and valid child-element completions.
- `DABT: Scan Project` ran `dabt scan` with no path, which only printed usage; it now runs `dabt scan .` in the workspace folder.
- Private-call lint no longer fires inside DABT's own framework source in `lib/` subdirectories (`lib/markup/`, `lib/input/`, `lib/state.sh`, ...); any `.sh` under a `lib/` that holds `tui.sh` counts as framework source.
- Command Palette entries showed the category twice (`DABT: DABT: Build Package`); titles no longer repeat the `DABT` category.

## [0.1.0] - 2026-09-22

Initial release.

### Added
- Core VS Code extension for DinosAmazingBashTui (DABT) apps and plugins.
- Inlay hints and signature help for DABT function arguments.
- Parameter inference from source when a function has no doc comment.
- DABT XML markup tooling with live-scanned data (no stale hardcoded tables).
- Theme-aware `class=` completion with inline color swatches.
- Separate fg/bg color chips and required-attribute markers for XML attributes.
- Native color swatches plus fg/bg/mod inlay hints, replacing the earlier `class=` badges.
- Packaging metadata and `.vsix` install instructions.
- Pixel-art extension icon and a real in-editor screenshot in the README.

### Changed
- README visual language reworked to match DABT's own docs site (section headers, palette).
- Extension icon iterated several times to land on a two-line "DABT / TOOLS" wordmark with a dark gradient background and hard drop shadow, matching the project's hero logo treatment.
