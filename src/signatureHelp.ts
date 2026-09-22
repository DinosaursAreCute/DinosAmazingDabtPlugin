import * as vscode from 'vscode';
import { apiIndex } from './apiData';
import { findInvocations } from './argTokenizer';
import { looksLikeDabtFile } from './fileHeuristics';

export class DabtSignatureHelpProvider implements vscode.SignatureHelpProvider {
    provideSignatureHelp(document: vscode.TextDocument, position: vscode.Position): vscode.SignatureHelp | undefined {
        if (!looksLikeDabtFile(document)) return undefined;

        const lineText = document.lineAt(position.line).text;
        const offset = position.character;
        const invocations = findInvocations(lineText);

        for (let idx = 0; idx < invocations.length; idx++) {
            const inv = invocations[idx];
            if (offset < inv.nameStart) continue;

            const fn = apiIndex.get(inv.name);
            if (!fn?.params?.length) continue;

            // The invocation "owns" everything from its name up to the start
            // of the next one (or end of line, for the last segment) - lets
            // signature help keep showing while the cursor sits in trailing
            // whitespace where the next argument will land.
            const upperBound = idx + 1 < invocations.length ? invocations[idx + 1].nameStart : lineText.length;
            if (offset > upperBound) continue;

            let activeParam = 0;
            for (const a of inv.args) {
                if (offset > a.end) activeParam++;
                else break;
            }
            activeParam = Math.min(activeParam, fn.params.length - 1);

            const info = new vscode.SignatureInformation(fn.sig ?? fn.name, new vscode.MarkdownString(fn.doc || undefined));
            info.parameters = fn.params.map(
                (p) => new vscode.ParameterInformation(`${p.name}${p.optional ? '?' : ''}`)
            );

            const help = new vscode.SignatureHelp();
            help.signatures = [info];
            help.activeSignature = 0;
            help.activeParameter = activeParam;
            return help;
        }
        return undefined;
    }
}
