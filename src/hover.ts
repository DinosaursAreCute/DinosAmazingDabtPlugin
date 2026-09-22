import * as vscode from 'vscode';
import { apiIndex, docString } from './apiData';
import { looksLikeDabtFile } from './fileHeuristics';

export class DabtHoverProvider implements vscode.HoverProvider {
    provideHover(document: vscode.TextDocument, position: vscode.Position): vscode.Hover | undefined {
        if (!looksLikeDabtFile(document)) return undefined;

        const range = document.getWordRangeAtPosition(position, /[A-Za-z_][A-Za-z0-9_.]*/);
        if (!range) return undefined;
        const word = document.getText(range);

        const fn = apiIndex.get(word);
        if (!fn) return undefined;
        return new vscode.Hover(docString(fn), range);
    }
}
