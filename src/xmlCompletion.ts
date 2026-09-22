import * as path from 'path';
import * as vscode from 'vscode';
import { apiIndex } from './apiData';
import { schemaIndex, CALLBACK_ATTRS } from './xsdData';
import { getXmlContext } from './xmlContext';
import {
    isDabtXmlDocument,
    findFunctionDefsInFile,
    findPaneIds,
    findScriptSrcs,
    findSiblingXmlFiles,
    findThemeSrcs,
} from './xmlHeuristics';
import { buildElementSnippet } from './xmlSnippetBuilder';
import { loadThemeCss } from './themeCss';

export class DabtXmlCompletionProvider implements vscode.CompletionItemProvider {
    provideCompletionItems(document: vscode.TextDocument, position: vscode.Position): vscode.CompletionItem[] | undefined {
        if (!isDabtXmlDocument(document)) return undefined;
        const ctx = getXmlContext(document, position);
        if (!ctx) return undefined;

        if (ctx.kind === 'tagName') {
            const parent = ctx.parentTag || 'tui';
            const candidates = ctx.parentTag ? schemaIndex.childrenOf(parent) : [schemaIndex.get('tui')].filter((x): x is NonNullable<typeof x> => !!x);
            const replaceRange = new vscode.Range(document.positionAt(ctx.replaceStart), position);

            return candidates.map((el) => {
                const item = new vscode.CompletionItem(el.name, vscode.CompletionItemKind.Class);
                item.detail = `<${el.name}> (DABT markup)`;
                item.documentation = elementDoc(el.name);
                // The user already typed the leading `<` (and maybe a partial
                // name) themselves - item.range replaces from right after that
                // `<` up to the cursor, so the snippet just needs the tag name
                // onward, not another leading `<`.
                const full = buildElementSnippet(schemaIndex.get(el.name)!, false);
                const snippet = new vscode.SnippetString(full.value.replace(/^</, ''));
                item.insertText = snippet;
                item.range = replaceRange;
                return item;
            });
        }

        if (ctx.kind === 'attrName') {
            const el = schemaIndex.get(ctx.tagName);
            if (!el) return undefined;
            const replaceRange = new vscode.Range(document.positionAt(ctx.replaceStart), position);
            return el.attributes
                .filter((a) => !ctx.existingAttrs.includes(a.name))
                .map((a) => {
                    const item = new vscode.CompletionItem(a.name, vscode.CompletionItemKind.Property);
                    item.detail = `${a.type}${a.required ? ', required' : ''}`;
                    item.documentation = attrDoc(a.name, ctx.tagName);
                    const snippet = new vscode.SnippetString(`${a.name}="`);
                    if (a.enumValues?.length) snippet.appendChoice(a.enumValues, 1);
                    else snippet.appendTabstop(1);
                    snippet.appendText('"');
                    item.insertText = snippet;
                    item.range = replaceRange;
                    item.sortText = a.required ? '0_' + a.name : '1_' + a.name;
                    return item;
                });
        }

        // attrValue
        const el = schemaIndex.get(ctx.tagName);
        const attr = el?.attributes.find((a) => a.name === ctx.attrName);

        if (attr?.enumValues?.length) {
            return attr.enumValues.map((v) => new vscode.CompletionItem(v, vscode.CompletionItemKind.EnumMember));
        }

        if (CALLBACK_ATTRS.has(ctx.attrName)) {
            const items: vscode.CompletionItem[] = [];
            for (const scriptPath of findScriptSrcs(document)) {
                for (const fn of findFunctionDefsInFile(scriptPath)) {
                    const item = new vscode.CompletionItem(fn.name, vscode.CompletionItemKind.Function);
                    item.detail = `callback (${path.basename(scriptPath)}:${fn.line + 1})`;
                    items.push(item);
                }
            }
            for (const fn of apiIndex.public_()) {
                if (!fn.name.startsWith('tui.action.') && !fn.name.startsWith('tui.nav.')) continue;
                const item = new vscode.CompletionItem(fn.name, vscode.CompletionItemKind.Function);
                item.detail = 'DABT built-in';
                items.push(item);
            }
            return items;
        }

        if (ctx.attrName === 'pane') {
            return findPaneIds(document).map((id) => new vscode.CompletionItem(id, vscode.CompletionItemKind.Reference));
        }

        if (ctx.attrName === 'page') {
            return findSiblingXmlFiles(document).map((f) => new vscode.CompletionItem(f, vscode.CompletionItemKind.File));
        }

        if (ctx.attrName === 'class') {
            const items: vscode.CompletionItem[] = [];
            for (const themePath of findThemeSrcs(document)) {
                const classes = loadThemeCss(themePath);
                if (!classes) continue;
                for (const cls of classes.values()) {
                    const item = new vscode.CompletionItem(cls.name, vscode.CompletionItemKind.Color);
                    const parts: string[] = [];
                    if (cls.base.fg) parts.push(`fg:${cls.base.fg}`);
                    if (cls.base.bg) parts.push(`bg:${cls.base.bg}`);
                    if (cls.base.mods) parts.push(cls.base.mods);
                    item.detail = parts.join(' ') || undefined;
                    const states = Object.keys(cls.states);
                    if (states.length) item.documentation = new vscode.MarkdownString(`States: ${states.join(', ')}`);
                    items.push(item);
                }
            }
            return items;
        }

        return undefined;
    }
}

function elementDoc(name: string): vscode.MarkdownString | undefined {
    const el = schemaIndex.get(name);
    if (!el) return undefined;
    const md = new vscode.MarkdownString();
    if (el.doc) md.appendMarkdown(el.doc + '\n\n');
    md.appendMarkdown(`Attributes: ${el.attributes.map((a) => (a.required ? `**${a.name}**` : a.name)).join(', ')}`);
    return md;
}

function attrDoc(attrName: string, tagName: string): vscode.MarkdownString | undefined {
    const attr = schemaIndex.get(tagName)?.attributes.find((a) => a.name === attrName);
    if (!attr) return undefined;
    const md = new vscode.MarkdownString();
    md.appendMarkdown(`\`${attr.type}\`${attr.required ? ' (required)' : ''}`);
    if (attr.enumValues?.length) md.appendMarkdown(` — one of: ${attr.enumValues.join(', ')}`);
    if (attr.doc) md.appendMarkdown('\n\n' + attr.doc);
    return md;
}
