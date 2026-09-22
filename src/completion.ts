import * as vscode from 'vscode';
import { apiIndex, docString } from './apiData';
import { looksLikeDabtFile } from './fileHeuristics';

// Word chars for a dotted bash identifier like `tui.ansi` or `_tui._split`.
const IDENT_RE = /[A-Za-z_][A-Za-z0-9_.]*$/;

export class DabtCompletionProvider implements vscode.CompletionItemProvider {
    provideCompletionItems(
        document: vscode.TextDocument,
        position: vscode.Position
    ): vscode.CompletionItem[] | undefined {
        if (!looksLikeDabtFile(document)) return undefined;

        const linePrefix = document.lineAt(position).text.slice(0, position.character);
        const m = IDENT_RE.exec(linePrefix);
        const prefix = m ? m[0] : '';

        // Only offer dabt completions once the user has typed a namespace-ish
        // prefix (tui., dabt., _tui., or at least 2 chars) so this doesn't
        // drown out normal bash completions on every keystroke.
        if (prefix.length < 2 && !prefix.includes('.')) return undefined;

        const items: vscode.CompletionItem[] = [];
        for (const fn of apiIndex.all()) {
            if (!fn.name.startsWith(prefix)) continue;
            const item = new vscode.CompletionItem(
                fn.name,
                fn.private ? vscode.CompletionItemKind.Field : vscode.CompletionItemKind.Function
            );
            item.detail = fn.private ? 'DABT (private)' : 'DABT API';
            item.documentation = docString(fn);
            item.insertText = fn.name;
            if (fn.private) {
                // Still offered (useful when editing DABT's own lib/), but sorted
                // after public API and visibly marked so app authors don't reach
                // for it by accident.
                item.sortText = '1_' + fn.name;
                item.label = { label: fn.name, description: 'private' };
            } else {
                item.sortText = '0_' + fn.name;
            }
            items.push(item);
        }
        return items;
    }
}
