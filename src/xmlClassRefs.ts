// Shared scan for class="name" occurrences in a DABT XML document that
// resolve to an actual rule in the page's own <theme src="..."/> - used by
// both the native color-swatch provider (xmlClassColor.ts) and the fg/bg/mod
// inlay hints (xmlClassInlayHints.ts), so the two stay in sync by construction
// instead of two separately-maintained scans.
import * as vscode from 'vscode';
import { ThemeClassRule, loadThemeCss } from './themeCss';
import { findThemeSrcs } from './xmlHeuristics';

const CLASS_ATTR_RE = /\bclass="([^"]*)"/g;

export interface ClassRefMatch {
    className: string;
    valueStart: number; // offset right after the opening quote
    valueEnd: number; // offset right before the closing quote
    rule: ThemeClassRule;
}

function themeClassMap(document: vscode.TextDocument): Map<string, ThemeClassRule> {
    const out = new Map<string, ThemeClassRule>();
    for (const themePath of findThemeSrcs(document)) {
        const parsed = loadThemeCss(themePath);
        if (!parsed) continue;
        for (const cls of parsed.values()) out.set(cls.name, cls.base);
    }
    return out;
}

export function findClassRefMatches(document: vscode.TextDocument): ClassRefMatch[] {
    const themeClasses = themeClassMap(document);
    if (themeClasses.size === 0) return [];

    const out: ClassRefMatch[] = [];
    const text = document.getText();
    for (const m of text.matchAll(CLASS_ATTR_RE)) {
        const rule = themeClasses.get(m[1]);
        if (!rule) continue;
        const valueStart = (m.index ?? 0) + m[0].indexOf('"') + 1;
        out.push({ className: m[1], valueStart, valueEnd: valueStart + m[1].length, rule });
    }
    return out;
}
