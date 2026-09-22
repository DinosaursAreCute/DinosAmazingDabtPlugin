import bundled from './data/dabtXsd.json';
import { DabtXsdData, XsdElement } from './types';

export type { XsdAttribute, XsdElement } from './types';

const bundledData = bundled as DabtXsdData;

class SchemaIndex {
    private byName = new Map<string, XsdElement>();
    private meta_: { generatedAt: string; sourceVersion: string | null };

    constructor(data: DabtXsdData) {
        this.meta_ = { generatedAt: '', sourceVersion: null };
        this.load(data);
    }

    load(data: DabtXsdData) {
        this.byName.clear();
        for (const e of data.elements) this.byName.set(e.name, e);
        this.meta_ = { generatedAt: data.generatedAt, sourceVersion: data.sourceVersion };
    }

    get(name: string): XsdElement | undefined {
        return this.byName.get(name);
    }

    all(): XsdElement[] {
        return Array.from(this.byName.values());
    }

    childrenOf(elementName: string): XsdElement[] {
        const el = this.get(elementName);
        if (!el) return [];
        return el.children.map((c) => this.get(c)).filter((x): x is XsdElement => !!x);
    }

    get meta() {
        return this.meta_;
    }
}

// Attributes on any DABT widget element (action/on_visit/on_change/submit)
// that carry the name of a bash callback function - what the "jump to /
// hover the callback" cross-reference feature keys off. `page` is
// deliberately excluded: it names an xml file, not a function.
export const CALLBACK_ATTRS = new Set(['action', 'on_visit', 'on_change', 'submit']);

export const schemaIndex = new SchemaIndex(bundledData);
