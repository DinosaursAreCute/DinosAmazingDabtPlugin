// Resolves which DABT source tree to read live data from - so the bundled
// src/data/*.json snapshot is a fallback for offline/no-install projects,
// never the only option and never something that silently goes stale for
// someone who actually has dabt installed or is editing the framework
// itself. Three ways a root gets picked, in priority order:
//   1. `dabt.apiSource.installPath` - manual override, for anyone who wants
//      to point at a specific checkout regardless of what's on PATH.
//   2. An open workspace folder that IS a DABT checkout (has lib/tui.sh).
//   3. Auto-detect: resolve `dabt.executablePath` (default "dabt") on PATH,
//      follow symlinks, and derive TUI_ROOT the exact way bin/dabt itself
//      does (`dirname(dirname(realpath))`).
import * as fs from 'fs';
import * as path from 'path';
import * as vscode from 'vscode';
import { parseDabtApi } from './parse/parseDabtApi';
import { parseDabtXsd } from './parse/parseDabtXsd';
import { DabtApiData, DabtXsdData } from './types';

export interface ResolvedSource {
    root: string;
    how: 'installPath setting' | 'workspace folder' | 'auto-detected on PATH';
}

function looksLikeDabtRoot(root: string): boolean {
    return fs.existsSync(path.join(root, 'lib', 'tui.sh'));
}

function findOnPath(exe: string): string | undefined {
    if (path.isAbsolute(exe)) return fs.existsSync(exe) ? exe : undefined;
    const pathEnv = process.env.PATH ?? '';
    for (const dir of pathEnv.split(path.delimiter)) {
        if (!dir) continue;
        const candidate = path.join(dir, exe);
        if (fs.existsSync(candidate)) return candidate;
    }
    return undefined;
}

export function resolveInstallRoot(): ResolvedSource | undefined {
    const config = vscode.workspace.getConfiguration('dabt');

    const manual = config.get<string>('apiSource.installPath', '').trim();
    if (manual) {
        const resolved = manual.replace(/^~(?=$|\/)/, process.env.HOME ?? '~');
        if (looksLikeDabtRoot(resolved)) return { root: resolved, how: 'installPath setting' };
        vscode.window.showWarningMessage(
            `DABT: dabt.apiSource.installPath ("${manual}") doesn't look like a DABT checkout (no lib/tui.sh found) - ignoring it.`
        );
    }

    for (const folder of vscode.workspace.workspaceFolders ?? []) {
        if (looksLikeDabtRoot(folder.uri.fsPath)) {
            return { root: folder.uri.fsPath, how: 'workspace folder' };
        }
    }

    if (config.get<boolean>('apiSource.autoDetect', true)) {
        const exe = config.get<string>('executablePath', 'dabt') || 'dabt';
        const exePath = findOnPath(exe);
        if (exePath) {
            try {
                const real = fs.realpathSync(exePath); // follows symlinks, same as bin/dabt's own SELF loop
                const root = path.dirname(path.dirname(real)); // TUI_ROOT = dirname(dirname(resolved bin/dabt))
                if (looksLikeDabtRoot(root)) return { root, how: 'auto-detected on PATH' };
            } catch {
                /* PATH lookup found something but it wasn't a readable/valid install - fall through to bundled data */
            }
        }
    }

    return undefined;
}

export interface LoadedData {
    api: DabtApiData;
    xsd: DabtXsdData | undefined;
    source: ResolvedSource | undefined; // undefined = bundled snapshot
}

export function loadLiveData(resolved: ResolvedSource): LoadedData {
    return {
        api: parseDabtApi(resolved.root),
        xsd: parseDabtXsd(resolved.root),
        source: resolved,
    };
}
