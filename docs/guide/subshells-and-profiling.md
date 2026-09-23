# Forks and profiling

In bash, `$(...)` or a pipe starts a new process, and each one costs around a millisecond. That doesn't matter in a one-off script. In a TUI that redraws on every keypress and mouse move, it's the difference between smooth and sluggish. DABT's own rule is *"subshells are a last resort"*. These tools show you where your forks are.

## Fork counter (status bar)

For the active shell file, the status bar shows a live count, for example **`7 forks`** (with a terminal icon). Hover it for a breakdown:

| Kind | Construct |
|---|---|
| command substitution | `$(...)` and backticks |
| process substitution | `<(...)`, `>(...)` |
| explicit subshell | `( ... )` at the start of a statement |
| pipeline stage | each `\|` |
| background job | a trailing `&` |

Array literals `a=( ... )` and arithmetic `(( ... ))` are **not** counted, because they don't fork. The count is a **static heuristic**, not a bash parser. It follows quotes but not heredocs, so treat it as a quick signal rather than an exact number. Use the profiler below for exact numbers.

Hide it with `dabt.subshells.showInStatusBar`.

## Per-line report

Click the counter, or run **DABT: Count Subshells in Current File**. The *DABT Subshells* output channel then lists the totals by kind and every hit as `line:col  kind`, so you can go straight to each fork.

## Workspace report

**DABT: Subshell Report for Workspace** scans up to 500 `.sh` files (skipping `node_modules`). It prints workspace totals by kind and the **top 25 files by fork count**. Start there when you optimize.

## Profile Current Script

**DABT: Profile Current Script** (also in the editor's right-click menu) saves the file, runs it with `bash` from its own folder, and reports **measured** numbers in the *DABT Profiler* channel:

```
── DABT profile summary ─────────────────────
  exit code : 0
  wall time : 42.17 ms
  forks     : 12  (processes created while the script ran)
──────────────────────────────────────────────
```

The fork count comes from the "last PID" field of `/proc/loadavg`, read before and after the run. That's the same method as DABT's own `tools/debug/count_forks.sh`. Above 20 forks it suggests where to look. The count is system-wide, so other processes starting at the same moment are included; run it twice if a number looks off.

Linux only for the fork count. Elsewhere you still get wall time and exit code. The script's output goes to the channel, so this suits scripts that finish on their own (benchmarks, builders, render tests), not a full-screen interactive app.

## Debug trace

**DABT: Debug Trace Current Script (bash -x)** runs the file in a *DABT Trace* terminal with:

```bash
PS4='+ ${BASH_SOURCE##*/}:${LINENO}: ' bash -x script.sh
```

Every traced line is prefixed with `file:line`, so you can see which command substitution ran, from where, and in what order.

## Run Current Script

**DABT: Run Current Script** simply saves the file and runs `bash script.sh` in a *DABT Run* terminal. Use it for interactive apps.
