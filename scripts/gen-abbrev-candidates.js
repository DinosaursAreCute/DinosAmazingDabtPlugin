#!/usr/bin/env node
// Scans a real DABT checkout for `_`-separated ALL-CAPS segments used in
// internal identifier names (`_DLG_KIND` -> DLG, KIND) and reports which
// ones aren't yet defined in src/data/dabtAbbreviations.json.
//
// This is the automatic half of maintaining the abbreviations glossary: it
// finds candidates, it does not guess what they mean. Meanings need someone
// who's actually read the code - fill them in by hand (or ask an assistant
// to, pointed at this output) and re-run to confirm the list is clean.
//
// Usage: node scripts/gen-abbrev-candidates.js /path/to/DinosAmazingBashTui [--min-count=N]

const fs = require('fs');
const path = require('path');

const root = process.argv[2];
if (!root) {
    console.error('Usage: node scripts/gen-abbrev-candidates.js /path/to/DinosAmazingBashTui [--min-count=N]');
    process.exit(1);
}
const minCountArg = process.argv.find((a) => a.startsWith('--min-count='));
const minCount = minCountArg ? parseInt(minCountArg.split('=')[1], 10) : 2;

const glossaryPath = path.join(__dirname, '..', 'src', 'data', 'dabtAbbreviations.json');
const glossary = JSON.parse(fs.readFileSync(glossaryPath, 'utf8'));
const known = new Set(glossary.entries.map((e) => e.abbr));

// Segments that are plain, self-explanatory English words - never worth a
// glossary entry even when undocumented. Extend this list rather than the
// JSON when a new candidate turns out to just be a normal word.
const SKIP = new Set(
    (
        'ERROR FONT BANNER DIR UPDATE PANE SYNC KEY ID UI HOME CFG APP MARKUP DEPS RESULT ' +
        'EVENT ROOT SEL ROWS CONFIG VERSION BIND MANIFEST FOCUS SIGN CMD ROW SCAN TYPE FILE ' +
        'TITLE ON LAST CONTENT TOP STYLE NOTES VALUE SRC META COUNT VERIFY BG FG COLS PAGE ' +
        'DEF COL NAME PENDING FACTORY CLASS IDS KIND CACHE INPUT FN WIDGET TMP SOURCE RUNNING ' +
        'BUF DESC PLUGIN ORDER MOD LABEL ITEMS GRID THEME ALL TABS SYS CONF BOX STAMP PACK LOG ' +
        'WORK ACTION SOFF MODAL TAB REQ PROGRESS NEED BUILD TIMEOUT PID INSTALL FOOTER GEN ' +
        'FOCUSABLE BTN TOTAL TICK CLICK TAG RENDER GROUP HIGH MODE DEFAULTS CHILDREN ALLOW URL ' +
        'SEQ MAX BORDER ATTR ALIGN WARN SUBMIT OVERLAY MISSING LIST HOVERED DEFAULT CURSOR ' +
        'STATE SHA REMOVE MS WRAPPED SEEN MSG ERR ENTRIES ALWAYS WIDTH SCROLL REPORT PKG OUT ' +
        'OFF MINW EXT ADD YES STATUS KEYS COLORS QUIET LATEST FIFO CUR BODY REPO NOW HOOK HIT ' +
        'FD CLIPBOARD VPAD TXT TRUST TEXT SHIFT POLICY PLAN PASTE LEAVES IN HPAD ESC CONFLICT ' +
        'VALIGN TOAST STAGE SIG PLUGINS MINH MAXW LINES KEYFILE IDX HISTORY FNS DRY DANGER ' +
        'CUSTOM CTL CSV BY BASE WEIGHTS VAL TOKEN TAR SUSPENDED SUDO REQUIRE NEXT MOUSE ENTRY ' +
        'EFFECTIVE DIRS DIALOG DECISION CHANNEL CHANGELOG UNSIGNED THEMES REPEAT NUMBER ' +
        'LISTENERS INSTANCES DRAG DIM CURRENT CPU AUTHOR VERSIONS UNMET STRICT RETAIN READ NO ' +
        'MEM DRAIN CANCEL BRANCH BACKUP YELLOW WRAP USER UPTIME TS SAME PROBLEMS ORPHAN NOTE ' +
        'KEEP FULL FLUSH FIT EXP EXIT COMMIT BUTTON ASSETS ACTIVE WHEN VERBOSE TOML TMPDIR ' +
        'STICKY ROWSPAN RESIZED RECORDING ORIGIN ONLY MAXH LOADED INT INC HASH GREEN GIT ' +
        'BRIGHT WHITE UNKNOWN STR STEP SCORE RESET RED PROVIDERS PROVIDER PRE PAUSED PATH ' +
        'PAGES OUTPUT OPT NEWLINE HINT HEADER FOLLOW FIXED DEP CHANGE CANON ARGS WINDOW ' +
        'VALIDATE TRACKING TERMINAL SWITCHES STEPS SPAN SIGNED SELF PERF PALETTE NAMESPACE ' +
        'NAMED MEMO HIST EXTERNAL DYN DEST DEPTH COUNTER COMPUTED COLOR COLLISIONS AVAIL ASK ' +
        'ARCHIVE API ACTIONS TARGET SWAP STAT SERVICE SECONDS RESIZE REF PROGRAM POSITION ' +
        'OVERWRITE ONCE OK MAGIC LOAD HDR GOING GITHUB FREED FIELDS COMPACT CLEAN BACK ' +
        'WARNING USED TREE SUCCESS STYLED STRATEGY SPIN SEMVER SCANNED SAVED RULES REQUIRED ' +
        'READY PROFILE PREFIX OLD NOTIFY LINE INSTALLED INITED INFO IDLE FINGERPRINT DRAW ' +
        'DONE DATA CLASSES BYTE'
    ).split(/\s+/)
);

