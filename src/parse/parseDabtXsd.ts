// Parses DABT's share/tui.xsd into structured elements/attributes. Single
// source of truth - used both to live-scan an actual DABT install at
// extension runtime (src/apiSource.ts) and to regenerate the bundled
// offline fallback snapshot (src/data/dabtXsd.json, via src/parse/cli.ts).
//
// This is a purpose-built parser for DABT's specific (small, hand-written)
// xsd shape - xs:element/xs:complexType/xs:attribute/xs:simpleType with
// xs:enumeration - not a general XSD parser.
import * as fs from 'fs';
import * as path from 'path';
import { DabtXsdData, XsdAttribute, XsdElement } from '../types';

export function parseDabtXsd(srcRoot: string): DabtXsdData | undefined {
    const xsdPath = path.join(srcRoot, 'share', 'tui.xsd');
    if (!fs.existsSync(xsdPath)) return undefined;
    const text = fs.readFileSync(xsdPath, 'utf8');

    // --- simpleType enums: <xs:simpleType name="alignType"><xs:restriction ...><xs:enumeration value="left"/>...
    const simpleTypes = new Map<string, string[]>();
    for (const m of text.matchAll(/<xs:simpleType\s+name="([^"]+)">([\s\S]*?)<\/xs:simpleType>/g)) {
        const [, name, body] = m;
        const values = Array.from(body.matchAll(/<xs:enumeration\s+value="([^"]*)"/g)).map((e) => e[1]);
        simpleTypes.set(name, values);
    }

    // --- elements: <xs:element name="pane"> ... </xs:element> (top-level only, not nested xs:element refs)
    const elements: XsdElement[] = [];
    const elementBlockRe = /<xs:element\s+name="([^"]+)">([\s\S]*?)\n {2}<\/xs:element>/g;
    for (const m of text.matchAll(elementBlockRe)) {
        const [, name, body] = m;

        const docMatch = /<xs:documentation>([\s\S]*?)<\/xs:documentation>/.exec(body);
        const doc = docMatch ? docMatch[1].replace(/\s+/g, ' ').trim() : '';

        const children = Array.from(body.matchAll(/<xs:element\s+ref="([^"]+)"/g)).map((c) => c[1]);

        const attributes: XsdAttribute[] = [];
        for (const am of body.matchAll(/<xs:attribute\s+([^/]*?)\/>/g)) {
            const attrTag = am[0];
            const attrName = /name="([^"]+)"/.exec(attrTag)?.[1];
            if (!attrName) continue;
            const type = /type="([^"]+)"/.exec(attrTag)?.[1] ?? 'xs:string';
            const required = /use="required"/.test(attrTag);
            const enumValues = simpleTypes.get(type);

            // Grab a single-line "<!-- comment -->" immediately preceding this
            // attribute, if any, as its doc (tui.xsd uses these for the
            // split=fixed/grid-only attribute groups).
            const beforeIdx = am.index ?? 0;
            const before = body.slice(0, beforeIdx);
            const commentMatch = /<!--\s*(.*?)\s*-->\s*\n\s*$/.exec(before);

            attributes.push({
                name: attrName,
                type: type.replace(/^xs:/, ''),
                required,
                enumValues,
                doc: commentMatch ? commentMatch[1] : undefined,
            });
        }

        elements.push({ name, doc, children, attributes });
    }

    const versionFile = path.join(srcRoot, 'VERSION');
    return {
        generatedAt: new Date().toISOString(),
        sourceVersion: fs.existsSync(versionFile) ? fs.readFileSync(versionFile, 'utf8').trim() : null,
        elements,
    };
}
