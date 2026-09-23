import * as vscode from 'vscode';
import { apiIndex, isPrivateName } from './apiData';
import { isDabtFrameworkSource, looksLikeDabtFile } from './fileHeuristics';

const CALL_RE = /(?<![.\w])((?:_tui\.[A-Za-z0-9_.]+)|(?:_tui_[A-Za-z0-9_.]+)|(?:_exec_[A-Za-z0-9_.]+)|(?:_tr_[A-Za-z0-9_.]+)|(?:_[A-Za-z][A-Za-z0-9_.]*))\s*(?=\S|\s*$)/g;

interface Rule {
    id: string;
    severity: vscode.DiagnosticSeverity;
    // Returns diagnostics for a single line of source (fast, avoids a real parser).
    check(lineText: string, lineNo: number, ctx: RuleContext): vscode.Diagnostic[];
}

interface RuleContext {
    document: vscode.TextDocument;
    isFrameworkSource: boolean;
}

function mkDiag(
    line: number,
    startCol: number,
    endCol: number,
    message: string,
    severity: vscode.DiagnosticSeverity,
    code: string
): vscode.Diagnostic {
    const d = new vscode.Diagnostic(new vscode.Range(line, startCol, line, endCol), message, severity);
    d.code = code;
    d.source = 'dabt';
    return d;
}

// Rule 1: calling DABT private internals from app/callback code.
const privateCallRule: Rule = {
    id: 'dabt-private-call',
    severity: vscode.DiagnosticSeverity.Warning,
    check(lineText, lineNo, ctx) {
        if (ctx.isFrameworkSource) return [];
        const trimmed = lineText.trimStart();
        if (trimmed.startsWith('#')) return [];
        const out: vscode.Diagnostic[] = [];
        for (const m of lineText.matchAll(CALL_RE)) {
            const name = m[1];
            if (!isPrivateName(name)) continue;
            // Skip local variable references like `_my_local_var` that aren't
            // calls: require the token to be a known private DABT function,
            // OR to be immediately followed by `(` (a definition/call shape)
            // and match a dabt-style prefix (_tui./_tui_/_exec_/_tr_), so we
            // don't flag every project-local leading-underscore helper.
            const known = apiIndex.get(name);
            const dabtShaped = /^_tui\.|^_tui_|^_exec_|^_tr_/.test(name);
            if (!known && !dabtShaped) continue;
            const start = m.index ?? 0;
            out.push(
                mkDiag(
                    lineNo,
                    start,
                    start + name.length,
                    `'${name}' is a private DABT internal${known ? ` (${known.file}:${known.line})` : ''} - callback/app code should use the public tui.* API, not internals prefixed _tui./_exec_/_tr_/_ like this one.`,
                    vscode.DiagnosticSeverity.Warning,
                    'dabt-private-call'
                )
            );
        }
        return out;
    },
};

// Rule 2: clobbering the legacy single-slot tick hook instead of tui.tick.add.
const tickClobberRule: Rule = {
    id: 'dabt-tick-clobber',
    severity: vscode.DiagnosticSeverity.Warning,
    check(lineText, lineNo, ctx) {
        if (ctx.isFrameworkSource) return [];
        const m = /\b_TUI_TICK_FN\s*=/.exec(lineText);
        if (!m) return [];
        return [
            mkDiag(
                lineNo,
                m.index,
                m.index + m[0].length,
                `Overwriting _TUI_TICK_FN clobbers any other page-level tick hook. Use tui.tick.add instead `,
                vscode.DiagnosticSeverity.Warning,
                'dabt-tick-clobber'
            ),
        ];
    },
};

// Rule 3: setting the mouse-drain peek timeout to 0, which turns a pure
// availability probe (`read -t 0`) into something else entirely per the
// comment DABT keeps at the top of tui.sh.
const mouseDrainRule: Rule = {
    id: 'dabt-mouse-drain-zero',
    severity: vscode.DiagnosticSeverity.Error,
    check(lineText, lineNo) {
        const m = /\bTUI_MOUSE_DRAIN_PEEK_TIMEOUT\s*=\s*0\b/.exec(lineText);
        if (!m) return [];
        return [
            mkDiag(
                lineNo,
                m.index,
                m.index + m[0].length,
                `TUI_MOUSE_DRAIN_PEEK_TIMEOUT must never be 0 / tui.sh header comment.`,
                vscode.DiagnosticSeverity.Error,
                'dabt-mouse-drain-zero'
            ),
        ];
    },
};

