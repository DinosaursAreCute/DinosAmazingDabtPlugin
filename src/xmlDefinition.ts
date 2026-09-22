import * as fs from 'fs';
import * as path from 'path';
import * as vscode from 'vscode';
import { apiIndex } from './apiData';
import { CALLBACK_ATTRS } from './xsdData';
import { isDabtXmlDocument, findFunctionDefsInFile, findScriptSrcs } from './xmlHeuristics';

const ATTR_RE = /([A-Za-z_][\w-]*)\s*=\s*"([^"]*)"/g;
const SRC_ATTRS = new Set(['src', 'page']);

// Ctrl+click / F12 on action="fn_name" (etc.) jumps straight to that
// function's def in the paired callbacks file; on src="foo.xml" / page="..."
// it jumps to that file. The cross-reference DABT's own tooling has no
// equivalent for, since the markup and the bash are two different files
// with no language-level link between them.
export class DabtXmlDefinitionProvider implements vscode.DefinitionProvider {
    provideDefinition(document: vscode.TextDocument, position: vscode.Position): vscode.ProviderResult<vscode.Location> {
        if (!isDabtXmlDocument(document)) return undefined;
        const line = document.lineAt(position.line);

        for (const am of line.text.matchAll(ATTR_RE)) {
            const [full, attrName, value] = am;
            const valueStart = (am.index ?? 0) + full.indexOf(value, attrName.length);
            const valueEnd = valueStart + value.length;
            if (position.character < valueStart || position.character > valueEnd) continue;

            if (CALLBACK_ATTRS.has(attrName)) {
                const fnName = value.split(/\s+/)[0];
                if (apiIndex.get(fnName)) return undefined; // built-in DABT command, no local file to jump to
                for (const scriptPath of findScriptSrcs(document)) {
                    const fn = findFunctionDefsInFile(scriptPath).find((f) => f.name === fnName);
                    if (fn) return new vscode.Location(vscode.Uri.file(scriptPath), new vscode.Position(fn.line, 0));
                }
                return undefined;
            }

            if (SRC_ATTRS.has(attrName) && value.trim()) {
                const dir = path.dirname(document.uri.fsPath);
                const resolved = path.resolve(dir, value);
                if (fs.existsSync(resolved)) return new vscode.Location(vscode.Uri.file(resolved), new vscode.Position(0, 0));
            }
        }
        return undefined;
    }
}
