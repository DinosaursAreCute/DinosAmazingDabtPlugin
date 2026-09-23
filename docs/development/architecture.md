# Architecture

DABT Tools is one TypeScript extension bundled by esbuild into `dist/extension.js`, with no runtime dependencies. `src/extension.ts` registers everything. Each feature is its own small file with a comment at the top explaining *why* it's built the way it is.

## Data layer

| File | Job |
|---|---|
| `apiSource.ts` | Picks the DABT root: `installPath` setting → workspace folder → `dabt` on PATH. Returns `undefined` if none applies (the bundled snapshot is used). |
| `dataSource.ts` | Owns the active source: loads it into the indexes, shows the `dabt: live/bundled` status item, and watches `lib/**/*.sh` + `tui.xsd` for a debounced re-scan. |
| `parse/parseDabtApi.ts` | Walks `lib/` and `share/plugins/` for `name() {` definitions, and reads the doc comment above each into `{sig, doc, params, paramsSource}`, falling back to `local x="$1"` inference. |
| `parse/parseDabtXsd.ts` | `share/tui.xsd` → elements, attributes (type, required, enum values, doc) and allowed children. |
| `parse/cli.ts` | The same two parsers, run offline by `npm run gen-data` to write `src/data/*.json`. |
| `apiData.ts` / `xsdData.ts` | The in-memory `apiIndex` / `schemaIndex` every provider queries. They start from the bundled JSON and are replaced by a live load. |
| `abbreviations.ts` | The static glossary behind abbreviation hovers. |
| `naming.ts` | What counts as a private name. |

## Shell features

| File | Provides |
|---|---|
| `completion.ts` | `tui.*` / `_tui.*` completion (public first, private labeled). |
| `hover.ts` | API cards, and abbreviation explanations for `_NAMES`. |
| `argTokenizer.ts` | A quote- and paren-aware single-line tokenizer: *which word is the command, which are its arguments*. Shared by the next two. |
| `inlayHints.ts` | Parameter-name hints at each positional argument. |
| `signatureHelp.ts` | Parameter popup with the active argument highlighted. |
| `diagnostics.ts` | The [lint rules](../reference/lint-rules.md): a line-at-a-time rule table. |
| `fileHeuristics.ts` | *Is this a shell file?* and *Is this DABT's own framework source?* |
| `subshellCounter.ts` + `subshellStatusBar.ts` | A heuristic fork scanner and its status item. |
| `cli.ts` | Sends `dabt ...` to the shared **DABT** terminal. |
| `profiling.ts` | Run, `bash -x` trace, and `/proc/loadavg` fork profiling. |

## XML and theme features

| File | Provides |
|---|---|
| `xmlHeuristics.ts` | *Is this a DABT page?* (by content), plus `<script>`/`<theme>` resolution, function-def and pane-id scans. |
| `xmlContext.ts` | Where the cursor is: tag name, attribute name, or attribute value (and which one). |
| `xmlCompletion.ts` / `xmlHover.ts` / `xmlDefinition.ts` | Schema-driven completion, hover docs and F12. |
| `xmlSnippetBuilder.ts` | Element → snippet, with required-first tab stops and typed defaults. |
| `xmlCommands.ts` | **New Page** and **Insert Element**. |
| `xmlDecorations.ts` | Red `*` required-attribute markers. |
| `themeCss.ts` | Parser for DABT's flat `.class[:state] { fg; bg; mods }` format. |
| `xmlClassRefs.ts` | Shared `class="..."` → theme rule resolution, so swatches and hints can't disagree. |
| `xmlClassColor.ts` / `xmlClassInlayHints.ts` | Native swatches and `fg`/`bg`/`mod` hints on `class=`. |
| `cssColor.ts` / `dabtColors.ts` | `br_*` swatches in `theme.css`, and the ANSI name → hex preview palette. |

## Principles

- **One parser, two call sites.** The live scan and the bundled snapshot go through exactly the same code, so they can't drift apart.
- **Heuristics say so.** The tokenizer, the fork counter and the lint rules are deliberately not a bash grammar: they're fast enough to run on every keystroke. Their output is labeled as approximate wherever that matters. Where a real number is possible (the profiler), it's measured.
- **Native UI where possible.** Swatches are real `DocumentColorProvider` colors and hints are real inlay hints, so users' themes and settings apply. The only custom decoration is the required `*` marker, which has no native equivalent.
- **Cheap guards first.** Every provider bails early on documents that aren't DABT-shaped, so the extension costs nothing in unrelated XML and CSS.
