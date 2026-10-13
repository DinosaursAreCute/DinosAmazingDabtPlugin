// Tag-level scan of a DABT markup page: elements with attribute spans and nesting.
// Not an XML parser - a malformed tag is skipped (the framework validator reports
// those), comments, CDATA and processing instructions are stepped over.
export interface XmlAttr {
    name: string;
    value: string;
    nameStart: number;
    valueStart: number; // offset right after the opening quote
    valueEnd: number; // offset right before the closing quote
}

export interface XmlElement {
    name: string;
    nameStart: number;
    start: number;
    end: number; // offset after the closing tag (after the open tag when none was found)
    selfClosing: boolean;
    attrs: XmlAttr[];
    parent: number; // index into the result, -1 at top level
}

const TOKEN_RE = new RegExp(
    [
        '<!--[\\s\\S]*?-->',
        '<!\\[CDATA\\[[\\s\\S]*?\\]\\]>',
        '<\\?[\\s\\S]*?\\?>',
        '<!DOCTYPE[^>]*>',
        '</([A-Za-z_][\\w.:-]*)\\s*>',
        '<([A-Za-z_][\\w.:-]*)((?:\\s+[^\\s=/>]+\\s*=\\s*(?:"[^"]*"|\'[^\']*\'))*)\\s*(/?)>',
    ].join('|'),
    'g'
);
const ATTR_RE = /([^\s=/>]+)\s*=\s*(?:"([^"]*)"|'([^']*)')/g;

export function scanXml(text: string): XmlElement[] {
    const out: XmlElement[] = [];
    const open: number[] = []; // indexes of the elements still open
    for (const m of text.matchAll(TOKEN_RE)) {
        const at = m.index ?? 0;
        if (m[1] !== undefined) {
            const idx = open.map((i) => out[i].name).lastIndexOf(m[1]);
            if (idx >= 0) {
                out[open[idx]].end = at + m[0].length;
                open.length = idx;
            }
            continue;
        }
        if (m[2] === undefined) continue;

        const attrs: XmlAttr[] = [];
        const attrArea = m[3] ?? '';
        const areaStart = at + 1 + m[2].length;
        for (const am of attrArea.matchAll(ATTR_RE)) {
            const value = am[2] ?? am[3] ?? '';
            const attrAt = areaStart + (am.index ?? 0);
            const valueStart = attrAt + am[0].length - value.length - 1;
            attrs.push({ name: am[1], value, nameStart: attrAt, valueStart, valueEnd: valueStart + value.length });
        }
        const selfClosing = m[4] === '/';
        out.push({
            name: m[2],
            nameStart: at + 1,
            start: at,
            end: at + m[0].length,
            selfClosing,
            attrs,
            parent: open.length ? open[open.length - 1] : -1,
        });
        if (!selfClosing) open.push(out.length - 1);
    }
    return out;
}
