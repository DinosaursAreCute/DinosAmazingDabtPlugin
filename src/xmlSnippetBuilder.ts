import * as vscode from 'vscode';
import { XsdAttribute, XsdElement } from './types';

// Per-attribute-type placeholder defaults, so an inserted element snippet
// starts with something plausible rather than an empty string the user has
// to fill blind. Enum-typed attributes are handled separately in
// buildElementSnippet via appendChoice (a real dropdown, not text).
function placeholderFor(attr: XsdAttribute): string {
    switch (attr.type) {
        case 'positiveInteger':
            return '1';
        case 'nonNegativeInteger':
            return '0';
        case 'integer':
            return '0';
        case 'boolType':
            return 'true';
        default:
            return attr.name === 'id' ? 'id' : '';
    }
}

// Builds a snippet for ELEMENT with a tabstop for every attribute (required
// ones first) so the user can Tab straight through each argument in order,
// each pre-filled with a sensible default - exactly the "generate a pane
// line with default values, let me jump through each argument" workflow.
// `includeOptional` off gives just the required attributes (a quick insert);
// on gives the full attribute set for deliberate authoring.
export function buildElementSnippet(element: XsdElement, includeOptional: boolean): vscode.SnippetString {
    const attrs = [...element.attributes]
        .sort((a, b) => Number(b.required) - Number(a.required))
        .filter((a) => a.required || includeOptional);

    const snippet = new vscode.SnippetString();
    snippet.appendText(`<${element.name}`);

    let n = 1;
    for (const attr of attrs) {
        snippet.appendText(` ${attr.name}="`);
        if (attr.enumValues?.length) {
            snippet.appendChoice(attr.enumValues, n++);
        } else {
            const def = placeholderFor(attr);
            snippet.appendPlaceholder(def, n++);
        }
        snippet.appendText('"');
    }

    if (element.children.length) {
        snippet.appendText('>');
        snippet.appendTabstop(n++);
        snippet.appendText(`</${element.name}>`);
    } else {
        snippet.appendText('/>');
    }
    snippet.appendTabstop(0);
    return snippet;
}
