# Linting

DABT Tools lints shell files as you type and puts the results in the Problems panel, with source `dabt`. There are two kinds of rule:

- **DABT rules** catch mistakes specific to the framework: calling its internals, breaking its tick loop, misconfiguring mouse input.
- **Bash rules** catch common bash mistakes that are especially costly in a TUI's hot path, where every fork shows up as input lag.

Every rule and its code is listed in the [lint rules reference](../reference/lint-rules.md). This page explains the reasoning behind them.

## Public vs private API

DABT's rule is simple: `tui.*`, `mode.*`, `cur.*`... are **public**, and anything starting with `_` (`_tui.*`, `_tui_*`, `_exec_*`, `_tr_*`) is **private**. Private functions can change or disappear in any release. Callbacks should stay thin and call only public functions.

`dabt-private-call` enforces that. It warns on a call to a known private DABT function, or to anything with a DABT-shaped private prefix. It doesn't flag your own project's `_helper` functions: those aren't in the API index and don't use a DABT prefix.

```bash
home_save() {
    _tui._layout            # ⚠ dabt-private-call: '_tui._layout' is a private DABT internal (lib/tui.sh:…)
    tui.render              # ✓ public
}
```

**Framework source is exempt.** A file under a `lib/` folder that contains `tui.sh` (all of DABT's own `lib/`, including `lib/markup/`, `lib/input/`, `lib/dapk/`, ...) is DABT itself, where private calls are normal. Plugins in `share/plugins/` are *not* exempt, because they're app code too.

Turn the rule off with `dabt.lint.flagPrivateCalls` if you really do need internals, for example while prototyping a patch to DABT.

## Don't own the tick loop

`_TUI_TICK_FN` is a legacy single slot. Assigning it replaces whatever was there, including the shared listener that `tui.exec`, `tui.every`, `tui.clock` and `tui.watch` use. `dabt-tick-clobber` warns on any assignment. Use `tui.tick.add` instead:

```bash
_TUI_TICK_FN=my_tick        # ⚠ dabt-tick-clobber
tui.tick.add my_tick        # ✓
```

## Never zero the mouse-drain peek

`TUI_MOUSE_DRAIN_PEEK_TIMEOUT` controls how mouse-motion events are coalesced. It must be greater than 0: `read -t 0` only checks whether input is available and never reads anything, so the drain stops working. `dabt-mouse-drain-zero` is the only **error**-level rule.

## Bash rules

| Rule | Why |
|---|---|
| `dabt-piped-while-read-subshell` | `cmd \| while read ...` runs the loop in a subshell, so variables set inside it are gone after the loop. This is the classic *"why isn't my state persisting"* bug. Use `while read ...; do ...; done < <(cmd)`. |
| `dabt-useless-cat` | `cat file \| grep x` forks an extra process. Use `grep x < file` (or `grep x file`). |
| `dabt-backtick-subst` | `` `cmd` `` doesn't nest cleanly. `$(cmd)` does the same job and is easier to read. |
| `dabt-echo-dash-e` | `echo -e` behaves differently across shells. Use `printf '%b\n'` or a format string, as DABT's renderers do. |

These rules check one line at a time and don't parse bash. They're tuned to rarely fire on correct code, but aren't guaranteed to catch every case.

## Turning linting off

| Setting | Effect |
|---|---|
| `dabt.lint.enable: false` | No DABT diagnostics at all. |
| `dabt.lint.flagPrivateCalls: false` | Everything except `dabt-private-call`. |

Settings can be per-workspace or per-folder, so you can lint your app strictly and leave a vendored tree alone.

## Pairing with ShellCheck

These rules are designed to sit next to [ShellCheck](https://www.shellcheck.net/) (e.g. via the `timonwong.shellcheck` extension), not replace it. ShellCheck knows bash; DABT Tools knows DABT. `dabt scan` also runs ShellCheck when it's installed. See [cli.md](cli.md).
