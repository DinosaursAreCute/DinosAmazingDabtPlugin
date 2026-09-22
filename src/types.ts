// Shared data shapes for both the live source scanner (src/parse/*.ts,
// runs against an actual DABT install at extension runtime) and the
// bundled-snapshot JSON under src/data/ (the offline fallback used when no
// DABT install can be found - see src/apiSource.ts). Keeping ONE set of
// types/parsers for both means there's nothing to keep in sync by hand.

export interface DabtParam {
    name: string;
    optional: boolean;
}

export interface DabtFunction {
    name: string;
    file: string;
    line: number;
    private: boolean;
    doc: string;
    headerDoc?: string;
    sig?: string;
    params?: DabtParam[];
    paramsSource?: 'doc' | 'inferred';
}

export interface DabtApiData {
    generatedAt: string;
    sourceVersion: string | null;
    functionCount: number;
    publicCount: number;
    privateCount: number;
    functions: DabtFunction[];
}

export interface XsdAttribute {
    name: string;
    type: string;
    required: boolean;
    enumValues?: string[];
    doc?: string;
}

export interface XsdElement {
    name: string;
    doc: string;
    children: string[];
    attributes: XsdAttribute[];
}

export interface DabtXsdData {
    generatedAt: string;
    sourceVersion: string | null;
    elements: XsdElement[];
}
