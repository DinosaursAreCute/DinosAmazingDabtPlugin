// Per-line views of shell source for the line-based lint rules. Both views have the
// length of the input, so a match column in a view is a column in the document.
//   noComment  comment tails and single-quoted text blanked; double-quoted text kept
//              (`$(...)` and backticks run inside double quotes)
//   code       additionally blanks double-quoted text, so a rule sees only what the shell parses as words
// A quoted span is blanked with 'x' (the token keeps its shape), a comment with spaces.
// State does not carry across lines: a multi-line string or heredoc is read line by line.
export interface LineViews {
    noComment: string;
    code: string;
}

const COMMENT_PRECEDERS = /[\s;&|(]/;

export function maskLine(line: string): LineViews {
    const noComment: string[] = [];
    const code: string[] = [];
    let quote: '' | "'" | '"' = '';
    let inComment = false;

    for (let i = 0; i < line.length; i++) {
        const ch = line[i];
        if (inComment) {
            noComment.push(' ');
            code.push(' ');
            continue;
        }
        if (quote === "'") {
            if (ch === "'") {
                quote = '';
                noComment.push(ch);
                code.push(ch);
            } else {
                noComment.push('x');
                code.push('x');
            }
            continue;
        }
        if (ch === '\\' && i + 1 < line.length) {
            noComment.push(ch, line[i + 1]);
            code.push(ch, quote === '"' ? 'x' : line[i + 1]);
            i++;
            continue;
        }
        if (quote === '"') {
            if (ch === '"') {
                quote = '';
                noComment.push(ch);
                code.push(ch);
            } else {
                noComment.push(ch);
                code.push('x');
            }
            continue;
        }
        if (ch === "'" || ch === '"') {
            quote = ch;
            noComment.push(ch);
            code.push(ch);
            continue;
        }
        if (ch === '#' && (i === 0 || COMMENT_PRECEDERS.test(line[i - 1]))) {
            inComment = true;
            noComment.push(' ');
            code.push(' ');
            continue;
        }
        noComment.push(ch);
        code.push(ch);
    }
    return { noComment: noComment.join(''), code: code.join('') };
}
