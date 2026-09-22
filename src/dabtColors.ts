import * as vscode from 'vscode';

// DABT theme.css colors are either a colors.sh name (fg.NAME / bg.NAME in
// lib/terminal_controls.sh - the standard 16-color ANSI set) or a #RRGGBB
// hex value. This is the xterm/VTE default palette, the closest fixed
// mapping to "what that name actually looks like" without asking a real
// terminal - used only for editor color-swatch previews, not for anything
// that ships to a running DABT app.
const ANSI_NAME_HEX: Record<string, string> = {
    black: '#000000',
    red: '#cc0000',
    green: '#4e9a06',
    yellow: '#c4a000',
    blue: '#3465a4',
    magenta: '#75507b',
    cyan: '#06989a',
    white: '#d3d7cf',
    br_black: '#555753',
    br_red: '#ef2929',
    br_green: '#8ae234',
    br_yellow: '#fce94f',
    br_blue: '#729fcf',
    br_magenta: '#ad7fa8',
    br_cyan: '#34e2e2',
    br_white: '#eeeeec',
};

// theme.css color values that aren't a fixed color at all (fg.default =
// terminal foreground) - nothing to swatch.
const NO_SWATCH = new Set(['default']);

// Resolves a theme.css fg/bg value (an ANSI name or #hex) to a plain
// "#rrggbb" string - what decoration renderOptions (backgroundColor/color)
// take, as opposed to resolveColorToVscodeColor's vscode.Color (what
// DocumentColorProvider takes).
export function resolveColorToHex(value: string | undefined): string | undefined {
    if (!value) return undefined;
    const v = value.trim();
    if (NO_SWATCH.has(v)) return undefined;
    if (/^#[0-9a-fA-F]{6}$/.test(v)) return v.toLowerCase();
    return ANSI_NAME_HEX[v];
}

export function resolveColorToVscodeColor(value: string): vscode.Color | undefined {
    const hex = resolveColorToHex(value);
    return hex ? hexFromString(hex.slice(1)) : undefined;
}

function hexFromString(hex6: string): vscode.Color {
    const r = parseInt(hex6.slice(0, 2), 16) / 255;
    const g = parseInt(hex6.slice(2, 4), 16) / 255;
    const b = parseInt(hex6.slice(4, 6), 16) / 255;
    return new vscode.Color(r, g, b, 1);
}

// Perceived-luminance-based black/white pick for text drawn on top of a
// resolved swatch color, so a required-attribute badge or fg/bg chip stays
// legible against light AND dark theme colors alike.
export function contrastTextColor(hex: string): string {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    return luminance > 0.55 ? '#000000' : '#ffffff';
}

export const ANSI_COLOR_NAMES = Object.keys(ANSI_NAME_HEX).concat('default');
