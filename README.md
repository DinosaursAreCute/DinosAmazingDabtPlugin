<div align="center">

<img src="assets/icon.png" alt="" width="96"><br/>
<img src="assets/logo.png" alt="DABT Tools" width="490">

**VS Code tooling for developing [DABT](https://github.com/DinosaursAreCute/DinosAmazingBashTui) (DinosAmazingBashTui) applications and plugins.**<br/>
Lint, autocomplete, inlay hints, XML markup tooling, CSS-aware theming, CLI integration and debug/profiling - for bash TUI apps built on [D.A.B.T](https://github.com/DinosaursAreCute/DinosAmazingBashTui).
No dabt install required to work; live-scans one when it finds it.

[![VS Code Engine](https://img.shields.io/badge/vscode-%5E1.85.0-2ea043?style=for-the-badge&logo=visualstudiocode&logoColor=white)](package.json)
[![TypeScript](https://img.shields.io/badge/typescript-strict-3178c6?style=for-the-badge&logo=typescript&logoColor=white)](tsconfig.json)
[![Dependencies](https://img.shields.io/badge/runtime%20deps-none-blue?style=for-the-badge)](package.json)
[![License: MIT](https://img.shields.io/badge/license-MIT-yellow?style=for-the-badge)](LICENSE)
[![Docs](https://img.shields.io/badge/docs-github.io-ff8cbf?style=for-the-badge)](https://dinosaursarecute.github.io/DinosAmazingDabtPlugin/)

[**Documentation**](https://dinosaursarecute.github.io/DinosAmazingDabtPlugin/) · [**Features**](#features) · [**Installing**](#installing) · [**Data source**](#data-source) · [**Building**](#building) · [**Development**](#development)

</div>

---

DABT Tools reads DABT's own conventions and gives them back to you as editor
features, instead of duplicating them by hand: doc-comment signatures become
inlay hints, `tui.xsd` becomes markup completion, `theme.css` becomes real
color swatches, `*_callbacks.sh` becomes go-to-definition from `action="..."`.

<div align="center">
<img src="assets/xml_example.png" alt="A &lt;pane&gt; tag in a real editor: a red asterisk on the required id attribute, a color swatch on class=&quot;panel&quot;, and fg/bg inlay hints resolved from theme.css">
</div>

That's live in a real editor, not a mockup: a red `*` on `id` (required),
a real color swatch on `class="panel"`, and `fg`/`bg` inlay hints resolved
straight from `theme.css`. Tag/attribute completion comes from `tui.xsd`,
and F12 on an `action=`/`on_visit=` attribute jumps straight to that
function - a built-in's doc, or a local callback's definition.

<h2 id="features"><img src="assets/headers/features.png" alt="Features" height="35"></h2>

| | |
|---|---|
| **Lint** | [7 rules](https://dinosaursarecute.github.io/DinosAmazingDabtPlugin/reference/lint-rules): private-internal calls (`_tui.*`/`_exec_*`/`_tr_*`) from app code, `_TUI_TICK_FN` clobbering, `TUI_MOUSE_DRAIN_PEEK_TIMEOUT=0`, and general bash smells (useless `cat`, backticks, `echo -e`, `pipe \| while read` subshell trap) |
| **Autocomplete & hover** | Every `tui.*`/`_tui.*` function, with signature and doc text |
| **Abbreviation glossary** | Hover an internal identifier like `_DLG_KIND` or `_TXLK` to see what its abbreviation segments stand for (a curated glossary in `src/data/dabtAbbreviations.json`; `npm run gen-abbrev-candidates` finds new ones to define) |
| **Inlay hints & signature help** | Positional args get their parameter name shown inline (`tui.paint ID:mypane TEXT:"hi"`) - bash gives no such feedback natively |
| **XML markup tooling** | Tag/attribute/value completion from `tui.xsd`, hover docs, go-to-definition from `action=`/`on_visit=`/`src=` to the real function/file |
| **`DABT: New Page...` / `Insert Element...`** | Scaffold a page + callback stub together; insert any element as a snippet, Tab through every attribute in order |
| **Required-attribute markers** | A red `*` badge on every required attribute actually written, no hover needed |
| **Theme-aware `class=`** | Completion from the page's own `theme.css`, real clickable color swatches (`fg`+`bg`), inlay hints for which is which |
| **Subshell/fork counter** | Status bar + workspace report: command substitutions, process substitutions, subshells, pipeline stages, background jobs per file |
| **CLI integration** | `dabt build`, `scan .`, `app run NAME\|PATH`, `doctor`, `clear-cache`, or any `DABT: Run CLI Command...`, straight through the integrated terminal |
| **Debugging & profiling** | `bash -x` trace with `file:line` `PS4`; real fork-count + wall-time profiling via `/proc/loadavg` |

Every command, setting and lint rule is documented on the **[docs site](https://dinosaursarecute.github.io/DinosAmazingDabtPlugin/)**.

<h2 id="installing"><img src="assets/headers/installing.png" alt="Installing" height="35"></h2>

Package a `.vsix` and install it like any other extension:

```bash
npm install
./scripts/package.sh                            # -> dabt-tools-<version>.vsix
code --install-extension dabt-tools-0.1.0.vsix
```

Or in VS Code: Extensions panel → `...` menu → **Install from VSIX...** →
pick the file (same for drag-and-drop onto the window). This also covers
remote/SSH and WSL windows - install it from the Extensions view while
connected to that remote, same as any other extension.

<h2 id="data-source"><img src="assets/headers/data-source.png" alt="Data source" height="35"></h2>

API/markup data comes from one of four places, in priority order, so it
never depends on a snapshot going stale **and** never requires an install
either - both are always usable:

| | |
|---|---|
| 1. `dabt.apiSource.installPath` | Explicit path to a DABT checkout, for pinning a specific version regardless of what's on PATH |
| 2. The open workspace itself | If it IS a DABT checkout (has `lib/tui.sh`) - editing the framework's own source gets you its own live data for free |
| 3. Auto-detected on PATH | Resolves `dabt.executablePath` (default `dabt`), follows symlinks, derives the install root the same way `bin/dabt` itself does |
| 4. The bundled snapshot | `src/data/dabtApi.json` / `dabtXsd.json`, when none of the above apply |

Whichever source is active is live-parsed with the same parser either way
(`src/parse/parseDabtApi.ts` / `parseDabtXsd.ts`) - nothing is hand-
maintained per source. A status bar item (`dabt: live` / `dabt: bundled`)
shows which is active; click it, or run `DABT: Refresh API/Markup Data`, to
re-resolve on demand. When live, a file watcher on the resolved install's
`lib/`, `share/plugins/` and `tui.xsd` keeps it current automatically.

**Docstring metadata convention.** Inlay hints and signature help need each
parameter's *name*, not just a doc sentence, so the parser reads DABT's
existing doc-comment shapes into structured `{name, optional}[]` param
lists - a 2+ space gap (header-table style) or a literal ` - ` separates a
`NAME ARG1 [ARG2] ...` signature from its prose description, matching what
the framework already writes throughout `lib/*.sh`:

```bash
# tui.paint ID TEXT [STATE]        prints TEXT wrapped in ID's style + reset.
tui.paint() { ... }

# _tui_api._build FG BG MODS - emits ANSI prefix for resolved values.
_tui_api._build() { ... }
```

`[NAME]` means optional, `NAME...` means variadic, and a trailing ` | ` cuts
the signature off before a second alternative on the same line. A function
with no parseable signature falls back to **inference straight from its
body**: DABT's dominant style captures arguments as `local name="$1"
other="$2"` near the top, which is ground truth, not a guess - falling back
to generic `ARG1`/`ARG2` only where no named local exists, and correctly
inferring nothing for a function that takes no positional args or only
reads `"$@"`. Each function's `paramsSource` (`"doc"` vs `"inferred"`) is
recorded and flagged wherever it's shown, so an inferred name is never
mistaken for an authored one.

<h2 id="building"><img src="assets/headers/building.png" alt="Building" height="35"></h2>

Small, single-purpose scripts, same idea as DABT's own `tools/`:

| | |
|---|---|
| `scripts/build.sh` | Dev build (with source maps) |
| `scripts/watch.sh` | Rebuild on every save - pair with `F5` |
| `scripts/package.sh` | Minified build + `.vsix`, ready to install |
| `scripts/gen-data.sh /path/to/DinosAmazingBashTui` | Refresh the bundled fallback snapshot from a real checkout |
| `npm run gen-abbrev-candidates -- /path/to/DinosAmazingBashTui` | List abbreviation segments not yet in the glossary |

The docs site lives in [`docs/`](docs/) (Jekyll, same theme as the DABT docs) and deploys from `.github/workflows/pages.yml`; see [Building & packaging](https://dinosaursarecute.github.io/DinosAmazingDabtPlugin/development/building#this-documentation-site).

<h2 id="development"><img src="assets/headers/development.png" alt="Development" height="35"></h2>

```bash
npm install
./scripts/watch.sh
```

Then `F5` in VS Code (**Run DABT Tools Extension**) to launch an Extension
Development Host, or **Run Extension in DinosAmazingBashTui** to open it
straight against a real checkout with real pages to test against.

<h2 id="license"><img src="assets/headers/license.png" alt="License" height="35"></h2>

[MIT](LICENSE): free to use, modify and redistribute for any purpose, no warranty, no liability.

---

<div align="center">
<sub>Editor tooling that reads DABT's own conventions instead of duplicating them.</sub>
</div>
