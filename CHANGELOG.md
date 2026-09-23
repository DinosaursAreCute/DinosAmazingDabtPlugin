# Changelog

All notable changes to the DABT Tools extension are documented in this file.

## [Unreleased]

### Added
- Abbreviation glossary: hovering an internal (`_`-prefixed) identifier like `_DLG_KIND` or `_TXLK` now explains its abbreviation segments (`src/data/dabtAbbreviations.json`), gated by `dabt.abbreviations.enable`.
- `scripts/gen-abbrev-candidates.js` / `npm run gen-abbrev-candidates`: scans a DABT checkout for undocumented abbreviation segments to keep the glossary current.
- Documentation site at https://dinosaursarecute.github.io/DinosAmazingDabtPlugin/ (`docs/`, Jekyll + Pagefind, same theme as the DABT docs): install, data source, shell, linting, XML markup, themes, fork/profiling and CLI guides, plus command, setting and lint-rule references and a development section. Deployed by `.github/workflows/pages.yml`.
- `DABT: Show Install Details (dabt doctor)` and `DABT: Clear Page Cache (dabt clear-cache)` commands.
- `DABT: Run App` also accepts a path (entry script or app folder), matching `dabt app run PATH`.
- Activates in workspaces containing a `.dabt.metadata` app descriptor.
- `homepage` and `bugs` links in the extension manifest.

### Changed
- Bundled API/markup snapshot refreshed from DABT 0.0.16.
- Abbreviation glossary `subsystem` paths updated to DABT's current `lib/` layout (`lib/chrome/`, `lib/widgets/`, `lib/input/`, ...).

### Fixed
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
