# Settings

All settings live under `dabt.*`. Set them in **Settings → Extensions → DABT Tools**, or in `settings.json` (user, workspace or folder).

| Setting | Type | Default | Description |
|---|---|---|---|
| `dabt.executablePath` | string | `"dabt"` | Path to the dabt CLI executable (must be on PATH by default). Also used to auto-detect a live DABT install for API/markup data (see dabt.apiSource.autoDetect). |
| `dabt.apiSource.installPath` | string | `""` | Path to a DABT checkout/install (containing lib/tui.sh) to read live API and XML-markup data from, overriding auto-detection. Leave blank to auto-detect or fall back to the extension's bundled snapshot. |
| `dabt.apiSource.autoDetect` | boolean | `true` | Auto-detect a local DABT install (by resolving dabt.executablePath on PATH, or an open workspace folder that is itself a DABT checkout) and read live API/markup data from it instead of the bundled snapshot. |
| `dabt.lint.enable` | boolean | `true` | Enable DABT-aware linting (private function calls, framework anti-patterns, general bash smells) on shell files. |
| `dabt.lint.flagPrivateCalls` | boolean | `true` | Flag calls into DABT's private API (_tui.*, _exec_*, _tr_*, leading-underscore) from app/callback code. |
| `dabt.subshells.showInStatusBar` | boolean | `true` | Show a live subshell/fork count for the active shell script in the status bar. |
| `dabt.inlayHints.enable` | boolean | `true` | Show inline parameter-name hints at each positional argument of a recognized DABT function call. |
| `dabt.abbreviations.enable` | boolean | `true` | Hover an internal (_-prefixed) identifier like _DLG_KIND to see what its abbreviation segments (DLG, KIND, ...) stand for, from the bundled glossary at src/data/dabtAbbreviations.json. |

## Examples

Pin a specific DABT checkout for one workspace (`.vscode/settings.json`):

```json
{
  "dabt.apiSource.installPath": "~/src/DinosAmazingBashTui"
}
```

Quiet mode: keep completion and hover, drop the extra visuals:

```json
{
  "dabt.inlayHints.enable": false,
  "dabt.subshells.showInStatusBar": false,
  "dabt.lint.flagPrivateCalls": false
}
```

`dabt` not on the PATH that VS Code sees:

```json
{
  "dabt.executablePath": "/home/me/.local/bin/dabt"
}
```

Changes to `dabt.apiSource.*` and `dabt.executablePath` re-resolve the [data source](../guide/data-source.md) immediately. `dabt.inlayHints.enable` refreshes the hints in open editors. Lint settings apply on the next edit.
