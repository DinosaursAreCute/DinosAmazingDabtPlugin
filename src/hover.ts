import * as vscode from 'vscode';
import { apiIndex, docString } from './apiData';
import { explainIdentifier } from './abbreviations';
import { looksLikeDabtFile } from './fileHeuristics';

export class DabtHoverProvider implements vscode.HoverProvider {
    provideHover(document: vscode.TextDocument, position: vscode.Position): vscode.Hover | undefined {
        if (!looksLikeDabtFile(document)) return undefined;

        const range = document.getWordRangeAtPosition(position, /[A-Za-z_][A-Za-z0-9_.]*/);
        if (!range) return undefined;
        const word = document.getText(range);

        const fn = apiIndex.get(word);
        if (fn) return new vscode.Hover(docString(fn), range);

        // Not a known function - if it's an internal (_-prefixed) identifier
        // built from documented abbreviation segments (`_DLG_KIND` -> DLG,
        // KIND), explain those instead of leaving the hover empty.
        if (!word.startsWith('_')) return undefined;
        if (!vscode.workspace.getConfiguration('dabt').get<boolean>('abbreviations.enable', true)) return undefined;
        const parts = explainIdentifier(word);
        if (parts.length === 0) return undefined;
        return new vscode.Hover(abbrevDocString(word, parts), range);
    }
}

function abbrevDocString(word: string, parts: ReturnType<typeof explainIdentifier>): vscode.MarkdownString {
    const md = new vscode.MarkdownString();
    md.appendCodeblock(word, 'bash');
    for (const { abbr, meaning, subsystem } of parts) {
        md.appendMarkdown(`**${abbr}** — ${meaning}${subsystem ? ` _(${subsystem})_` : ''}\n\n`);
    }
    return md;
}
