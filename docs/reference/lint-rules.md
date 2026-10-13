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
| `dabt-fork-in-callback` | Info | `basename`, `dirname`, `date`, `sed`, `awk`, `cut`, `tr`, `wc`, `head`, `tail`, `expr`, `seq` as a command, or `$(echo ...)` / `$(printf ...)`, in `*_callbacks.sh` and `*.plugin.sh` | The builtin in the message (`${p##*/}`, `printf -v`, ...) | yes |

**Framework source** means any `.sh` under a `lib/` folder that contains `tui.sh`, i.e. DABT's own implementation.

## Scope

- Runs on `shellscript` documents only, on open, on every edit and on save. Diagnostics are cleared when the file closes.
- Rules read a masked copy of each line: text after a `#` comment and inside single quotes is never matched; text inside double quotes is matched only by the rules that look at substitutions (`dabt-private-call`, `dabt-tick-clobber`, `dabt-mouse-drain-zero`, `dabt-backtick-subst`).
- All rules check one line at a time, so a construct split across lines with `\` isn't seen. A multi-line string or heredoc is read line by line.

## Settings

| Setting | Effect |
|---|---|
| `dabt.lint.enable` | `false` turns off every rule on this page. |
| `dabt.lint.flagPrivateCalls` | `false` turns off `dabt-private-call` only. |
| `dabt.lint.performance` | `false` turns off `dabt-fork-in-callback` only. |

A line containing `dabt-ignore` (usually as a trailing comment) is skipped by every rule. Use a workspace or folder setting to silence a rule for a part of your tree.

## Markup rules

Run on DABT pages (`.xml` with a `<tui>` or `<pane>` root) on every edit. Source `dabt`. Values containing `{{...}}` or `$` are not checked.

| Code | Severity | Fires on |
|---|---|---|
| `dabt-xml-unknown-element` | Warning | A tag that is not in the schema and not named by a `<component name>` on the page |
| `dabt-xml-unknown-attribute` | Warning | An attribute the element does not declare (`xmlns`, `xsi:*`, `data-*` and the parameters of `template`, `use`, `include`, `fill`, `slot`, `for`, `if`, `else`, `set` and `component` are exempt) |
| `dabt-xml-missing-attribute` | Warning | A required attribute is absent |
| `dabt-xml-undefined-callback` | Warning | An `action`, `submit`, `on_*` value naming a function that is neither in the page's `<script src>` files nor in the DABT API. Skipped when the page loads no script |
| `dabt-xml-missing-file` | Warning | `src` or `page` pointing at a file that does not exist next to the page |
| `dabt-xml-duplicate-id` | Warning | The same `id` twice on a page, outside `template`, `for`, `if`/`else`, `component` and `addon` |
| `dabt-xml-unknown-class` | Info | A `class` token missing from the page's own `<theme src>` and the install's default theme. Only checked when the page loads a theme |

The framework validator's findings appear separately, with source `dabt validate`, when the page is opened or saved and a DABT install is known. Switch the markup rules off with `dabt.xml.lint`, the validator with `dabt.xml.validateOnSave`.
