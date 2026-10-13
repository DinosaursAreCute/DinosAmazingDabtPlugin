// Diagnostics for DABT markup pages: the instant schema/file checks (xmlLintCore.ts) on
// every edit, and the framework validator (xmlValidator.ts) on open and save.
import * as fs from 'fs';
import * as path from 'path';
import * as vscode from 'vscode';
import { apiIndex } from './apiData';
import { currentSourceInfo } from './dataSource';
import { loadThemeCss } from './themeCss';
import { lintXml, XmlFinding, XmlLintContext } from './xmlLintCore';
import { findFunctionDefsInFile, findScriptSrcs, findThemeSrcs, isDabtXmlDocument } from './xmlHeuristics';
import { runValidator } from './xmlValidator';
import { CALLBACK_ATTRS, schemaIndex } from './xsdData';

const SEVERITY: Record<XmlFinding['severity'], vscode.DiagnosticSeverity> = {
    warning: vscode.DiagnosticSeverity.Warning,
    info: vscode.DiagnosticSeverity.Information,
};
const LINT_DELAY_MS = 300;
// The validator reports these too; where the instant check already marked the line, keep one.
const OVERLAPPING = /unknown tag|missing the required attribute/;

function buildContext(document: vscode.TextDocument): XmlLintContext {
    const dir = path.dirname(document.uri.fsPath);
    const scripts = findScriptSrcs(document);
    let scriptFunctions: Set<string> | undefined;
    if (scripts.length) {
        scriptFunctions = new Set();
        for (const script of scripts) for (const fn of findFunctionDefsInFile(script)) scriptFunctions.add(fn.name);
    }

    // Only a page that loads its own theme is checked: classes of an app-wide theme are not visible here.
    const pageThemes = findThemeSrcs(document);
    let themeClasses: Set<string> | undefined;
    if (pageThemes.length) {
        const root = currentSourceInfo()?.root;
        const themePaths = root ? [...pageThemes, path.join(root, 'share', 'defaults', 'theme.css')] : pageThemes;
        themeClasses = new Set();
        for (const themePath of themePaths) {
            for (const name of loadThemeCss(themePath)?.keys() ?? []) themeClasses.add(name);
        }
    }

    return {
        schema: (name) => schemaIndex.get(name),
        callbackAttrs: CALLBACK_ATTRS,
        isBuiltInCallback: (fn) => apiIndex.get(fn) !== undefined,
        scriptFunctions,
        fileExists: (relative) => fs.existsSync(path.resolve(dir, relative)),
        themeClasses,
    };
}

export class DabtXmlDiagnostics {
    private lintCollection = vscode.languages.createDiagnosticCollection('dabt-xml');
    private validatorCollection = vscode.languages.createDiagnosticCollection('dabt-validator');
    private timers = new Map<string, ReturnType<typeof setTimeout>>();

    dispose() {
        this.lintCollection.dispose();
        this.validatorCollection.dispose();
        for (const timer of this.timers.values()) clearTimeout(timer);
    }

    private enabled(): boolean {
        return vscode.workspace.getConfiguration('dabt').get<boolean>('xml.lint', true);
    }

    lintSoon(document: vscode.TextDocument) {
        const key = document.uri.toString();
        const pending = this.timers.get(key);
        if (pending) clearTimeout(pending);
        this.timers.set(
            key,
            setTimeout(() => {
                this.timers.delete(key);
                this.lint(document);
            }, LINT_DELAY_MS)
        );
    }

    lint(document: vscode.TextDocument) {
        if (!this.enabled() || document.isClosed || !isDabtXmlDocument(document)) {
            this.clear(document.uri);
            return;
        }
        const diagnostics = lintXml(document.getText(), buildContext(document)).map((f) => {
            const range = new vscode.Range(document.positionAt(f.start), document.positionAt(f.end));
            const d = new vscode.Diagnostic(range, f.message, SEVERITY[f.severity]);
            d.code = f.code;
            d.source = 'dabt';
            return d;
        });
        this.lintCollection.set(document.uri, diagnostics);
    }

    async validate(document: vscode.TextDocument) {
        const root = currentSourceInfo()?.root;
        const enabled = vscode.workspace.getConfiguration('dabt').get<boolean>('xml.validateOnSave', true);
        if (!root || !enabled || !this.enabled() || !isDabtXmlDocument(document) || document.isUntitled) {
            this.validatorCollection.delete(document.uri);
            return;
        }
        const findings = await runValidator(root, document.uri.fsPath);
        if (!findings || document.isClosed) return;

        const own = fs.realpathSync.native(document.uri.fsPath);
        const markedLines = new Set((this.lintCollection.get(document.uri) ?? []).map((d) => d.range.start.line));
        const diagnostics: vscode.Diagnostic[] = [];
        for (const f of findings) {
            const sameFile = (() => {
                try {
                    return fs.realpathSync.native(f.file) === own;
                } catch {
                    return false;
                }
            })();
            if (!sameFile) continue;
            const line = Math.min(Math.max(f.line - 1, 0), document.lineCount - 1);
            if (OVERLAPPING.test(f.message) && markedLines.has(line)) continue;
            const col = Math.max(f.col - 1, 0);
            const wordEnd = /^[<\w/.:-]+/.exec(document.lineAt(line).text.slice(col))?.[0].length ?? 1;
            const d = new vscode.Diagnostic(
                new vscode.Range(line, col, line, col + wordEnd),
                f.message,
                f.severity === 'error' ? vscode.DiagnosticSeverity.Error : vscode.DiagnosticSeverity.Warning
            );
            d.source = 'dabt validate';
            diagnostics.push(d);
        }
        this.validatorCollection.set(document.uri, diagnostics);
    }

    clear(uri: vscode.Uri) {
        this.lintCollection.delete(uri);
        this.validatorCollection.delete(uri);
    }
}
