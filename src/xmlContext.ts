import * as vscode from 'vscode';

// Where the cursor sits inside a (possibly in-progress) XML tag. Heuristic,
// not a real XML parser - good enough for DABT pages, which are shallow and
// mostly self-closing widget tags (<pane/>, <label/>, ...).
export type XmlContext =
    | { kind: 'tagName'; parentTag: string; prefix: string; replaceStart: number }
    | { kind: 'attrName'; tagName: string; existingAttrs: string[]; prefix: string; replaceStart: number }
    | { kind: 'attrValue'; tagName: string; attrName: string; prefix: string; valueStart: number };

// Ancestor tag stack open at `offset` in well-formed text before it (i.e.
// text that does NOT include an in-progress/unclosed tag at the cursor).
function openTagStack(text: string, offset: number): string[] {
    const stack: string[] = [];
    const re = /<(\/?)([A-Za-z_][\w.-]*)([^>]*?)(\/?)>/g;
    let m: RegExpExecArray | null;
    while ((m = re.exec(text)) && m.index < offset) {
        const [, closing, name, , selfClose] = m;
        if (closing) {
            const i = stack.lastIndexOf(name);
            if (i !== -1) stack.length = i;
        } else if (!selfClose) {
            stack.push(name);
        }
    }
    return stack;
}

export function getXmlContext(document: vscode.TextDocument, position: vscode.Position): XmlContext | undefined {
    const offset = document.offsetAt(position);
    const text = document.getText();
    const before = text.slice(0, offset);

    // Find the last unmatched '<' before the cursor - if none, the cursor
    // is in text content / between tags, which isn't a completion context
    // this provider handles (typing '<' itself always creates one, though).
    const lastOpen = before.lastIndexOf('<');
    const lastClose = before.lastIndexOf('>');
    if (lastOpen === -1 || lastOpen < lastClose) return undefined;

    const content = before.slice(lastOpen + 1); // everything after the unmatched '<'
    if (content.startsWith('/') || content.startsWith('!') || content.startsWith('?')) return undefined;

    const spaceIdx = content.search(/\s/);
    if (spaceIdx === -1) {
        // Still typing the tag name itself.
        const parentStack = openTagStack(text.slice(0, lastOpen), lastOpen);
        return { kind: 'tagName', parentTag: parentStack[parentStack.length - 1] ?? '', prefix: content, replaceStart: lastOpen + 1 };
    }

    const tagName = content.slice(0, spaceIdx);
    const attrArea = content.slice(spaceIdx);

    const quoteCount = (attrArea.match(/"/g) ?? []).length;
    if (quoteCount % 2 === 1) {
        // Inside an unterminated "..." - an attribute value.
        const valueMatch = /([A-Za-z_][\w-]*)\s*=\s*"([^"]*)$/.exec(attrArea);
        if (!valueMatch) return undefined;
        const [, attrName, valuePrefix] = valueMatch;
        return { kind: 'attrValue', tagName, attrName, prefix: valuePrefix, valueStart: offset - valuePrefix.length };
    }

    // Attribute-name position: collect names already written on this tag,
    // and how much of a new name (if any) has been typed so far.
    const existingAttrs = Array.from(attrArea.matchAll(/([A-Za-z_][\w-]*)\s*=/g)).map((m) => m[1]);
    const trailingWordMatch = /(?:^|\s)([A-Za-z_][\w-]*)$/.exec(attrArea);
    const prefix = trailingWordMatch ? trailingWordMatch[1] : '';
    const replaceStart = trailingWordMatch ? offset - prefix.length : offset;
    // A name that's already fully typed with its own value shouldn't count
    // as "the prefix being completed" (e.g. `id="x" |` - about to start a
    // new attribute, not still editing `id`).
    const stillTypingLastAttr = prefix && !new RegExp(`${prefix}\\s*=`).test(attrArea);
    return {
        kind: 'attrName',
        tagName,
        existingAttrs,
        prefix: stillTypingLastAttr ? prefix : '',
        replaceStart: stillTypingLastAttr ? replaceStart : offset,
    };
}
