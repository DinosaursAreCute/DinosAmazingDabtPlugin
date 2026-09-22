import * as vscode from 'vscode';
import { apiIndex } from './apiData';
import { findInvocations } from './argTokenizer';
import { looksLikeDabtFile } from './fileHeuristics';

// Redirects (`>file`, `2>&1`, `<<EOF`) show up as trailing "words" on a
// command line but aren't positional arguments - don't let them consume a
// parameter slot or get mislabeled.
const REDIRECT_RE = /^\d*(>>?|<<?)/;

export class DabtInlayHintsProvider implements vscode.InlayHintsProvider {
    private emitter = new vscode.EventEmitter<void>();
    onDidChangeInlayHints = this.emitter.event;

    refresh() {
        this.emitter.fire();
    }

    provideInlayHints(document: vscode.TextDocument, range: vscode.Range): vscode.InlayHint[] {
        if (!looksLikeDabtFile(document)) return [];
        if (!vscode.workspace.getConfiguration('dabt').get<boolean>('inlayHints.enable', true)) return [];

        const hints: vscode.InlayHint[] = [];
        const startLine = range.start.line;
        const endLine = Math.min(range.end.line, document.lineCount - 1);

        for (let line = startLine; line <= endLine; line++) {
            const lineText = document.lineAt(line).text;
            for (const inv of findInvocations(lineText)) {
                const fn = apiIndex.get(inv.name);
                if (!fn?.params?.length) continue;

                let argIdx = 0;
                let skipNext = false;
                const lastParam = fn.params[fn.params.length - 1];
                const variadic = /\.\.\.$/.test(lastParam.name);

                for (const tok of inv.args) {
                    if (skipNext) {
                        skipNext = false;
                        continue;
                    }
                    if (REDIRECT_RE.test(tok.text)) {
                        skipNext = true; // the word right after > / < / << is the redirect target, not an arg
                        continue;
                    }
                    if (argIdx >= fn.params.length && !variadic) {
                        argIdx++;
                        continue;
                    }
                    const param = fn.params[Math.min(argIdx, fn.params.length - 1)];
                    const hint = new vscode.InlayHint(
                        new vscode.Position(line, tok.start),
                        `${param.name.replace(/\.\.\.$/, '')}${param.optional ? '?' : ''}:`,
                        vscode.InlayHintKind.Parameter
                    );
                    hint.paddingRight = true;
                    if (fn.paramsSource === 'inferred') {
                        hint.tooltip = new vscode.MarkdownString(
                            `Inferred from ${fn.name}'s body (no doc comment) - position is reliable, name may be generic.`
                        );
                    }
                    hints.push(hint);
                    argIdx++;
                }
            }
        }
        return hints;
    }
}
