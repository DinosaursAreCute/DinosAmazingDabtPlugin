# Data source

Every DABT-aware feature reads from two indexes: the **API index** (every function in DABT's `lib/`, with signature, doc and parameters) and the **schema index** (every element and attribute in `share/tui.xsd`). Neither is hand-written. Both are parsed from a real DABT tree.

## Where the data comes from

The first source that applies wins:

| # | Source | When it's used |
|---|---|---|
| 1 | `dabt.apiSource.installPath` | Set to a DABT checkout (a folder containing `lib/tui.sh`). Use it to pin a specific version no matter what's on PATH. |
| 2 | The open workspace | A workspace folder that *is* a DABT checkout. When you edit the framework itself, it reads its own source. |
| 3 | `dabt` on PATH | Resolves `dabt.executablePath` (default `dabt`), follows symlinks, and derives the install root the same way `bin/dabt` does (`dirname(dirname(realpath))`). Turn off with `dabt.apiSource.autoDetect`. |
| 4 | The bundled snapshot | `src/data/dabtApi.json` and `dabtXsd.json`, shipped inside the extension. Used when none of the above apply. |

The status bar shows which one is active:

- **`dabt: live`**: live-scanned. The tooltip names the path and how it was found.
- **`dabt: bundled`**: the snapshot. The tooltip says so, and the refresh message includes the DABT version it was taken from.

Click the item, or run **DABT: Refresh API/Markup Data**, to resolve it again. The source is also re-resolved when you change any `dabt.apiSource.*` or `dabt.executablePath` setting, or add or remove a workspace folder.

### Staying current

When the source is live, a file watcher on the install's `lib/**/*.sh`, `share/plugins/**/*.sh` and `share/tui.xsd` triggers a re-scan (debounced by 500 ms). Edit a doc comment in DABT and the new signature shows up in your app's inlay hints right away.

### When it says "bundled" but you have DABT

1. Run `dabt doctor` in a terminal. If `dabt` isn't found there, VS Code can't find it either. Add `~/.local/bin` to your PATH, or set `dabt.executablePath` to the full path.
2. VS Code started from a desktop launcher may have a smaller PATH than your shell. Set `dabt.apiSource.installPath` to the install (e.g. `~/.local/share/dabt`) or to a checkout.
3. If the path is set but ignored, you'll see a warning: *"doesn't look like a DABT checkout (no lib/tui.sh found)"*. Point it at the folder that *contains* `lib/`.

## How signatures are read

Inlay hints and signature help need each parameter's **name**, not just a sentence of docs. The parser reads DABT's existing doc-comment shapes into a structured `{name, optional}[]` list. A signature `NAME ARG1 [ARG2] ...` is separated from its description by either a gap of 2+ spaces (the header-table style) or a literal ` - `. Both styles appear throughout `lib/`:

```bash
# tui.paint ID TEXT [STATE]        prints TEXT wrapped in ID's style + reset.
tui.paint() { ... }

# _tui_api._build FG BG MODS - emits ANSI prefix for resolved values.
_tui_api._build() { ... }
```

| Syntax | Meaning |
|---|---|
| `[NAME]` | Optional. The hint shows `NAME?:`. |
| `NAME...` | Variadic. Every remaining argument gets this name. |
| ` \| ` | Cuts the signature off before a second alternative on the same line (`tui.every.cancel ID \| .pause ID`). |

### Inferred parameters

A function with no parseable signature falls back to **inference from its body**. DABT's usual style captures arguments as `local name="$1" other="$2"` near the top, and those names are reliable. Where no named `local` exists it falls back to generic `ARG1`/`ARG2`. It infers nothing for a function that takes no positional arguments or only reads `"$@"`.

Each function records its `paramsSource` (`doc` or `inferred`). Inferred names are marked as such in hovers and in inlay-hint tooltips, so you can always tell them apart from names someone wrote.

> **For DABT authors:** the fastest way to improve hints is to add a one-line signature comment above a function. It's picked up on save.

## Refreshing the bundled snapshot

The snapshot only matters for people without DABT installed. To refresh it from a checkout:

```bash
./scripts/gen-data.sh /path/to/DinosAmazingBashTui
```

This uses the same parser as the live scan (`src/parse/parseDabtApi.ts`, `parseDabtXsd.ts`) and records the DABT `VERSION` it was taken from. See [development/building.md](../development/building.md).