// Rule 4: general bash smells that are suboptimal in any script, DABT or not.
const uselessCatRule: Rule = {
    id: 'dabt-useless-cat',
    severity: vscode.DiagnosticSeverity.Information,
    check(lineText, lineNo) {
        const out: vscode.Diagnostic[] = [];
        for (const m of lineText.matchAll(/\bcat\s+(\S+)\s*\|\s*([A-Za-z0-9_.]+)/g)) {
            out.push(
                mkDiag(
                    lineNo,
                    m.index ?? 0,
                    (m.index ?? 0) + m[0].length,
                    `Useless use of cat: '${m[2]} < ${m[1]}' (or '${m[2]} "${m[1]}"' if it supports it) avoids an extra fork.`,
                    vscode.DiagnosticSeverity.Information,
                    'dabt-useless-cat'
                )
            );
        }
        return out;
    },
};

const backtickRule: Rule = {
    id: 'dabt-backtick-subst',
    severity: vscode.DiagnosticSeverity.Information,
    check(lineText, lineNo) {
        const out: vscode.Diagnostic[] = [];
        // Cheap heuristic: an even backtick count on the line, take pairs.
        const idxs: number[] = [];
        for (let i = 0; i < lineText.length; i++) if (lineText[i] === '`') idxs.push(i);
        for (let p = 0; p + 1 < idxs.length; p += 2) {
            out.push(
                mkDiag(
                    lineNo,
                    idxs[p],
                    idxs[p + 1] + 1,
                    `Backtick command substitution - prefer $(...) (nests cleanly, easier to read).`,
                    vscode.DiagnosticSeverity.Information,
                    'dabt-backtick-subst'
                )
            );
        }
        return out;
    },
};

const echoDashERule: Rule = {
    id: 'dabt-echo-dash-e',
    severity: vscode.DiagnosticSeverity.Information,
    check(lineText, lineNo) {
        const m = /\becho\s+-e\b/.exec(lineText);
        if (!m) return [];
        return [
            mkDiag(
                lineNo,
                m.index,
                m.index + m[0].length,
                `'echo -e' is non-portable (dash/sh treat -e literally). Use printf '%b\\n' or plain printf format strings - DABT's own renderers do this throughout terminal_renderer.sh.`,
                vscode.DiagnosticSeverity.Information,
                'dabt-echo-dash-e'
            ),
        ];
    },
};

// Rule: catch a whole-file pipe into a `while read` loop, which runs the
// loop body in a subshell - variable writes inside it vanish after the
// loop. This is the single most common "why isn't my state persisting"
// bug in bash. DABT's own code routes around it with `< <(...)`.
const pipedWhileReadRule: Rule = {
    id: 'dabt-piped-while-read-subshell',
    severity: vscode.DiagnosticSeverity.Warning,
    check(lineText, lineNo) {
        const m = /\|\s*while\s+(read|IFS=)/.exec(lineText);
        if (!m) return [];
        return [
            mkDiag(
                lineNo,
                m.index,
                m.index + m[0].length,
                `Piping into 'while read' runs the loop in a subshell - variables set inside it won't survive the loop. Use 'while read ...; do ...; done < <(cmd)' (process substitution) instead.`,
                vscode.DiagnosticSeverity.Warning,
                'dabt-piped-while-read-subshell'
            ),
        ];
    },
};

const RULES: Rule[] = [
    privateCallRule,
    tickClobberRule,
    mouseDrainRule,
    uselessCatRule,
    backtickRule,
    echoDashERule,
    pipedWhileReadRule,
];

export class DabtDiagnostics {
    private collection = vscode.languages.createDiagnosticCollection('dabt');

    dispose() {
        this.collection.dispose();
    }

    lint(document: vscode.TextDocument) {
        if (!looksLikeDabtFile(document) || document.languageId !== 'shellscript') {
            this.collection.delete(document.uri);
            return;
        }
        const enabled = vscode.workspace.getConfiguration('dabt').get<boolean>('lint.enable', true);
        if (!enabled) {
            this.collection.delete(document.uri);
            return;
        }
        const flagPrivate = vscode.workspace.getConfiguration('dabt').get<boolean>('lint.flagPrivateCalls', true);

        const ctx: RuleContext = {
            document,
            isFrameworkSource: isDabtFrameworkSource(document),
        };

        const diags: vscode.Diagnostic[] = [];
        const lineCount = document.lineCount;
        for (let i = 0; i < lineCount; i++) {
            const lineText = document.lineAt(i).text;
            for (const rule of RULES) {
                if (rule.id === 'dabt-private-call' && !flagPrivate) continue;
                diags.push(...rule.check(lineText, i, ctx));
            }
        }
        this.collection.set(document.uri, diags);
    }

    clear(uri: vscode.Uri) {
        this.collection.delete(uri);
    }
}
