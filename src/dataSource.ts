// Owns which DABT data source is active (live-scanned install vs. the
// bundled offline snapshot), a status bar indicator for it, and a file
// watcher that keeps live data fresh as the DABT checkout it came from
// changes. See src/apiSource.ts for how a root gets resolved.
import * as vscode from 'vscode';
import { apiIndex } from './apiData';
import { loadLiveData, resolveInstallRoot, ResolvedSource } from './apiSource';
import { schemaIndex } from './xsdData';

let currentSource: ResolvedSource | undefined;
let watcher: vscode.FileSystemWatcher | undefined;
let debounceTimer: ReturnType<typeof setTimeout> | undefined;

const statusItem = vscode.window.createStatusBarItem('dabt.dataSource', vscode.StatusBarAlignment.Right, 89);
statusItem.name = 'DABT data source';
statusItem.command = 'dabt.refreshApiData';

export function currentSourceInfo(): ResolvedSource | undefined {
    return currentSource;
}

export function refreshDataSources(silent: boolean) {
    const resolved = resolveInstallRoot();

    if (resolved) {
        try {
            const { api, xsd } = loadLiveData(resolved);
            apiIndex.load(api);
            if (xsd) schemaIndex.load(xsd);
            currentSource = resolved;
            updateStatusItem();
            rewatch(resolved.root);
            if (!silent) {
                vscode.window.showInformationMessage(
                    `DABT: live-loaded ${api.functionCount} functions from ${resolved.root} (${resolved.how}).`
                );
            }
            return;
        } catch (e) {
            vscode.window.showWarningMessage(
                `DABT: found a install at ${resolved.root} but failed to scan it (${(e as Error).message}) - using the bundled snapshot instead.`
            );
        }
    }

    currentSource = undefined;
    updateStatusItem();
    clearWatch();
    if (!silent) {
        vscode.window.showInformationMessage(
            `DABT: using the bundled snapshot (${apiIndex.meta.functionCount} functions` +
                (apiIndex.meta.sourceVersion ? `, dabt ${apiIndex.meta.sourceVersion}` : '') +
                ') - no local install found or configured (dabt.apiSource.installPath).'
        );
    }
}

function updateStatusItem() {
    if (currentSource) {
        statusItem.text = '$(sync) dabt: live';
        statusItem.tooltip = new vscode.MarkdownString(
            `DABT API/markup data live-scanned from \`${currentSource.root}\` (${currentSource.how}).\n\nClick to refresh now.`
        );
    } else {
        statusItem.text = '$(archive) dabt: bundled';
        statusItem.tooltip = new vscode.MarkdownString(
            `DABT API/markup data from the extension's bundled snapshot - no local dabt install found.\n\nSet \`dabt.apiSource.installPath\` to point at a checkout, or click to re-check PATH.`
        );
    }
    statusItem.show();
}

function rewatch(root: string) {
    clearWatch();
    watcher = vscode.workspace.createFileSystemWatcher(
        new vscode.RelativePattern(vscode.Uri.file(root), '{lib/**/*.sh,share/plugins/**/*.sh,share/tui.xsd}')
    );
    const debouncedRefresh = () => {
        if (debounceTimer) clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => refreshDataSources(true), 500);
    };
    watcher.onDidChange(debouncedRefresh);
    watcher.onDidCreate(debouncedRefresh);
    watcher.onDidDelete(debouncedRefresh);
}

function clearWatch() {
    watcher?.dispose();
    watcher = undefined;
}

export function disposeDataSources() {
    clearWatch();
    statusItem.dispose();
    if (debounceTimer) clearTimeout(debounceTimer);
}
