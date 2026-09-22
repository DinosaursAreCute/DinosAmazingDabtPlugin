import * as vscode from 'vscode';

function dabtExecutable(): string {
    return vscode.workspace.getConfiguration('dabt').get<string>('executablePath', 'dabt') || 'dabt';
}

function workspaceCwd(): string | undefined {
    return vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
}

function getTerminal(name: string): vscode.Terminal {
    const existing = vscode.window.terminals.find((t) => t.name === name);
    if (existing) return existing;
    return vscode.window.createTerminal({ name, cwd: workspaceCwd() });
}

// Runs `dabt <args...>` (or the current file directly) straight through the
// integrated terminal, so devs get the exact same output/exit behavior they'd
// get running it by hand - no output-channel translation layer to trust.
export function runDabtCommand(args: string, terminalName = 'DABT') {
    const term = getTerminal(terminalName);
    term.show(true);
    term.sendText(`${dabtExecutable()} ${args}`.trim());
}

export function runShellCommand(command: string, terminalName = 'DABT') {
    const term = getTerminal(terminalName);
    term.show(true);
    term.sendText(command);
}

export async function promptAndRunDabtCommand() {
    const args = await vscode.window.showInputBox({
        prompt: 'dabt CLI arguments',
        placeHolder: 'e.g. build, scan, app list, pkg info',
    });
    if (args === undefined) return;
    runDabtCommand(args);
}
