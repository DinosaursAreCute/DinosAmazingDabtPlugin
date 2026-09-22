import * as vscode from 'vscode';
import { resolveColorToVscodeColor } from './dabtColors';

// VS Code's built-in CSS language service already swatches real CSS color
// keywords (red, cyan, ...) and #hex values wherever they appear - including
// inside DABT's `fg: red;` / `bg: #b00020;` lines, since it's a lexical scan,
// not one that cares whether `fg`/`bg` are real CSS properties. The gap is
// DABT's own bright-color names (br_red, br_cyan, ...): not CSS keywords, so
// the built-in provider skips them. This fills only that gap - it does NOT
// also swatch the base names, which would just double up on what's already
// there.
const BRIGHT_NAME_RE = /\bbr_[a-z]+\b/g;

// Only DABT theme.css-shaped files: `.class { ... fg:/bg:/mods: ... }`. This
// runs for every open .css file's provideDocumentColors call otherwise, so
// the check has to be cheap and specific enough not to fire on unrelated
// project stylesheets that happen to contain some word starting "br_".
function looksLikeDabtTheme(text: string): boolean {
    return /\.[A-Za-z_][\w-]*\s*\{[^}]*\b(fg|bg|mods)\s*:/.test(text);
}

export class DabtCssColorProvider implements vscode.DocumentColorProvider {
    provideDocumentColors(document: vscode.TextDocument): vscode.ColorInformation[] {
        const text = document.getText();
        if (!looksLikeDabtTheme(text)) return [];

        const out: vscode.ColorInformation[] = [];
        for (const m of text.matchAll(BRIGHT_NAME_RE)) {
            const color = resolveColorToVscodeColor(m[0]);
            if (!color) continue;
            const start = m.index ?? 0;
            const range = new vscode.Range(document.positionAt(start), document.positionAt(start + m[0].length));
            out.push(new vscode.ColorInformation(range, color));
        }
        return out;
    }

    provideColorPresentations(color: vscode.Color): vscode.ColorPresentation[] {
        // A real edit, like normal CSS colors get: picking a new color
        // rewrites br_red -> a literal #rrggbb (there's no ANSI name for an
        // arbitrary picked color, so falling through to hex is the only
        // valid theme.css value - same as editing any other hex color here).
        const toHex = (n: number) => Math.round(n * 255).toString(16).padStart(2, '0');
        const hex = `#${toHex(color.red)}${toHex(color.green)}${toHex(color.blue)}`;
        return [new vscode.ColorPresentation(hex)];
    }
}
