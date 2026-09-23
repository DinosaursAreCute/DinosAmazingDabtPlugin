# Commands

Every command is in the Command Palette (`Ctrl+Shift+P`) under the **DABT** category. The ID is what you use in `keybindings.json`.

| Command | ID | Available | What it does |
|---|---|---|---|
| **DABT: Run CLI Command...** | `dabt.run` | always | Prompts for arguments, runs `dabt <args>` in the DABT terminal. [cli.md](../guide/cli.md) |
| **DABT: Build Package (dabt build)** | `dabt.build` | always | `dabt build` in the DABT terminal. |
| **DABT: Scan Project (dabt scan .)** | `dabt.scan` | always | `dabt scan .` in the DABT terminal. |
| **DABT: Run App** | `dabt.app.run` | always | Prompts for an app name or path; `dabt app run TARGET`, or `dabt app list` when blank. |
| **DABT: Show Install Details (dabt doctor)** | `dabt.doctor` | always | `dabt doctor` in the DABT terminal. |
| **DABT: Clear Page Cache (dabt clear-cache)** | `dabt.clearCache` | always | `dabt clear-cache` in the DABT terminal. |
| **DABT: Run Current Script** | `dabt.runCurrentFile` | shell files, editor right-click | Saves, runs `bash FILE` in a *DABT Run* terminal. |
| **DABT: Profile Current Script** | `dabt.profile.currentFile` | shell files, editor right-click | Saves, runs the file and reports wall time + fork count. [Profiling](../guide/subshells-and-profiling.md#profile-current-script) |
| **DABT: Debug Trace Current Script (bash -x)** | `dabt.debug.trace` | shell files, editor right-click | Saves, runs `bash -x` with a `file:line` `PS4` in a *DABT Trace* terminal. |
| **DABT: Count Subshells in Current File** | `dabt.subshells.countFile` | shell files | Per-line fork report for the active file (also: click the status-bar counter). |
| **DABT: Subshell Report for Workspace** | `dabt.subshells.report` | always | Fork totals + top 25 files across the workspace. |
| **DABT: Show API Docs for Symbol Under Cursor** | `dabt.showApiDoc` | always | Signature, doc and definition site of the function under the cursor. |
| **DABT: Refresh API/Markup Data (live-scan or bundled)** | `dabt.refreshApiData` | always | Re-resolve the [data source](../guide/data-source.md) (also: click the `dabt:` status item). |
| **DABT: New Page (XML + callbacks.sh)...** | `dabt.xml.initPage` | always | Scaffold `NAME.xml` + `NAME_callbacks.sh`. [XML markup](../guide/xml-markup.md#new-page) |
| **DABT: Insert Element...** | `dabt.xml.insertElement` | XML files | Insert any element as a Tab-through snippet. [XML markup](../guide/xml-markup.md#insert-element) |

## Status bar items

| Item | Click runs |
|---|---|
| `N forks` (terminal icon), shell files only | `dabt.subshells.countFile` |
| `dabt: live` / `dabt: bundled` | `dabt.refreshApiData` |

## Output channels and terminals

| Name | Used by |
|---|---|
| **DABT** terminal | Every `dabt ...` command (reused between runs) |
| **DABT Run** / **DABT Trace** terminals | Run Current Script / Debug Trace |
| **DABT Subshells** output channel | Fork reports |
| **DABT Profiler** output channel | Profile Current Script |
