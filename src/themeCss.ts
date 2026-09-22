// Parses DABT's theme.css format: `.class[:state] { fg: NAME|#hex; bg: ...;
// mods: bold underline; }`. See lib/tui_style.sh / docs/guide/plugins.md for
// the format itself. Deliberately not a general CSS parser - DABT's theme
// files are this one flat shape, nothing nested, no selectors besides
// `.name` and `.name:state`.
import * as fs from 'fs';

export interface ThemeClassRule {
    fg?: string;
    bg?: string;
    mods?: string;
}

export interface ThemeClass {
    name: string;
    base: ThemeClassRule;
    states: Record<string, ThemeClassRule>; // 'focus' | 'border' | 'title' | 'hover' | 'checked' | 'unchecked'
}

const RULE_RE = /\.([A-Za-z_][\w-]*)(?::([a-z]+))?\s*\{([^}]*)\}/g;

export function parseThemeCss(text: string): Map<string, ThemeClass> {
    const classes = new Map<string, ThemeClass>();

    for (const m of text.matchAll(RULE_RE)) {
        const [, name, state, body] = m;
        const rule: ThemeClassRule = {};
        const fgMatch = /\bfg\s*:\s*([^;]+);/.exec(body);
        const bgMatch = /\bbg\s*:\s*([^;]+);/.exec(body);
        const modsMatch = /\bmods\s*:\s*([^;]+);/.exec(body);
        if (fgMatch) rule.fg = fgMatch[1].trim();
        if (bgMatch) rule.bg = bgMatch[1].trim();
        if (modsMatch) rule.mods = modsMatch[1].trim();

        let entry = classes.get(name);
        if (!entry) {
            entry = { name, base: {}, states: {} };
            classes.set(name, entry);
        }
        if (state) entry.states[state] = rule;
        else entry.base = rule;
    }

    return classes;
}

export function loadThemeCss(absPath: string): Map<string, ThemeClass> | undefined {
    let text: string;
    try {
        text = fs.readFileSync(absPath, 'utf8');
    } catch {
        return undefined;
    }
    return parseThemeCss(text);
}
