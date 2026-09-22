import * as vscode from 'vscode';
import * as cp from 'child_process';
import * as path from 'path';
import * as fs from 'fs';

const output = vscode.window.createOutputChannel('DABT Profiler');

function activeShellFile(): vscode.TextDocument | undefined {
    const doc = vscode.window.activeTextEditor?.document;
    if (!doc || doc.languageId !== 'shellscript') {
        vscode.window.showWarningMessage('DABT: open a .sh file first.');
        return undefined;
    }
    return doc;
}

// Runs the current file under `bash -x` (with a PS4 that includes file:line)
// so control flow and fork-triggering command substitutions are visible as
// they happen, straight in the integrated terminal - real bash tracing, not
// a simulation.
export function debugTraceCurrentFile() {
    const doc = activeShellFile();
    if (!doc) return;
    doc.save();
    const term = vscode.window.createTerminal({ name: 'DABT Trace', cwd: path.dirname(doc.fileName) });
    term.show(true);
    term.sendText(
        `PS4='+ \${BASH_SOURCE##*/}:\${LINENO}: ' bash -x ${JSON.stringify(path.basename(doc.fileName))}`
    );
}

export function runCurrentFile() {
    const doc = activeShellFile();
    if (!doc) return;
    doc.save();
    const term = vscode.window.createTerminal({ name: 'DABT Run', cwd: path.dirname(doc.fileName) });
    term.show(true);
    term.sendText(`bash ${JSON.stringify(path.basename(doc.fileName))}`);
}

// Real measurement, not a heuristic: wraps the script with bash's own timing
// and counts processes forked while it ran via the "last PID" field of
// /proc/loadavg advancing - the same technique tools/debug/count_forks.sh
// uses in the DABT repo itself, generalized to any script (Linux only).
export async function profileCurrentFile() {
    const doc = activeShellFile();
    if (!doc) return;
    await doc.save();

    if (process.platform !== 'linux' || !fs.existsSync('/proc/loadavg')) {
        vscode.window.showWarningMessage('DABT: fork counting needs /proc/loadavg (Linux). Falling back to timing only.');
    }

    const file = doc.fileName;
    const dir = path.dirname(file);
    const base = path.basename(file);

    const script = [
        'set -f',
        'lastpid() { read -r _ _ _ _ _LP < /proc/loadavg 2>/dev/null || _LP=0; }',
        'lastpid; __start_pid=$_LP',
        '__t0=${EPOCHREALTIME/[.,]/}',
        `bash ${JSON.stringify(base)}`,
        '__status=$?',
        '__t1=${EPOCHREALTIME/[.,]/}',
        'lastpid; __end_pid=$_LP',
        'printf \'DABT_PROFILE exit=%d elapsed_us=%d forks=%d\\n\' "$__status" "$(( __t1 - __t0 ))" "$(( __end_pid - __start_pid ))"',
    ].join('\n');

    output.clear();
    output.show(true);
    output.appendLine(`$ bash ${base}   (profiling: wall time + process fork count)`);
    output.appendLine('');

    await new Promise<void>((resolve) => {
        const proc = cp.spawn('bash', ['-c', script], { cwd: dir });
        proc.stdout.on('data', (d: Buffer) => {
            const text = d.toString();
            const m = /DABT_PROFILE exit=(-?\d+) elapsed_us=(\d+) forks=(-?\d+)/.exec(text);
            if (m) {
                const [, exitCode, us, forks] = m;
                output.appendLine('');
                output.appendLine('── DABT profile summary ─────────────────────');
                output.appendLine(`  exit code : ${exitCode}`);
                output.appendLine(`  wall time : ${(Number(us) / 1000).toFixed(2)} ms`);
                output.appendLine(`  forks     : ${forks}  (processes created while the script ran)`);
                if (Number(forks) > 20) {
                    output.appendLine(`  note      : high fork count - look for $(...), backticks, pipes or loops spawning subprocesses (see "DABT: Count Subshells").`);
                }
                output.appendLine('──────────────────────────────────────────────');
            } else {
                output.append(text);
            }
        });
        proc.stderr.on('data', (d: Buffer) => output.append(d.toString()));
        proc.on('close', () => resolve());
    });
}
