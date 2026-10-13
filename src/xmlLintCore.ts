// Checks a DABT markup page against the schema data the extension already holds and
// against the files it points at. Pure (no editor types) so it runs under node:test.
// The framework validator (see xmlValidator.ts) stays the authority for layout rules;
// these checks are the instant, save-free subset.
import { XsdElement } from './types';
import { scanXml, XmlElement } from './xmlScan';

export type XmlSeverity = 'warning' | 'info';

export interface XmlFinding {
    start: number;
    end: number;
    message: string;
    severity: XmlSeverity;
    code: string;
}

export interface XmlLintContext {
    schema(name: string): XsdElement | undefined;
    callbackAttrs: ReadonlySet<string>;
    isBuiltInCallback(fn: string): boolean;
    // Functions defined in the page's <script src> files; undefined when the page has none that resolve.
    scriptFunctions: ReadonlySet<string> | undefined;
    fileExists(relativePath: string): boolean;
    // Theme classes visible to the page; undefined when no theme could be read.
    themeClasses: ReadonlySet<string> | undefined;
}

const FILE_ATTRS = new Set(['src', 'page']);
// Instances of these carry the template's own parameters as attributes.
const PARAMETERISED = new Set(['template', 'use', 'include', 'fill', 'slot', 'for', 'if', 'else', 'set']);
// Branches and templates repeat ids legitimately: only one branch ends up on the page.
const ID_SCOPES = new Set(['template', 'for', 'if', 'else', 'component', 'addon']);

const isTemplated = (value: string) => value.includes('{{') || value.includes('$');
const ignoredAttr = (name: string) => name === 'xmlns' || name.startsWith('xmlns:') || name.startsWith('xsi:') || name.startsWith('data-');

export function lintXml(text: string, ctx: XmlLintContext): XmlFinding[] {
    const elements = scanXml(text);
    const out: XmlFinding[] = [];
    const componentTags = new Set<string>();
    for (const el of elements) {
        if (el.name !== 'component') continue;
        const name = el.attrs.find((a) => a.name === 'name')?.value;
        if (name) componentTags.add(name);
    }

    const seenIds = new Map<string, number>();
    elements.forEach((el, index) => {
        const schema = ctx.schema(el.name);
        if (!schema && !componentTags.has(el.name)) {
            out.push({
                start: el.nameStart,
                end: el.nameStart + el.name.length,
                message: `Unknown element <${el.name}> - the loader ignores it.`,
                severity: 'warning',
                code: 'dabt-xml-unknown-element',
            });
        }
        if (schema) checkAttributes(el, schema, out);

        for (const attr of el.attrs) {
            if (isTemplated(attr.value) || !attr.value) continue;
            if (ctx.callbackAttrs.has(attr.name)) checkCallback(attr, ctx, out);
            else if (FILE_ATTRS.has(attr.name)) checkFile(attr, ctx, out);
            else if (attr.name === 'class') checkClasses(attr, ctx, out);
            else if (attr.name === 'id') checkId(el, index, elements, seenIds, attr, out);
        }
    });
    return out;
}

function checkAttributes(el: XmlElement, schema: XsdElement, out: XmlFinding[]) {
    const known = new Set(schema.attributes.map((a) => a.name));
    if (!PARAMETERISED.has(el.name) && el.name !== 'component') {
        for (const attr of el.attrs) {
            if (known.has(attr.name) || ignoredAttr(attr.name)) continue;
            out.push({
                start: attr.nameStart,
                end: attr.nameStart + attr.name.length,
                message: `<${el.name}> has no attribute '${attr.name}'.`,
                severity: 'warning',
                code: 'dabt-xml-unknown-attribute',
            });
        }
    }
    const given = new Set(el.attrs.map((a) => a.name));
    for (const attr of schema.attributes) {
        if (!attr.required || given.has(attr.name)) continue;
        out.push({
            start: el.nameStart,
            end: el.nameStart + el.name.length,
            message: `<${el.name}> is missing the required attribute '${attr.name}'.`,
            severity: 'warning',
            code: 'dabt-xml-missing-attribute',
        });
    }
}

function checkCallback(attr: XmlElement['attrs'][number], ctx: XmlLintContext, out: XmlFinding[]) {
    if (!ctx.scriptFunctions) return;
    const fn = attr.value.trim().split(/\s+/)[0];
    if (!fn || ctx.isBuiltInCallback(fn) || ctx.scriptFunctions.has(fn)) return;
    out.push({
        start: attr.valueStart,
        end: attr.valueEnd,
        message: `No function '${fn}' in this page's <script src> files or in the DABT API.`,
        severity: 'warning',
        code: 'dabt-xml-undefined-callback',
    });
}

function checkFile(attr: XmlElement['attrs'][number], ctx: XmlLintContext, out: XmlFinding[]) {
    if (/^[a-z]+:\/\//i.test(attr.value) || ctx.fileExists(attr.value)) return;
    out.push({
        start: attr.valueStart,
        end: attr.valueEnd,
        message: `File '${attr.value}' not found next to this page.`,
        severity: 'warning',
        code: 'dabt-xml-missing-file',
    });
}

function checkClasses(attr: XmlElement['attrs'][number], ctx: XmlLintContext, out: XmlFinding[]) {
    if (!ctx.themeClasses || ctx.themeClasses.size === 0) return;
    let offset = 0;
    for (const token of attr.value.split(/(\s+)/)) {
        const at = attr.valueStart + offset;
        offset += token.length;
        if (!token.trim() || ctx.themeClasses.has(token)) continue;
        out.push({
            start: at,
            end: at + token.length,
            message: `Class '${token}' is not defined in the page's theme or the default theme.`,
            severity: 'info',
            code: 'dabt-xml-unknown-class',
        });
    }
}

function checkId(
    el: XmlElement,
    index: number,
    elements: XmlElement[],
    seenIds: Map<string, number>,
    attr: XmlElement['attrs'][number],
    out: XmlFinding[]
) {
    for (let p = el.parent; p !== -1; p = elements[p].parent) if (ID_SCOPES.has(elements[p].name)) return;
    if (ID_SCOPES.has(el.name) || !seenIds.has(attr.value)) {
        seenIds.set(attr.value, index);
        return;
    }
    out.push({
        start: attr.valueStart,
        end: attr.valueEnd,
        message: `Duplicate id '${attr.value}' - the first one is on <${elements[seenIds.get(attr.value)!].name}>.`,
        severity: 'warning',
        code: 'dabt-xml-duplicate-id',
    });
}
