// Required-attribute markers for DABT XML pages: every required attribute
// actually written in a tag gets a small red asterisk badge, so required-
// ness is visible without a hover/xsd lookup. (fg/bg/mod for class="..." is
// handled separately by a real DocumentColorProvider + inlay hints - see
// xmlClassColor.ts / xmlClassInlayHints.ts - so it stays a normal, natively
// clickable/editable color reference instead of a custom decoration.)
import * as vscode from 'vscode';
import { schemaIndex } from './xsdData';
import { isDabtXmlDocument } from './xmlHeuristics';

const requiredAttrType = vscode.window.createTextEditorDecorationType({});

// Tag open + its raw attribute area, e.g. `<pane id="root" split="v"`.
const TAG_OPEN_RE = /<([A-Za-z_][\w.-]*)((?:\s+[A-Za-z_][\w-]*\s*=\s*"[^"]*")*)/g;
const ATTR_NAME_RE = /([A-Za-z_][\w-]*)\s*=\s*"/g;

export function updateXmlDecorations(editor: vscode.TextEditor | undefined) {
    if (!editor) return;
    const document = editor.document;

    if (!isDabtXmlDocument(document)) {
        editor.setDecorations(requiredAttrType, []);
        return;
    }

    const text = document.getText();
    const requiredRanges: vscode.DecorationOptions[] = [];
    for (const tagMatch of text.matchAll(TAG_OPEN_RE)) {
        const [, tagName, attrArea] = tagMatch;
        const el = schemaIndex.get(tagName);
        if (!el) continue;
        const requiredNames = new Set(el.attributes.filter((a) => a.required).map((a) => a.name));
        if (requiredNames.size === 0) continue;

        const attrAreaStart = (tagMatch.index ?? 0) + tagMatch[0].length - attrArea.length;
        for (const am of attrArea.matchAll(ATTR_NAME_RE)) {
            if (!requiredNames.has(am[1])) continue;
            const nameEnd = attrAreaStart + (am.index ?? 0) + am[1].length;
            const pos = document.positionAt(nameEnd);
            requiredRanges.push({
                range: new vscode.Range(pos, pos),
                renderOptions: {
                    after: {
                        contentText: '*',
                        color: '#f14c4c',
                        fontWeight: 'bold',
                        textDecoration: 'none; position: relative; top: -0.5em; font-size: 0.85em;',
                    },
                },
            });
        }
    }
    editor.setDecorations(requiredAttrType, requiredRanges);
}

export function disposeXmlDecorations() {
    requiredAttrType.dispose();
}