const files = [];
(function walk(dir) {
    let entries;
    try {
        entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
        return;
    }
    for (const e of entries) {
        if (e.name === '.git' || e.name === 'node_modules') continue;
        const p = path.join(dir, e.name);
        if (e.isDirectory()) walk(p);
        else if (e.isFile() && e.name.endsWith('.sh')) files.push(p);
    }
})(root);

if (files.length === 0) {
    console.error(`No .sh files found under ${root} - is this a DABT checkout?`);
    process.exit(1);
}

const counts = new Map(); // segment -> { count, examples: Set<relFile> }
for (const file of files) {
    const rel = path.relative(root, file);
    const text = fs.readFileSync(file, 'utf8');
    for (const m of text.matchAll(/_[A-Z][A-Z0-9_]*/g)) {
        const segments = m[0].replace(/^_+/, '').split('_').filter(Boolean);
        for (const seg of segments) {
            if (!/^[A-Z][A-Z0-9]*$/.test(seg)) continue;
            if (!counts.has(seg)) counts.set(seg, { count: 0, examples: new Set() });
            const entry = counts.get(seg);
            entry.count++;
            if (entry.examples.size < 3) entry.examples.add(rel);
        }
    }
}

const candidates = [...counts.entries()]
    .filter(([seg, { count }]) => count >= minCount && !known.has(seg) && !SKIP.has(seg))
    .sort((a, b) => b[1].count - a[1].count);

if (candidates.length === 0) {
    console.log('No new abbreviation candidates - glossary is up to date with this checkout.');
    process.exit(0);
}

console.log(`${candidates.length} candidate abbreviation(s) not yet in src/data/dabtAbbreviations.json:\n`);
for (const [seg, { count, examples }] of candidates) {
    console.log(`  ${seg.padEnd(10)} x${count}\t${[...examples].join(', ')}`);
}
console.log(
    `\nAdd definitions for the real ones to src/data/dabtAbbreviations.json's "entries" array,` +
        ` or add plain-word ones to the SKIP list in this script.`
);
