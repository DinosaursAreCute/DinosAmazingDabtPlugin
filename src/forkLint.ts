// Finds external-command uses that have a fork-free bash equivalent. Runs on the
// `code` view of a line (see shellMask.ts). Advice only: outside input, layout and
// paint paths a fork is fine, so the rule is Information severity.
export interface ForkFinding {
    start: number;
    length: number;
    command: string;
    advice: string;
}

const ADVICE: Record<string, string> = {
    basename: "'${path##*/}' (and '${name%.ext}' for a suffix)",
    dirname: "'${path%/*}'",
    date: "'printf -v VAR \"%(%F %T)T\" -1'",
    sed: "parameter expansion ('${v/pat/rep}', '${v//pat/rep}') or '[[ $v =~ re ]]' with BASH_REMATCH",
    awk: "'read -r a b <<<\"$line\"' or '[[ $v =~ re ]]' with BASH_REMATCH",
    cut: "'IFS=: read -r a b <<<\"$v\"' or parameter expansion",
    tr: "'${v^^}', '${v,,}' or '${v//a/b}'",
    wc: "'${#v}' or 'mapfile -t arr < file; ${#arr[@]}'",
    head: "'read -r line < file' or 'mapfile -n N'",
    tail: "'mapfile -t arr < file' and index from the end",
    expr: "'$(( ... ))'",
    seq: "'{1..N}' or 'for (( i=0; i<N; i++ ))'",
};

// A command word: at the start of a line or a pipeline/list element, after `$(`, or after then/do/else.
const COMMAND_RE = new RegExp(
    `(?:^|[|;&(]|\\$\\(|\\b(?:then|do|else)\\s)\\s*(${Object.keys(ADVICE).join('|')})(?=\\s|$|;|\\))`,
    'g'
);
const SUBST_ECHO_RE = /\$\(\s*(echo|printf)\b/g;

export function findForkCalls(code: string): ForkFinding[] {
    const out: ForkFinding[] = [];
    for (const m of code.matchAll(COMMAND_RE)) {
        const command = m[1];
        const start = (m.index ?? 0) + m[0].lastIndexOf(command);
        out.push({ start, length: command.length, command, advice: ADVICE[command] });
    }
    for (const m of code.matchAll(SUBST_ECHO_RE)) {
        const command = m[1];
        out.push({
            start: m.index ?? 0,
            length: m[0].length,
            command: `$(${command}`,
            advice: command === 'echo' ? 'assign the value directly' : "'printf -v VAR ...'",
        });
    }
    return out;
}
