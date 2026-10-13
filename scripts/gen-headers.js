#!/usr/bin/env node
// Generates the block-font header images used in the release notes, in the extension's colours.
//
//   node scripts/gen-headers.js --all                       every named header below -> assets/headers/
//   node scripts/gen-headers.js "TEXT" [OUT.svg] [--cell N]  one header (OUT defaults to assets/headers/<slug>.svg)
//   node scripts/gen-headers.js --version 0.2.0              the title image assets/headers/v0-2-0.svg
//
// Same look as the DABT framework's tools/gen_header.sh: 5 cells high, one colour per letter (cycled),
// transparent background, default cell 7 px. The palette is the one of assets/logo.png and assets/icon.png
// (override with HEADER_COLORS="#7ec8e3 #a8d8ff ..."). The font is a copy of the framework's block5 font,
// so no DABT checkout is needed. Glyphs: A-Z 0-9 . , - : ? / _ !  (lowercase is uppercased, other characters
// are dropped, a space is a 3 cell gap).
'use strict';
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const OUT_DIR = path.join(ROOT, 'assets', 'headers');
const PALETTE = ['#7ec8e3', '#a8d8ff', '#c9b8ff', '#ffb8e0'];
const LETTER_GAP = 1;
const WORD_GAP = 3;

// name -> text of the headers the release notes (scripts/gen-release-notes.js) point at.
const NAMED = {
    'release-new': 'WHATS NEW',
    'release-added': 'ADDED',
    'release-changed': 'CHANGED',
    'release-what-changed': 'WHAT CHANGED',
    'release-fixed': 'FIXED',
    'release-deprecated': 'DEPRECATED',
    'release-removed': 'REMOVED',
    'release-security': 'SECURITY',
    'release-result': 'THE RESULT',
    'release-install': 'INSTALL OR UPDATE',
};

const FONT = {
    "!": ["█", "█", "█", " ", "█"],
    ",": [" ", " ", " ", "█", "█"],
    "-": ["    ", "    ", "████", "    ", "    "],
    ".": [" ", " ", " ", " ", "█"],
    "/": ["   █", "  █ ", " █  ", "█   ", "    "],
    "0": [" ██ ", "█  █", "█  █", "█  █", " ██ "],
    "1": [" █ ", "██ ", " █ ", " █ ", "███"],
    "2": [" ██ ", "█  █", "  █ ", " █  ", "████"],
    "3": ["███ ", "   █", " ██ ", "   █", "███ "],
    "4": ["█  █", "█  █", "████", "   █", "   █"],
    "5": ["████", "█   ", "███ ", "   █", "███ "],
    "6": [" ███", "█   ", "███ ", "█  █", " ██ "],
    "7": ["████", "   █", "  █ ", " █  ", " █  "],
    "8": [" ██ ", "█  █", " ██ ", "█  █", " ██ "],
    "9": [" ██ ", "█  █", " ███", "   █", "███ "],
    ":": [" ", " ", "█", " ", "█"],
    "?": [" ██ ", "█  █", "  █ ", "    ", "  █ "],
    "A": [" ██ ", "████", "█  █", "████", "█  █"],
    "B": ["███ ", "█  █", "███ ", "█  █", "███ "],
    "C": [" ███", "█   ", "█   ", "█   ", " ███"],
    "D": ["███ ", "█  █", "█  █", "█  █", "███ "],
    "E": ["████", "█   ", "███ ", "█   ", "████"],
    "F": ["████", "█   ", "███ ", "█   ", "█   "],
    "G": [" ███", "█   ", "█ ██", "█  █", " ███"],
    "H": ["█  █", "█  █", "████", "█  █", "█  █"],
    "I": ["███", " █ ", " █ ", " █ ", "███"],
    "J": ["████", "  █ ", "  █ ", "█ █ ", " █  "],
    "K": ["█  █", "█ █ ", "██  ", "█ █ ", "█  █"],
    "L": ["█   ", "█   ", "█   ", "█   ", "████"],
    "M": ["█   █", "██ ██", "█ █ █", "█   █", "█   █"],
    "N": ["█   █", "██  █", "█ █ █", "█  ██", "█   █"],
    "O": [" ██ ", "█  █", "█  █", "█  █", " ██ "],
    "P": ["███ ", "█  █", "███ ", "█   ", "█   "],
    "Q": [" ██ ", "█  █", "█ ██", " ███", "   █"],
    "R": ["███ ", "█  █", "███ ", "█ █ ", "█  █"],
    "S": [" ███", "█   ", " ██ ", "   █", "███ "],
    "T": ["█████", "  █  ", "  █  ", "  █  ", "  █  "],
    "U": ["█  █", "█  █", "█  █", "█  █", " ██ "],
    "V": ["█   █", "█   █", " █ █ ", " █ █ ", "  █  "],
    "W": ["█   █", "█   █", "█ █ █", "██ ██", "█   █"],
    "X": ["█  █", "█  █", " ██ ", "█  █", "█  █"],
    "Y": ["█   █", " █ █ ", "  █  ", "  █  ", "  █  "],
    "Z": ["████", "  █ ", " █  ", "█   ", "████"],
    "_": ["    ", "    ", "    ", "    ", "████"],
};

