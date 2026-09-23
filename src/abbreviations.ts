// Glossary of the underscore-separated abbreviation segments DABT's own
// framework source uses in internal (_-prefixed) identifiers, e.g. `KIND` in
// `_DLG_KIND` -> "dialog". Unlike src/apiData.ts this is never live-scanned:
// meanings need a human/AI to actually read the code, not a parser, so it's
// a static bundled reference kept in sync by hand. See scripts/gen-abbrev-
// candidates.js for the (fully automatic) half of that job: finding which
// segments exist in a DABT checkout and aren't defined here yet.
import bundled from './data/dabtAbbreviations.json';

export interface AbbrevEntry {
    abbr: string;
    meaning: string;
    subsystem?: string;
}

interface AbbrevData {
    generatedAt: string;
    entries: AbbrevEntry[];
}

const data = bundled as AbbrevData;
const byAbbr = new Map(data.entries.map((e) => [e.abbr, e]));

export function lookupAbbrev(abbr: string): AbbrevEntry | undefined {
    return byAbbr.get(abbr);
}

// Splits a name like `_DLG_KIND` or `_TXLK` into its `_`-separated segments
// and returns the glossary entry for each one that's defined, in order,
// without duplicates. Segments not in the glossary (plain words like
// `WIDTH`, or ones nobody's documented yet) are silently skipped.
export function explainIdentifier(name: string): AbbrevEntry[] {
    const segments = name.replace(/^_+/, '').split('_').filter(Boolean);
    const seen = new Set<string>();
    const out: AbbrevEntry[] = [];
    for (const seg of segments) {
        const entry = byAbbr.get(seg);
        if (entry && !seen.has(entry.abbr)) {
            seen.add(entry.abbr);
            out.push(entry);
        }
    }
    return out;
}
