import * as fs from 'fs';
import * as path from 'path';
import * as vscode from 'vscode';
import { parseFunctionDefs } from './shellFunctions';

// Real DABT pages are plain `.xml` (root <tui>), not a special extension -
// so this keys off content, the same way looksLikeDabtFile does for shell
// scripts, rather than requiring any particular file name.
export function isDabtXmlDocument(document: vscode.TextDocument): boolean {
    return document.languageId === 'xml' && isDabtXmlText(document.getText());
}

export function isDabtXmlText(text: string): boolean {
    return /<tui[\s>]/.test(text) || /<pane[\s>]/.test(text) || /noNamespaceSchemaLocation="[^"]*tui\.xsd"/.test(text);
}

// `<script src="foo_callbacks.sh"/>` - resolved relative to the document's
// own directory, filtered to files that actually exist on disk. This is
// what powers "hover/go-to-definition on action=... jumps to the callback".
export function findScriptSrcs(document: vscode.TextDocument): string[] {
    const dir = path.dirname(document.uri.fsPath);
    const out: string[] = [];
    for (const m of document.getText().matchAll(/<script\s+src="([^"]+)"/g)) {
        const resolved = path.resolve(dir, m[1]);
        if (fs.existsSync(resolved)) out.push(resolved);
    }
    return out;
}

// `<theme src="theme.css"/>` - resolved relative to the document's own
// directory. Powers class="..." completion and color swatches.
export function findThemeSrcs(document: vscode.TextDocument): string[] {
    const dir = path.dirname(document.uri.fsPath);
    const out: string[] = [];
    for (const m of document.getText().matchAll(/<theme\s+src="([^"]+)"/g)) {
        const resolved = path.resolve(dir, m[1]);
        if (fs.existsSync(resolved)) out.push(resolved);
    }
    return out;
}

// `<pane id="X" .../>` ids declared anywhere in the document - for pane="..."
// attribute-value completion.
export function findPaneIds(document: vscode.TextDocument): string[] {
    const ids = new Set<string>();
    for (const m of document.getText().matchAll(/<pane\s[^>]*\bid="([^"]+)"/g)) ids.add(m[1]);
    return Array.from(ids);
}

// Sibling *.xml files in the same directory - for page="..." completion
// (buttons navigate between pages by file name).
export function findSiblingXmlFiles(document: vscode.TextDocument): string[] {
    const dir = path.dirname(document.uri.fsPath);
    try {
        return fs
            .readdirSync(dir)
            .filter((f) => f.endsWith('.xml') && f !== path.basename(document.uri.fsPath));
    } catch {
        return [];
    }
}

// Function definitions found in a callback file (see shellFunctions.ts).
export function findFunctionDefsInFile(absPath: string): Array<{ name: string; line: number }> {
    try {
        return parseFunctionDefs(fs.readFileSync(absPath, 'utf8'));
    } catch {
        return [];
    }
}
