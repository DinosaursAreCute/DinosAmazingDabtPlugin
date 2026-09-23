# The dabt CLI from the editor

DABT Tools doesn't wrap `dabt` in its own UI. It sends the command to an integrated terminal named **DABT**, started in your first workspace folder. You get exactly the output, prompts, colors and exit behavior you'd get typing it yourself. Anything that asks a question (`dabt update`, `dabt app remove`) still works.

The executable is `dabt.executablePath` (default `dabt`, looked up on PATH). See the framework's [install guide](https://dinosaursarecute.github.io/DinosAmazingBashTui/guide/install-and-update) for what each command does.

## Commands

| Command palette | Runs |
|---|---|
| **DABT: Build Package (dabt build)** | `dabt build`: packages the workspace app into a signed `.dapk` under `dist/`. |
| **DABT: Scan Project (dabt scan .)** | `dabt scan .`: security-scans every script in the workspace (built-in rules, plus ShellCheck when installed). |
| **DABT: Run App** | Asks for a target: an installed app **name**, or a **path** to an entry script or app folder (`.`, `bin/run.sh`). Runs `dabt app run TARGET`. Leave it blank for `dabt app list`. |
| **DABT: Show Install Details (dabt doctor)** | `dabt doctor`: version, program and config locations, install status. The first thing to run when [data source](data-source.md) detection doesn't find your install. |
| **DABT: Clear Page Cache (dabt clear-cache)** | `dabt clear-cache`: deletes DABT's page record/replay cache. Use it when a page seems to ignore an XML edit. |
| **DABT: Run CLI Command...** | Anything else: type the arguments (`pkg info dist/my_app-1.0.0-3.dapk`, `update --check`, `scan lib --deep`...) and it runs `dabt <args>`. |

## Tips

- **Run a workspace app without installing it:** **DABT: Run App** → `.` (or the entry script's path). That's `dabt app run PATH`, which runs straight from the folder.
- **Stricter scans:** **Run CLI Command...** → `scan . --strict` exits non-zero on HIGH findings. `--deep` adds semgrep.
- **Keybindings:** every command has an ID (see [reference/commands.md](../reference/commands.md)), so you can bind them:

```json
[
  { "key": "ctrl+alt+b", "command": "dabt.build" },
  { "key": "ctrl+alt+r", "command": "dabt.app.run" }
]
```

- **Tasks:** for a build step in `tasks.json`, call `dabt` directly. The extension adds nothing that a shell task needs.

```json
{
  "label": "dabt build",
  "type": "shell",
  "command": "dabt build",
  "group": "build",
  "problemMatcher": []
}
```
