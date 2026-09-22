import * as path from 'path';
import * as vscode from 'vscode';
import { apiIndex, docString } from './apiData';
import { schemaIndex, CALLBACK_ATTRS } from './xsdData';
import { isDabtXmlDocument, findFunctionDefsInFile, findScriptSrcs } from './xmlHeuristics';

const TAG_RE = /<\/?([A-Za-z_][\w.-]*)/;
const ATTR_RE = /([A-Za-z_][\w-]*)\s*=\s*"([^"]*)"/g;

export class DabtXmlHoverProvider implements vscode.HoverProvider {
    provideHover(document: vscode.TextDocument, position: vscode.Position): vscode.Hover | vscode.ProviderResult<vscode.Hover> {
        if (!isDabtXmlDocument(document)) return undefined;

        const line = document.lineAt(position.line);
        const wordRange = document.getWordRangeAtPosition(position, /[A-Za-z_][\w.-]*/);
        if (!wordRange) return undefined;
        const word = document.getText(wordRange);

        // Tag name: `<pane` or `</pane` - only when the hovered word IS the
        // tag name token itself, not some other word that happens to match it.
        const tagMatch = TAG_RE.exec(line.text);
        const tagNameStart = tagMatch ? tagMatch.index + tagMatch[0].length - tagMatch[1].length : -1;
        if (tagMatch && tagMatch[1] === word && wordRange.start.character === tagNameStart) {
            const el = schemaIndex.get(word);
            if (el) {
                const md = new vscode.MarkdownString();
                md.appendCodeblock(`<${el.name} ${el.attributes.map((a) => (a.required ? `${a.name}="..."` : `[${a.name}="..."]`)).join(' ')}>`, 'xml');
                if (el.doc) md.appendMarkdown(el.doc);
                return new vscode.Hover(md, wordRange);
            }
        }

        // Is this word an attribute NAME on the current tag?
        const tagName = tagMatch?.[1];
        if (tagName) {
            const attr = schemaIndex.get(tagName)?.attributes.find((a) => a.name === word);
            if (attr && isAttrNamePosition(line.text, word, wordRange.start.character)) {
                const md = new vscode.MarkdownString();
                md.appendMarkdown(`\`${attr.name}\`: \`${attr.type}\`${attr.required ? ' (required)' : ''}`);
                if (attr.enumValues?.length) md.appendMarkdown(`\n\nOne of: ${attr.enumValues.map((v) => `\`${v}\``).join(', ')}`);
                if (attr.doc) md.appendMarkdown('\n\n' + attr.doc);
                return new vscode.Hover(md, wordRange);
            }

            // Is the cursor inside a callback-bearing attribute's VALUE?
            for (const am of line.text.matchAll(ATTR_RE)) {
                const [full, attrName, value] = am;
                const valueStart = (am.index ?? 0) + full.indexOf(value, attrName.length);
                const valueEnd = valueStart + value.length;
                const offset = position.character;
                if (offset < valueStart || offset > valueEnd) continue;
                if (!CALLBACK_ATTRS.has(attrName)) continue;

                const fnName = value.split(/\s+/)[0];
                return resolveCallbackHover(document, fnName, new vscode.Range(position.line, valueStart, position.line, valueEnd));
            }
        }

        return undefined;
    }
}

function isAttrNamePosition(lineText: string, word: string, col: number): boolean {
    // crude but sufficient: word must be followed (ignoring whitespace) by `=`
    const after = lineText.slice(col + word.length);
    return /^\s*=/.test(after);
}

function resolveCallbackHover(document: vscode.TextDocument, fnName: string, range: vscode.Range): vscode.Hover | undefined {
    const builtIn = apiIndex.get(fnName);
    if (builtIn) return new vscode.Hover(docString(builtIn), range);

    for (const scriptPath of findScriptSrcs(document)) {
        const fn = findFunctionDefsInFile(scriptPath).find((f) => f.name === fnName);
        if (fn) {
            const md = new vscode.MarkdownString();
            md.appendMarkdown(`Callback \`${fnName}\` — defined in \`${path.basename(scriptPath)}:${fn.line + 1}\`.`);
            return new vscode.Hover(md, range);
        }
    }

    const scripts = findScriptSrcs(document);
    const md = new vscode.MarkdownString();
    md.appendMarkdown(
        scripts.length
            ? `⚠️ No function named \`${fnName}\` found in ${scripts.map((s) => `\`${path.basename(s)}\``).join(', ')}.`
            : `⚠️ \`${fnName}\` not found - no \`<script src="...">\` in this page to check.`
    );
    return new vscode.Hover(md, range);
}