function colours() {
    const given = (process.env.HEADER_COLORS || '').split(/\s+/).filter(Boolean);
    return given.length ? given : PALETTE;
}

// Returns the SVG text for TEXT, or undefined when no character of it has a glyph.
function render(text, cell = 7, palette = colours()) {
    const rects = [];
    let x = 0;
    let letter = 0;
    for (const ch of text.toUpperCase()) {
        if (ch === ' ') {
            x += WORD_GAP;
            continue;
        }
        const rows = FONT[ch];
        if (!rows) continue;
        const fill = palette[letter % palette.length];
        rows.forEach((row, r) => {
            [...row].forEach((pixel, c) => {
                if (pixel === '█') {
                    rects.push(`<rect fill="${fill}" x="${(x + c) * cell}" y="${r * cell}" width="${cell}" height="${cell}"/>`);
                }
            });
        });
        x += rows[0].length + LETTER_GAP;
        letter++;
    }
    if (!letter) return undefined;
    const width = (x - LETTER_GAP) * cell;
    const height = 5 * cell;
    return (
        `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" shape-rendering="crispEdges">\n` +
        rects.join('\n') +
        '\n</svg>\n'
    );
}

function write(text, out, cell) {
    const svg = render(text, cell);
    if (!svg) throw new Error(`no glyph for any character of "${text}"`);
    fs.mkdirSync(path.dirname(out), { recursive: true });
    fs.writeFileSync(out, svg);
    return out;
}

const versionFile = (version) => path.join(OUT_DIR, `v${version.replace(/[.+]/g, '-')}.svg`);
const slug = (text) => text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

function main(argv) {
    const cellAt = argv.indexOf('--cell');
    const cell = cellAt >= 0 ? parseInt(argv[cellAt + 1], 10) : 7;
    const rest = argv.filter((a, i) => a !== '--cell' && !(cellAt >= 0 && i === cellAt + 1));
    const rel = (p) => path.relative(ROOT, p);

    if (rest[0] === '--all') {
        for (const [name, text] of Object.entries(NAMED)) console.log(rel(write(text, path.join(OUT_DIR, `${name}.svg`), cell)));
        return;
    }
    if (rest[0] === '--version') {
        if (!rest[1]) throw new Error('--version needs a version');
        console.log(rel(write(rest[1], versionFile(rest[1]), cell)));
        return;
    }
    if (!rest[0]) {
        console.error('usage: gen-headers.js --all | --version X.Y.Z | "TEXT" [OUT.svg] [--cell N]');
        process.exit(2);
    }
    console.log(rel(write(rest[0], rest[1] ? path.resolve(rest[1]) : path.join(OUT_DIR, `${slug(rest[0])}.svg`), cell)));
}

module.exports = { NAMED, render, write, versionFile };

if (require.main === module) {
    try {
        main(process.argv.slice(2));
    } catch (e) {
        console.error(`gen-headers: ${e.message}`);
        process.exit(1);
    }
}
