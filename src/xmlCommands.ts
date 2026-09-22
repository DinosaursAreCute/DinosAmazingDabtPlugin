import * as fs from 'fs';
import * as path from 'path';
import * as vscode from 'vscode';
import { schemaIndex } from './xsdData';
import { buildElementSnippet } from './xmlSnippetBuilder';

// "DABT: New Page..." - scaffolds a page the way DABT's own examples are
// laid out: NAME.xml (a <tui> root with a script tag wired to it) plus the
// paired NAME_callbacks.sh with an on_visit stub already registered, opened
// side by side so the next thing you do is fill in the pane tree.
export async function initPage() {
    const folder = await pickTargetFolder();
    if (!folder) return;

    const name = await vscode.window.showInputBox({
        prompt: 'Page name (no extension)',
        placeHolder: 'settings',
        validateInput: (v) => (/^[A-Za-z][A-Za-z0-9_-]*$/.test(v) ? undefined : 'letters, digits, _ or - only, starting with a letter'),
    });
    if (!name) return;

    const xmlPath = path.join(folder, `${name}.xml`);
    const cbPath = path.join(folder, `${name}_callbacks.sh`);
    if (fs.existsSync(xmlPath) || fs.existsSync(cbPath)) {
        vscode.window.showErrorMessage(`DABT: ${name}.xml or ${name}_callbacks.sh already exists in ${folder}.`);
        return;
    }

    const visitFn = `${name}_visit`;
    const xml = `<tui xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:noNamespaceSchemaLocation="../tui.xsd" on_visit="${visitFn}">
  <script src="${name}_callbacks.sh"/>

  <pane id="root" split="v" title="${name}" border="single">
    <pane id="main" weight="100"/>
  </pane>

  <label id="lbl_title" pane="main" row="0" text="${name}"/>
</tui>
`;
    const cb = `#!/usr/bin/env bash
# ${name}_callbacks.sh - callbacks for ${name}.xml

${visitFn}() {
    :
}
`;

    fs.writeFileSync(xmlPath, xml);
    fs.writeFileSync(cbPath, cb, { mode: 0o755 });

    const xmlDoc = await vscode.workspace.openTextDocument(xmlPath);
    await vscode.window.showTextDocument(xmlDoc, { viewColumn: vscode.ViewColumn.One });
    const cbDoc = await vscode.workspace.openTextDocument(cbPath);
    await vscode.window.showTextDocument(cbDoc, { viewColumn: vscode.ViewColumn.Beside });
}

async function pickTargetFolder(): Promise<string | undefined> {
    const folders = vscode.workspace.workspaceFolders;
    if (!folders || folders.length === 0) {
        vscode.window.showErrorMessage('DABT: open a folder/workspace first.');
        return undefined;
    }
    const editorDir = vscode.window.activeTextEditor?.document.uri.fsPath;
    return editorDir ? path.dirname(editorDir) : folders[0].uri.fsPath;
}

// "DABT: Insert Element..." - quick-pick any markup element, insert it as a
// snippet with every attribute as its own tabstop (required first), each
// pre-filled with a sensible default (or a real dropdown for enum types) so
// Tab walks straight through every argument in order.
export async function insertElement() {
    const editor = vscode.window.activeTextEditor;
    if (!editor || editor.document.languageId !== 'xml') {
        vscode.window.showWarningMessage('DABT: open a DABT .xml page first.');
        return;
    }

    const picked = await vscode.window.showQuickPick(
        schemaIndex
            .all()
            .filter((e) => e.name !== 'tui')
            .map((e) => ({ label: e.name, description: e.doc || undefined, element: e })),
        { placeHolder: 'Element to insert' }
    );
    if (!picked) return;

    const includeOptional = await vscode.window.showQuickPick(
        [
            { label: 'Required attributes only', value: false },
            { label: 'All attributes (jump through every argument)', value: true },
        ],
        { placeHolder: `Attributes to include for <${picked.element.name}>` }
    );
    if (includeOptional === undefined) return;

    await editor.insertSnippet(buildElementSnippet(picked.element, includeOptional.value));
}
