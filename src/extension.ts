import * as vscode from 'vscode';
import { DabtCompletionProvider } from './completion';
import { DabtHoverProvider } from './hover';
import { DabtDiagnostics } from './diagnostics';
import { DabtInlayHintsProvider } from './inlayHints';
import { DabtSignatureHelpProvider } from './signatureHelp';
import { SubshellStatusBar } from './subshellStatusBar';
import { countSubshells, ForkKind } from './subshellCounter';
import { promptAndRunDabtCommand, runDabtCommand } from './cli';
import { debugTraceCurrentFile, profileCurrentFile, runCurrentFile } from './profiling';
import { apiIndex } from './apiData';
import { looksLikeDabtFile } from './fileHeuristics';
import { disposeDataSources, refreshDataSources } from './dataSource';
import { DabtXmlCompletionProvider } from './xmlCompletion';
import { DabtXmlHoverProvider } from './xmlHover';
import { DabtXmlDefinitionProvider } from './xmlDefinition';
import { DabtCssColorProvider } from './cssColor';
import { DabtXmlClassColorProvider } from './xmlClassColor';
import { DabtXmlClassInlayHintsProvider } from './xmlClassInlayHints';
import { disposeXmlDecorations, updateXmlDecorations } from './xmlDecorations';
import { initPage, insertElement } from './xmlCommands';

const subshellReportChannel = vscode.window.createOutputChannel('DABT Subshells');

export function activate(context: vscode.ExtensionContext) {
    const diagnostics = new DabtDiagnostics();
    const statusBar = new SubshellStatusBar();
    const inlayHints = new DabtInlayHintsProvider();
    const xmlClassInlayHints = new DabtXmlClassInlayHintsProvider();

    const dabtSelector: vscode.DocumentSelector = [{ language: 'shellscript' }];

    context.subscriptions.push(
        diagnostics,
        statusBar,

        subshellReportChannel,

        vscode.languages.registerCompletionItemProvider(dabtSelector, new DabtCompletionProvider(), '.'),
        vscode.languages.registerHoverProvider(dabtSelector, new DabtHoverProvider()),
        vscode.languages.registerInlayHintsProvider(dabtSelector, inlayHints),
        vscode.languages.registerSignatureHelpProvider(dabtSelector, new DabtSignatureHelpProvider(), ' ', ','),

        vscode.languages.registerCompletionItemProvider(
            { language: 'xml' },
            new DabtXmlCompletionProvider(),
            '<',
            ' ',
            '"'
        ),
        vscode.languages.registerHoverProvider({ language: 'xml' }, new DabtXmlHoverProvider()),
        vscode.languages.registerDefinitionProvider({ language: 'xml' }, new DabtXmlDefinitionProvider()),
        vscode.languages.registerColorProvider({ language: 'css' }, new DabtCssColorProvider()),
        vscode.languages.registerColorProvider({ language: 'xml' }, new DabtXmlClassColorProvider()),
        vscode.languages.registerInlayHintsProvider({ language: 'xml' }, xmlClassInlayHints),
        { dispose: disposeXmlDecorations },
        vscode.window.onDidChangeActiveTextEditor((ed) => updateXmlDecorations(ed)),
        vscode.workspace.onDidChangeTextDocument((e) => {
            const ed = vscode.window.activeTextEditor;
            if (ed && ed.document === e.document) updateXmlDecorations(ed);
        }),

        vscode.workspace.onDidChangeConfiguration((e) => {
            if (e.affectsConfiguration('dabt.inlayHints.enable')) {
                inlayHints.refresh();
                xmlClassInlayHints.refresh();
            }
        }),

        vscode.workspace.onDidOpenTextDocument((doc) => diagnostics.lint(doc)),
        vscode.workspace.onDidSaveTextDocument((doc) => diagnostics.lint(doc)),
        vscode.workspace.onDidChangeTextDocument((e) => diagnostics.lint(e.document)),
        vscode.workspace.onDidCloseTextDocument((doc) => diagnostics.clear(doc.uri)),

        vscode.window.onDidChangeActiveTextEditor((ed) => statusBar.refresh(ed)),
        vscode.workspace.onDidChangeTextDocument((e) => {
            if (vscode.window.activeTextEditor?.document === e.document) {
                statusBar.refresh(vscode.window.activeTextEditor);
            }
        }),

        vscode.commands.registerCommand('dabt.run', promptAndRunDabtCommand),
        vscode.commands.registerCommand('dabt.build', () => runDabtCommand('build')),
        vscode.commands.registerCommand('dabt.scan', () => runDabtCommand('scan')),
        vscode.commands.registerCommand('dabt.app.run', async () => {
            const name = await vscode.window.showInputBox({ prompt: 'App name (blank = list apps)' });
            if (name === undefined) return;
            runDabtCommand(name ? `app run ${name}` : 'app list');
        }),

        vscode.commands.registerCommand('dabt.runCurrentFile', runCurrentFile),
        vscode.commands.registerCommand('dabt.profile.currentFile', profileCurrentFile),
        vscode.commands.registerCommand('dabt.debug.trace', debugTraceCurrentFile),

        vscode.commands.registerCommand('dabt.subshells.countFile', () => reportSubshellsForActiveFile()),
        vscode.commands.registerCommand('dabt.subshells.report', () => reportSubshellsForWorkspace()),

        vscode.commands.registerCommand('dabt.showApiDoc', showApiDocForCursor),

        vscode.commands.registerCommand('dabt.xml.initPage', initPage),
        vscode.commands.registerCommand('dabt.xml.insertElement', insertElement),
        vscode.commands.registerCommand('dabt.refreshApiData', () => refreshDataSources(false)),

        { dispose: disposeDataSources },
        vscode.workspace.onDidChangeConfiguration((e) => {
            if (
                e.affectsConfiguration('dabt.apiSource.installPath') ||
                e.affectsConfiguration('dabt.apiSource.autoDetect') ||
                e.affectsConfiguration('dabt.executablePath')
            ) {
                refreshDataSources(true);
            }
        }),
        vscode.workspace.onDidChangeWorkspaceFolders(() => refreshDataSources(true))
    );

    refreshDataSources(true);

    // Lint whatever's already open when the extension activates.
    for (const doc of vscode.workspace.textDocuments) diagnostics.lint(doc);
    statusBar.refresh(vscode.window.activeTextEditor);
    updateXmlDecorations(vscode.window.activeTextEditor);
}

