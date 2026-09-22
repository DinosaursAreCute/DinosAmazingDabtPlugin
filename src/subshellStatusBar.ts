import * as vscode from 'vscode';
import { countSubshells, ForkKind } from './subshellCounter';
import { looksLikeDabtFile } from './fileHeuristics';

const KIND_LABEL: Record<ForkKind, string> = {
    cmdSubst: 'cmd-subst $()',
    procSubst: 'proc-subst <()',
    subshell: 'subshell ()',
    pipeline: 'pipeline |',
    background: 'background &',
};

export class SubshellStatusBar {
    private item: vscode.StatusBarItem;

    constructor() {
        this.item = vscode.window.createStatusBarItem('dabt.subshellCount', vscode.StatusBarAlignment.Right, 90);
        this.item.command = 'dabt.subshells.countFile';
        this.item.name = 'DABT subshell count';
    }

    dispose() {
        this.item.dispose();
    }

    refresh(editor: vscode.TextEditor | undefined) {
        const enabled = vscode.workspace.getConfiguration('dabt').get<boolean>('subshells.showInStatusBar', true);
        if (!enabled || !editor || !looksLikeDabtFile(editor.document) || editor.document.languageId !== 'shellscript') {
            this.item.hide();
            return;
        }
        const report = countSubshells(editor.document.getText());
        this.item.text = `$(terminal) ${report.total} fork${report.total === 1 ? '' : 's'}`;
        const breakdown = (Object.keys(report.counts) as ForkKind[])
            .filter((k) => report.counts[k] > 0)
            .map((k) => `${report.counts[k]} ${KIND_LABEL[k]}`)
            .join('\n');
        this.item.tooltip = new vscode.MarkdownString(
            `**DABT: forking constructs in this file** (heuristic count)\n\n${breakdown || 'none found'}\n\nClick for a full per-line report.`
        );
        this.item.show();
    }
}
