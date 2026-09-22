// Single-line, quote/paren-aware word tokenizer for bash "simple commands".
// Used by both inlay hints and signature help to answer "what word is the
// command name, and what words are its positional arguments" - the one
// thing bash's own syntax gives you zero help with (no parens, no commas).
//
// Heuristic like subshellCounter: good enough to drive editor UX, not a
// bash grammar. Single line only (multi-line commands via trailing `\` or
// heredocs aren't tracked).

export interface Token {
    text: string;
    start: number;
    end: number; // exclusive
    isOperator: boolean; // one of ; | & && || separating simple commands
}

export interface Invocation {
    name: string;
    nameStart: number;
    nameEnd: number;
    args: Token[];
}

export function tokenizeLine(line: string): Token[] {
    const tokens: Token[] = [];
    const n = line.length;
    let i = 0;
    let single = false;
    let double = false;
    let backtick = false;
    let parenDepth = 0;
    let wordStart = -1;

    const flushWord = (end: number) => {
        if (wordStart !== -1) {
            tokens.push({ text: line.slice(wordStart, end), start: wordStart, end, isOperator: false });
            wordStart = -1;
        }
    };

    while (i < n) {
        const ch = line[i];

        if (single) {
            if (ch === "'") single = false;
            i++;
            continue;
        }
        if (double) {
            if (ch === '\\') {
                i += 2;
                continue;
            }
            if (ch === '"') double = false;
            i++;
            continue;
        }
        if (backtick) {
            if (ch === '`') backtick = false;
            i++;
            continue;
        }

        if (parenDepth === 0 && !single && !double && !backtick) {
            if (ch === ' ' || ch === '\t') {
                flushWord(i);
                i++;
                continue;
            }
            if (ch === ';' || ch === '|' || ch === '&') {
                flushWord(i);
                const two = line.slice(i, i + 2);
                if (two === '&&' || two === '||') {
                    tokens.push({ text: two, start: i, end: i + 2, isOperator: true });
                    i += 2;
                } else {
                    tokens.push({ text: ch, start: i, end: i + 1, isOperator: true });
                    i += 1;
                }
                continue;
            }
        }

        if (wordStart === -1 && ch !== ' ' && ch !== '\t') wordStart = i;

        if (ch === "'") single = true;
        else if (ch === '"') double = true;
        else if (ch === '`') backtick = true;
        else if (ch === '#' && parenDepth === 0 && !single && !double && !backtick) {
            // comment start outside a substitution: rest of line is not code
            break;
        } else if (ch === '(') parenDepth++;
        else if (ch === ')') parenDepth = Math.max(0, parenDepth - 1);

        i++;
    }
    flushWord(n);
    return tokens;
}

// Groups tokens into simple commands split at ; | & && || and picks out
// each one's leading word as the command name + the rest as positional args.
export function findInvocations(line: string): Invocation[] {
    const tokens = tokenizeLine(line);
    const invocations: Invocation[] = [];
    let segment: Token[] = [];

    const flushSegment = () => {
        if (segment.length === 0) return;
        const [first, ...rest] = segment;
        invocations.push({ name: first.text, nameStart: first.start, nameEnd: first.end, args: rest });
        segment = [];
    };

    for (const t of tokens) {
        if (t.isOperator) {
            flushSegment();
        } else {
            segment.push(t);
        }
    }
    flushSegment();
    return invocations;
}
