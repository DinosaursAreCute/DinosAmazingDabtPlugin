// Outline entries: DABT pages by pane/widget id with their nesting, and callback files by
// function (callback vs `_`-prefixed helper).
import * as vscode from 'vscode';
import { isCallbackFile } from './fileHeuristics';
import { parseFunctionDefs } from './shellFunctions';
import { isDabtXmlDocument } from './xmlHeuristics';
import { scanXml } from './xmlScan';

const KIND: Record<string, vscode.SymbolKind> = {
    tui: vscode.SymbolKind.Module,
    pane: vscode.SymbolKind.Namespace,
    tabs: vscode.SymbolKind.Namespace,
    tab: vscode.SymbolKind.Namespace,
    details: vscode.SymbolKind.Namespace,
    accordion: vscode.SymbolKind.Namespace,
    template: vscode.SymbolKind.Class,
    component: vscode.SymbolKind.Class,
    addon: vscode.SymbolKind.Class,
    script: vscode.SymbolKind.File,
    include: vscode.SymbolKind.File,
    theme: vscode.SymbolKind.File,
};
const LABEL_ATTRS = ['id', 'name', 'src'];

export class DabtXmlSymbolProvider implements vscode.DocumentSymbolProvider {
    provideDocumentSymbols(document: vscode.TextDocument): vscode.DocumentSymbol[] {
        if (!isDabtXmlDocument(document)) return [];
        const text = document.getText();
        const elements = scanXml(text);
        const symbols = new Map<number, vscode.DocumentSymbol>();
        const roots: vscode.DocumentSymbol[] = [];
        const nearest = (parent: number): number => {
            while (parent !== -1 && !symbols.has(parent)) parent = elements[parent].parent;
            return parent;
        };
        elements.forEach((el, index) => {
            const labelAttr = LABEL_ATTRS.map((n) => el.attrs.find((a) => a.name === n)).find((a) => a?.value);
            const isStructural = el.name === 'tui' || (!el.selfClosing && el.name in KIND);
            if (!labelAttr && !isStructural) return;
            const range = new vscode.Range(document.positionAt(el.start), document.positionAt(el.end));
            const selection = new vscode.Range(document.positionAt(el.nameStart), document.positionAt(el.nameStart + el.name.length));
            const symbol = new vscode.DocumentSymbol(
                labelAttr ? labelAttr.value : `<${el.name}>`,
                labelAttr ? el.name : '',
                KIND[el.name] ?? vscode.SymbolKind.Field,
                range,
                selection
            );
            symbols.set(index, symbol);
            const parent = nearest(el.parent);
            (parent === -1 ? roots : symbols.get(parent)!.children).push(symbol);
        });
        return roots;
    }
}

export class DabtShellSymbolProvider implements vscode.DocumentSymbolProvider {
    provideDocumentSymbols(document: vscode.TextDocument): vscode.DocumentSymbol[] {
        if (!isCallbackFile(document)) return [];
        return parseFunctionDefs(document.getText()).map((def) => {
            const range = document.lineAt(def.line).range;
            return new vscode.DocumentSymbol(
                def.name,
                def.name.startsWith('_') ? 'helper' : 'callback',
                vscode.SymbolKind.Function,
                range,
                range
            );
        });
    }
}
