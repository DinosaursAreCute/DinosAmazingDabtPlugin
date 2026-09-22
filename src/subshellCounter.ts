// Heuristic (non-parser) counter for subshell-forking bash constructs:
// command substitution $(...), process substitution <(...) / >(...),
// standalone ( ... ) subshells, pipeline stages (each `|` forks a stage
// in the default bash pipeline model), and background jobs (`&`).
//
// This intentionally does NOT implement a full bash grammar (no heredoc
// skipping, best-effort quote tracking). It exists to give DABT authors a
// quick "how forky is this file" signal for tick/hot-path code. Treat counts as
// approximate, not authoritative.

export type ForkKind = 'cmdSubst' | 'procSubst' | 'subshell' | 'pipeline' | 'background';

export interface ForkHit {
    kind: ForkKind;
    line: number; // 0-based
    col: number; // 0-based
}

export interface SubshellReport {
    hits: ForkHit[];
    counts: Record<ForkKind, number>;
    total: number;
}

type FrameType = 'cmdsubst' | 'procsubst' | 'subshell' | 'arraylit' | 'arith' | 'plain';

function isStatementStart(prevNonSpace: string | undefined): boolean {
    if (prevNonSpace === undefined) return true;
    return [';', '&', '|', '\n', '{', '('].includes(prevNonSpace);
}

export function countSubshells(text: string): SubshellReport {
    const hits: ForkHit[] = [];
    const counts: Record<ForkKind, number> = {
        cmdSubst: 0,
        procSubst: 0,
        subshell: 0,
        pipeline: 0,
        background: 0,
    };

    let line = 0;
    let col = 0;
    let i = 0;
    const n = text.length;

    let single = false;
    let double = false;
    let backtick = false;
    let lastNonSpace: string | undefined = undefined;
    const stack: FrameType[] = [];

    function record(kind: ForkKind) {
        counts[kind]++;
        hits.push({ kind, line, col });
    }

    function advance(count: number) {
        for (let k = 0; k < count; k++) {
            if (text[i] === '\n') {
                line++;
                col = 0;
            } else {
                col++;
            }
            i++;
        }
    }

    while (i < n) {
        const ch = text[i];

        if (single) {
            if (ch === "'") single = false;
            advance(1);
            continue;
        }
        if (double) {
            if (ch === '\\') {
                advance(2);
                continue;
            }
            if (ch === '"') {
                double = false;
                advance(1);
                continue;
            }
            // $(...) and `...` still expand inside double quotes - fall through
            // to the shared handling below for those two cases only.
            if (ch !== '$' && ch !== '`') {
                advance(1);
                continue;
            }
        }

        if (!double && ch === "'") {
            single = true;
            advance(1);
            continue;
        }
        if (!double && ch === '"') {
            double = true;
            advance(1);
            continue;
        }
        if (!double && ch === '#') {
            while (i < n && text[i] !== '\n') advance(1);
            continue;
        }

        if (ch === '`') {
            if (backtick) {
                backtick = false;
            } else {
                backtick = true;
                record('cmdSubst');
            }
            advance(1);
            continue;
        }

        if (text.slice(i, i + 3) === '$((') {
            stack.push('arith', 'arith');
            advance(3);
            continue;
        }
        if (text.slice(i, i + 2) === '((' && isStatementStart(lastNonSpace)) {
            stack.push('arith', 'arith');
            advance(2);
            continue;
        }
        if (ch === '$' && text[i + 1] === '(') {
            stack.push('cmdsubst');
            record('cmdSubst');
            advance(2);
            continue;
        }
        if ((ch === '<' || ch === '>') && text[i + 1] === '(') {
            stack.push('procsubst');
            record('procSubst');
            advance(2);
            continue;
        }
        if (ch === '=' && text[i + 1] === '(') {
            stack.push('arraylit');
            advance(2);
            continue;
        }
        if (ch === '(') {
            if (isStatementStart(lastNonSpace)) {
                stack.push('subshell');
                record('subshell');
            } else {
                stack.push('plain');
            }
            advance(1);
            continue;
        }
        if (ch === ')') {
            stack.pop();
            advance(1);
            lastNonSpace = ch;
            continue;
        }

        if (!double && !single) {
            if (ch === '|' && text[i + 1] !== '|' && lastNonSpace !== '|') {
                record('pipeline');
                advance(1);
                lastNonSpace = ch;
                continue;
            }
            if (ch === '&' && text[i + 1] !== '&' && lastNonSpace !== '&' && lastNonSpace !== '|') {
                record('background');
                advance(1);
                lastNonSpace = ch;
                continue;
            }
        }

        if (ch !== ' ' && ch !== '\t') lastNonSpace = ch === '\n' ? undefined : ch;
        else if (lastNonSpace !== undefined) {
            /* keep lastNonSpace across intra-line whitespace */
        }
        advance(1);
    }

    const total = Object.values(counts).reduce((a, b) => a + b, 0);
    return { hits, counts, total };
}
