// CodeLens above each function of a callback file: how many markup attributes name it.
// The reverse of go-to-definition on action="...". The workspace index is built on first
// use and dropped when any xml file changes.
import * as fs from 'fs';
import * as vscode from 'vscode';
import { pageLinks } from './callbackRefs';
import { isCallbackFile } from './fileHeuristics';
import { parseFunctionDefs } from './shellFunctions';
import { CALLBACK_ATTRS } from './xsdData';
import { isDabtXmlText } from './xmlHeuristics';

// script file -> function name -> the attribute values that name it
type RefIndex = Map<string, Map<string, vscode.Location[]>>;

async function buildIndex(): Promise<RefIndex> {
    const index: RefIndex = new Map();
    const files = await vscode.workspace.findFiles('**/*.xml', '**/{node_modules,.git}/**', 2000);
    for (const uri of files) {
        const open = vscode.workspace.textDocuments.find((d) => d.uri.toString() === uri.toString());
        let text: string;
        try {
            text = open ? open.getText() : fs.readFileSync(uri.fsPath, 'utf8');
        } catch {
            continue;
        }
        if (!isDabtXmlText(text)) continue;
        const dir = uri.fsPath.replace(/[\\/][^\\/]*$/, '');
        const links = pageLinks(text, dir, CALLBACK_ATTRS, fs.existsSync);
        if (!links.scripts.length || !links.refs.length) continue;

        const lineStarts = [0];
        for (let i = 0; i < text.length; i++) if (text[i] === '\n') lineStarts.push(i + 1);
        const position = (offset: number) => {
            let lo = 0;
            let hi = lineStarts.length - 1;
            while (lo < hi) {
                const mid = (lo + hi + 1) >> 1;
                if (lineStarts[mid] <= offset) lo = mid;
                else hi = mid - 1;
            }
            return new vscode.Position(lo, offset - lineStarts[lo]);
        };
        for (const script of links.scripts) {
            const byFn = index.get(script) ?? new Map<string, vscode.Location[]>();
            index.set(script, byFn);
            for (const ref of links.refs) {
                const list = byFn.get(ref.fn) ?? [];
                list.push(new vscode.Location(uri, new vscode.Range(position(ref.start), position(ref.end))));
                byFn.set(ref.fn, list);
            }
        }
    }
    return index;
}

export class DabtCallbackLensProvider implements vscode.CodeLensProvider {
    private index: Promise<RefIndex> | undefined;
    private changed = new vscode.EventEmitter<void>();
    readonly onDidChangeCodeLenses = this.changed.event;

    invalidate() {
        this.index = undefined;
        this.changed.fire();
    }

    dispose() {
        this.changed.dispose();
    }

    async provideCodeLenses(document: vscode.TextDocument): Promise<vscode.CodeLens[]> {
        if (!isCallbackFile(document) || !vscode.workspace.getConfiguration('dabt').get<boolean>('codeLens.enable', true)) {
            return [];
        }
        this.index ??= buildIndex();
        const byFn = (await this.index).get(document.uri.fsPath);
        const text = document.getText();
        const lenses: vscode.CodeLens[] = [];
        for (const def of parseFunctionDefs(text)) {
            if (def.name.startsWith('_')) continue; // helpers are not named from markup
            const uses = byFn?.get(def.name) ?? [];
            const calledInScript = new RegExp(`(?<![\\w.])${def.name.replace(/\./g, '\\.')}(?![\\w.])`, 'g');
            const inScript = (text.match(calledInScript)?.length ?? 0) - 1;
            const title =
                uses.length > 0
                    ? `${uses.length} markup ${uses.length === 1 ? 'use' : 'uses'}`
                    : inScript > 0
                      ? 'no markup use (called from script)'
                      : 'no markup use';
            lenses.push(
                new vscode.CodeLens(new vscode.Range(def.line, 0, def.line, 0), {
                    title,
                    command: 'dabt.showCallbackUses',
                    arguments: [def.name, uses],
                })
            );
        }
        return lenses;
    }
}

export async function showCallbackUses(name: string, uses: vscode.Location[]) {
    if (!uses.length) {
        vscode.window.showInformationMessage(`DABT: no markup attribute names '${name}'.`);
        return;
    }
    const picks = uses.map((loc) => ({
        label: `${vscode.workspace.asRelativePath(loc.uri)}:${loc.range.start.line + 1}`,
        loc,
    }));
    const chosen = picks.length === 1 ? picks[0] : await vscode.window.showQuickPick(picks, { placeHolder: `Uses of ${name}` });
    if (chosen) await vscode.window.showTextDocument(chosen.loc.uri, { selection: chosen.loc.range });
}
