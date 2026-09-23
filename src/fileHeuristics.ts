import * as fs from 'fs';
import * as path from 'path';
import * as vscode from 'vscode';

// Whether a document is worth running DABT-aware features on. Deliberately
// permissive: this extension ships its own snapshot of the DABT API (see
// src/data/dabtApi.json) specifically so it works in projects that don't
// have dabt installed or even a config/*_callbacks.sh naming convention yet -
// so we key off language id, not file layout.
export function looksLikeDabtFile(document: vscode.TextDocument): boolean {
    return document.languageId === 'shellscript';
}

export function isCallbackFile(document: vscode.TextDocument): boolean {
    return /_callbacks\.sh$/.test(document.fileName) || /\.plugin\.sh$/.test(document.fileName);
}

// True for files that are part of DABT's own framework source - any .sh under
// a lib/ directory that holds tui.sh (lib/tui.sh, lib/state.sh, lib/markup/,
// lib/input/, lib/dapk/, ...) - where calling private (_tui.*, _exec_*,
// _tr_*, _prefixed) helpers is normal, expected code - not a lint violation.
export function isDabtFrameworkSource(document: vscode.TextDocument): boolean {
    const p = document.fileName.replace(/\\/g, '/');
    if (!p.endsWith('.sh')) return false;
    const libIdx = p.lastIndexOf('/lib/');
    if (libIdx === -1) return false;
    return fs.existsSync(path.join(p.slice(0, libIdx), 'lib', 'tui.sh'));
}
