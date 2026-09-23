# Installing and updating

## Requirements

| | |
|---|---|
| VS Code | 1.85 or newer (also VSCodium, Cursor, and anything else that installs `.vsix` files) |
| DABT | Optional. If none is found, the bundled snapshot is used (see [data-source.md](data-source.md)). |
| Linux | Only for **DABT: Profile Current Script**, which reads `/proc/loadavg` to count forks. Everything else works on any OS. |
| `bash` on PATH | For the run, trace and profile commands. |

## Install from a `.vsix`

The extension isn't on the Marketplace yet, so install it from a packaged `.vsix`:

```bash
git clone https://github.com/DinosaursAreCute/DinosAmazingDabtPlugin.git && cd DinosAmazingDabtPlugin
npm install
./scripts/package.sh                            # -> dabt-tools-<version>.vsix
code --install-extension dabt-tools-0.1.0.vsix
```

Or in VS Code, open the Extensions panel, then `...` menu → **Install from VSIX...**, and pick the file. You can also drag the `.vsix` onto the window.

### Remote, SSH, WSL and containers

The extension runs where your files are. In a Remote-SSH, WSL or Dev Container window, open the Extensions view **while connected** and install the `.vsix` there. It then auto-detects the `dabt` on the *remote's* PATH, which is the one you want.

## Check it's working

Open any `.sh` file. The status bar on the right now shows two items:

| Item | Meaning |
|---|---|
| `3 forks` (terminal icon) | The fork counter for this file. Click it for a per-line report. |
| `dabt: live` (sync icon) / `dabt: bundled` (archive icon) | Where API and markup data comes from. Click it to re-check. |

Type `tui.` and you should get completions with signatures. If you see `dabt: bundled` but you have DABT installed, see [data-source.md](data-source.md#when-it-says-bundled-but-you-have-dabt).

## Updating

Pull the repository, rebuild and reinstall over the old version:

```bash
git pull
npm install
./scripts/package.sh
code --install-extension dabt-tools-<version>.vsix --force
```

Then run **Developer: Reload Window**.

Updating **DABT** doesn't need an extension update. A live install is re-scanned automatically when its `lib/` or `tui.xsd` changes (for example after `dabt update`).

## Uninstalling

Extensions panel → DABT Tools → **Uninstall**, or:

```bash
code --uninstall-extension dinosaursarecute.dabt-tools
```

The extension writes no files outside your workspace. It only writes when you run **DABT: New Page...**.