function reportSubshellsForActiveFile() {
    const doc = vscode.window.activeTextEditor?.document;
    if (!doc || !looksLikeDabtFile(doc)) {
        vscode.window.showWarningMessage('DABT: open a shell script first.');
        return;
    }
    const report = countSubshells(doc.getText());
    subshellReportChannel.clear();
    subshellReportChannel.show(true);
    subshellReportChannel.appendLine(`DABT subshell report - ${doc.fileName}`);
    subshellReportChannel.appendLine(`(heuristic scan, not a full bash parser - see src/subshellCounter.ts)`);
    subshellReportChannel.appendLine('');
    printReport(report.counts, report.total);
    subshellReportChannel.appendLine('');
    subshellReportChannel.appendLine('Hits by line:');
    for (const hit of report.hits) {
        subshellReportChannel.appendLine(`  ${String(hit.line + 1).padStart(5)}:${hit.col + 1}  ${hit.kind}`);
    }
}

async function reportSubshellsForWorkspace() {
    const files = await vscode.workspace.findFiles('**/*.sh', '**/node_modules/**', 500);
    if (files.length === 0) {
        vscode.window.showInformationMessage('DABT: no .sh files found in workspace.');
        return;
    }
    const totals: Record<ForkKind, number> = { cmdSubst: 0, procSubst: 0, subshell: 0, pipeline: 0, background: 0 };
    const perFile: Array<{ file: vscode.Uri; total: number }> = [];

    for (const uri of files) {
        const doc = await vscode.workspace.openTextDocument(uri);
        const report = countSubshells(doc.getText());
        perFile.push({ file: uri, total: report.total });
        for (const k of Object.keys(totals) as ForkKind[]) totals[k] += report.counts[k];
    }
    perFile.sort((a, b) => b.total - a.total);

    subshellReportChannel.clear();
    subshellReportChannel.show(true);
    subshellReportChannel.appendLine(`DABT workspace subshell report - ${files.length} files`);
    subshellReportChannel.appendLine('');
    const grandTotal = Object.values(totals).reduce((a, b) => a + b, 0);
    printReport(totals, grandTotal);
    subshellReportChannel.appendLine('');
    subshellReportChannel.appendLine('Top files by fork count:');
    for (const f of perFile.slice(0, 25)) {
        if (f.total === 0) continue;
        subshellReportChannel.appendLine(`  ${String(f.total).padStart(4)}  ${vscode.workspace.asRelativePath(f.file)}`);
    }
}

function printReport(counts: Record<ForkKind, number>, total: number) {
    const label: Record<ForkKind, string> = {
        cmdSubst: 'command substitution $()',
        procSubst: 'process substitution <()/>()',
        subshell: 'explicit subshell ()',
        pipeline: 'pipeline stage |',
        background: 'background job &',
    };
    for (const k of Object.keys(counts) as ForkKind[]) {
        subshellReportChannel.appendLine(`  ${String(counts[k]).padStart(4)}  ${label[k]}`);
    }
    subshellReportChannel.appendLine(`  ${String(total).padStart(4)}  total`);
}

function showApiDocForCursor() {
    const editor = vscode.window.activeTextEditor;
    if (!editor) return;
    const range = editor.document.getWordRangeAtPosition(editor.selection.active, /[A-Za-z_][A-Za-z0-9_.]*/);
    if (!range) {
        vscode.window.showInformationMessage('DABT: place the cursor on a tui.*/dabt function name.');
        return;
    }
    const word = editor.document.getText(range);
    const fn = apiIndex.get(word);
    if (!fn) {
        vscode.window.showInformationMessage(`DABT: '${word}' is not in the indexed API.`);
        return;
    }
    vscode.window.showInformationMessage(
        `${fn.sig ?? fn.name}${fn.doc ? ' — ' + fn.doc : ''} [${fn.file}:${fn.line}]${fn.private ? ' (private)' : ''}`
    );
}

export function deactivate() {}
