// Parses DABT's share/tui.xsd into structured elements/attributes. Single
// source of truth - used both to live-scan an actual DABT install at
// extension runtime (src/apiSource.ts) and to regenerate the bundled
// offline fallback snapshot (src/data/dabtXsd.json, via src/parse/cli.ts).
//
// This is a purpose-built parser for DABT's specific (small, hand-written)
// XSD shape, including the shared attribute and child groups it uses.
import * as fs from 'fs';
import * as path from 'path';
import { DabtXsdData, XsdAttribute, XsdElement } from '../types';

function namedBlocks(text: string, tag: string): Map<string, string> {
    const blocks = new Map<string, string>();
    const blockRe = new RegExp(`<xs:${tag}\\s+name="([^"]+)">([\\s\\S]*?)<\\/xs:${tag}>`, 'g');
    for (const match of text.matchAll(blockRe)) blocks.set(match[1], match[2]);
    return blocks;
}

function parseAttributeGroups(
    body: string,
    groups: Map<string, string>,
    simpleTypes: Map<string, string[]>,
    active = new Set<string>(),
): XsdAttribute[] {
    const attributes: XsdAttribute[] = [];
    const itemRe = /<xs:attribute\s+([^/]*?)\/>|<xs:attributeGroup\s+ref="([^"]+)"\s*\/>/g;
    for (const match of body.matchAll(itemRe)) {
        const groupName = match[2];
        if (groupName) {
            const groupBody = groups.get(groupName);
            if (!groupBody || active.has(groupName)) continue;
            active.add(groupName);
            attributes.push(...parseAttributeGroups(groupBody, groups, simpleTypes, active));
            active.delete(groupName);
            continue;
        }

        const attrTag = match[0];
        const attrName = /name="([^"]+)"/.exec(attrTag)?.[1];
        if (!attrName) continue;
        const type = /type="([^"]+)"/.exec(attrTag)?.[1] ?? 'xs:string';
        const before = body.slice(0, match.index ?? 0);
        const commentMatch = /<!--\s*(.*?)\s*-->\s*\n\s*$/.exec(before);
        attributes.push({
            name: attrName,
            type: type.replace(/^xs:/, ''),
            required: /use="required"/.test(attrTag),
            enumValues: simpleTypes.get(type),
            doc: commentMatch ? commentMatch[1] : undefined,
        });
    }
    return Array.from(new Map(attributes.map((attribute) => [attribute.name, attribute])).values());
}

function parseChildren(body: string, groups: Map<string, string>, active = new Set<string>()): string[] {
    const children: string[] = [];
    const itemRe = /<xs:element\s+ref="([^"]+)"\s*\/>|<xs:group\s+ref="([^"]+)"\s*\/>/g;
    for (const match of body.matchAll(itemRe)) {
        const elementName = match[1];
        if (elementName) {
            children.push(elementName);
            continue;
        }
        const groupName = match[2];
        const groupBody = groups.get(groupName);
        if (!groupBody || active.has(groupName)) continue;
        active.add(groupName);
        children.push(...parseChildren(groupBody, groups, active));
        active.delete(groupName);
    }
    return [...new Set(children)];
}

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
    const attributeGroups = namedBlocks(text, 'attributeGroup');
    const childGroups = namedBlocks(text, 'group');

    // --- elements: <xs:element name="pane"> ... </xs:element> (top-level only, not nested xs:element refs)
    const elements: XsdElement[] = [];
    const elementBlockRe = /<xs:element\s+name="([^"]+)">([\s\S]*?)\n {2}<\/xs:element>/g;
    for (const m of text.matchAll(elementBlockRe)) {
        const [, name, body] = m;

        const docMatch = /<xs:documentation>([\s\S]*?)<\/xs:documentation>/.exec(body);
        const doc = docMatch ? docMatch[1].replace(/\s+/g, ' ').trim() : '';

        const children = parseChildren(body, childGroups);
        const attributes = parseAttributeGroups(body, attributeGroups, simpleTypes);
        elements.push({ name, doc, children, attributes });
    }

    const versionFile = path.join(srcRoot, 'VERSION');
    return {
        generatedAt: new Date().toISOString(),
        sourceVersion: fs.existsSync(versionFile) ? fs.readFileSync(versionFile, 'utf8').trim() : null,
        elements,
    };
}
