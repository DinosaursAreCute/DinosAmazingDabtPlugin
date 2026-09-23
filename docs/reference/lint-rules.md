# Lint rules

Every diagnostic has source `dabt` and one of the codes below, shown in the Problems panel as `dabt(CODE)`. See [guide/linting.md](../guide/linting.md) for the reasoning behind them.

| Code | Severity | Fires on | Fix | Skipped in framework source |
|---|---|---|---|---|
| `dabt-private-call` | Warning | A call to a known private DABT function, or a `_tui.` / `_tui_` / `_exec_` / `_tr_` prefixed name | Use the public `tui.*` equivalent | yes |
| `dabt-tick-clobber` | Warning | `_TUI_TICK_FN=` | `tui.tick.add FN` | yes |
| `dabt-mouse-drain-zero` | **Error** | `TUI_MOUSE_DRAIN_PEEK_TIMEOUT=0` | Leave the default, or use any value > 0 | no |
| `dabt-piped-while-read-subshell` | Warning | `... \| while read` / `... \| while IFS=` | `while read ...; do ...; done < <(cmd)` | no |
| `dabt-useless-cat` | Info | `cat FILE \| cmd` | `cmd < FILE` | no |
| `dabt-backtick-subst` | Info | `` `...` `` | `$(...)` | no |
| `dabt-echo-dash-e` | Info | `echo -e` | `printf '%b\n' ...` | no |

**Framework source** means any `.sh` under a `lib/` folder that contains `tui.sh`, i.e. DABT's own implementation.

## Scope

- Runs on `shellscript` documents only, on open, on every edit and on save. Diagnostics are cleared when the file closes.
- `dabt-private-call` skips comment lines.
- All rules check one line at a time, so a construct split across lines with `\` isn't seen.

## Settings

| Setting | Effect |
|---|---|
| `dabt.lint.enable` | `false` turns off every rule on this page. |
| `dabt.lint.flagPrivateCalls` | `false` turns off `dabt-private-call` only. |

There's no inline suppression comment yet. Use a workspace or folder setting to silence a rule for a part of your tree.
