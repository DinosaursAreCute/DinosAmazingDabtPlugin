// Scans a DABT (DinosAmazingBashTui) source tree for every function it
// defines, with doc text and (where derivable) structured parameter names.
// Single source of truth for this - used both to live-scan an actual DABT
// install at extension runtime (src/apiSource.ts) and to regenerate the
// bundled offline fallback snapshot (src/data/dabtApi.json, via
// src/parse/cli.ts). See DabtFunction in ../types.ts for the output shape.
import * as fs from 'fs';
import * as path from 'path';
import { isPrivateName } from '../naming';
import { DabtApiData, DabtFunction, DabtParam } from '../types';

function listShFiles(dir: string, out: string[]) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        if (entry.name === 'legacy' || entry.name.startsWith('.')) continue;
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) listShFiles(full, out);
        else if (entry.name.endsWith('.sh')) out.push(full);
    }
}

// function name = dotted/underscored bash identifier, e.g. tui.ansi, _tui._split, tui.class.ansi
const FUNC_DEF_RE = /^([A-Za-z_][A-Za-z0-9_.]*)\s*\(\)\s*\{/;
const NAME_TOKEN_RE = /^[A-Za-z_][A-Za-z0-9_.]*$/;

interface ParsedSigLine {
    name: string;
    sig: string;
    doc: string;
}

// DABT doc-comment convention (two shapes, both used throughout lib/*.sh):
//   "#  tui.ansi ID [STATE]        prints the ANSI prefix..."   (header table, 2+ space gap)
//   "# _tui_api._build FG BG MODS - emits ANSI prefix..."       (inline, " - " gap)
// Both are "NAME ARG1 [ARG2] ...<gap>description". Splits on whichever gap
// (space-run or " - ") comes first, so callers get a structured {name, sig, doc}
// instead of a free-text blob - this is what powers inlay hints/signature help.
function parseSigLine(body: string): ParsedSigLine | null {
    const gapSpace = /\s{2,}/.exec(body);
    const gapDashIdx = body.indexOf(' - ');
    let cutIdx = -1;
    let sepLen = 0;
    if (gapSpace && (gapDashIdx === -1 || gapSpace.index <= gapDashIdx)) {
        cutIdx = gapSpace.index;
        sepLen = gapSpace[0].length;
    } else if (gapDashIdx !== -1) {
        cutIdx = gapDashIdx;
        sepLen = 3;
    }
    if (cutIdx === -1) return null;
    const left = body.slice(0, cutIdx).trim();
    const doc = body.slice(cutIdx + sepLen).trim();
    if (!left || !doc) return null;
    const name = left.split(/\s+/, 1)[0];
    if (!NAME_TOKEN_RE.test(name)) return null;
    return { name, sig: left, doc };
}

function parseHeaderTableLine(line: string): ParsedSigLine | null {
    const m = /^#\s{1,4}(.+)$/.exec(line);
    if (!m) return null;
    return parseSigLine(m[1]);
}

// "tui.ansi ID [STATE]" -> [{name:"ID", optional:false}, {name:"STATE", optional:true}]
// Stops at a literal "|" token (some doc lines document several sibling forms
// on one line, e.g. "tui.every.cancel ID | .pause ID | ...") since only the
// first alternative belongs to THIS function's own signature.
function parseParams(sig: string | undefined, fnName: string): DabtParam[] | undefined {
    if (!sig) return undefined;
    const tokens = sig.split(/\s+/);
    if (tokens[0] !== fnName) return undefined;
    const params: DabtParam[] = [];
    for (const tok of tokens.slice(1)) {
        if (tok === '|') break;
        const optional = tok.startsWith('[') && tok.endsWith(']');
        const name = optional ? tok.slice(1, -1) : tok;
        if (!/^[A-Za-z][A-Za-z0-9_.]*(\.\.\.)?$/.test(name)) break;
        params.push({ name, optional });
    }
    return params.length ? params : undefined;
}

// Extracts a function's body text (everything between its opening `{` and
// the matching closing `}`) by brace-depth counting from the def line
// onward. Good enough for param inference below even though it doesn't
// account for braces inside quoted strings - those come from `${...}`
// parameter expansions, which are themselves balanced pairs, so they never
// throw the depth count off net-zero.
function extractFunctionBody(lines: string[], defLineIndex: number, defMatchEnd: number): string {
    const bodyLines = [lines[defLineIndex].slice(defMatchEnd)];
    let depth = 1;
    for (const ch of bodyLines[0]) {
        if (ch === '{') depth++;
        else if (ch === '}') depth--;
    }
    let i = defLineIndex + 1;
    const cap = defLineIndex + 400;
    while (depth > 0 && i < lines.length && i < cap) {
        const line = lines[i];
        for (const ch of line) {
            if (ch === '{') depth++;
            else if (ch === '}') depth--;
            if (depth <= 0) break;
        }
        bodyLines.push(line);
        i++;
    }
    return bodyLines.join('\n');
}

// Infers positional params directly from a function's own body when no
// documented signature exists - DABT's dominant style captures them as
// `local name="$1" other="$2"` (or "${1:-default}", or bare `$1`) near the
// top. This is ground truth (it's literally how the function reads its
// arguments), not a guess about intent, which is what makes it safe to
// trust for editor tooling even without a human-written doc comment.
const LOCAL_CAPTURE_RE =
    /\b([A-Za-z_][A-Za-z0-9_]*)=(?:"\$\{?(\d{1,2})(:[-+][^}"]*)?\}?"|\$\{?(\d{1,2})(:[-+][^}]*)?\}?)/g;
const BARE_ARG_RE = /\$\{?(\d{1,2})(:[-+][^}]*)?\}?/g;

function inferParams(body: string): DabtParam[] | undefined {
    const named = new Map<number, DabtParam>();
    // Only look at the first ~10 non-blank lines: DABT's own style captures
    // params up top; matches found deeper in the body are far more likely to
    // be unrelated local reassignments or calls into a helper that also
    // happens to use $1/$2 (its OWN params, not this function's).
    const topLines = body
        .split('\n')
        .filter((l) => l.trim())
        .slice(0, 10)
        .join('\n');

    for (const m of topLines.matchAll(LOCAL_CAPTURE_RE)) {
        const [, varName, idxA, defA, idxB, defB] = m;
        const idx = Number(idxA ?? idxB);
        if (!idx || idx > 9) continue;
        if (named.has(idx)) continue; // first capture wins
        named.set(idx, { name: varName.toUpperCase(), optional: !!(defA ?? defB) });
    }

    // Fill any gap up to the highest index actually referenced anywhere in
    // the body (not just the top) with a generic name, so e.g. a function
    // using $1 and $3 but not naming $2 still gets 3 hint slots in order.
    let maxIdx = 0;
    for (const m of body.matchAll(BARE_ARG_RE)) {
        const idx = Number(m[1]);
        if (idx && idx <= 9) maxIdx = Math.max(maxIdx, idx);
    }
    for (const idx of named.keys()) maxIdx = Math.max(maxIdx, idx);
    if (maxIdx === 0) return undefined;

    const params: DabtParam[] = [];
    for (let idx = 1; idx <= maxIdx; idx++) {
        params.push(named.get(idx) ?? { name: `ARG${idx}`, optional: false });
    }
    return params;
}

export function parseDabtApi(srcRoot: string): DabtApiData {
    const targets = [path.join(srcRoot, 'lib'), path.join(srcRoot, 'share', 'plugins')].filter(fs.existsSync);

    const files: string[] = [];
    for (const t of targets) listShFiles(t, files);

    const functions = new Map<string, DabtFunction>();

    for (const file of files) {
        const rel = path.relative(srcRoot, file);
        const text = fs.readFileSync(file, 'utf8');
        const lines = text.split('\n');

        // Pass 1: header doc tables (comment block before first non-comment/blank-separated code)
        // Lines like "#  tui.ansi ID [STATE]   prints the ANSI prefix..."
        const headerDocs = new Map<string, string>();
        const headerSigs = new Map<string, string>();
        for (let i = 0; i < Math.min(lines.length, 200); i++) {
            const parsed = parseHeaderTableLine(lines[i]);
            if (!parsed) continue;
            headerDocs.set(parsed.name, parsed.doc);
            headerSigs.set(parsed.name, parsed.sig);
        }

        for (let i = 0; i < lines.length; i++) {
            const m = FUNC_DEF_RE.exec(lines[i]);
            if (!m) continue;
            const name = m[1];

            // Pass 2: immediate preceding comment block as doc (skip blank lines directly above)
            let j = i - 1;
            const docLines: string[] = [];
            while (j >= 0 && /^\s*#/.test(lines[j])) {
                docLines.unshift(lines[j].replace(/^\s*#\s?/, ''));
                j--;
            }
            const headerDoc = headerDocs.get(name) || '';

            // Prefer a signature from the header table; fall back to parsing the
            // comment line directly above the function (the "NAME ARGS - desc"
            // convention, e.g. `_tui_api._build FG BG MODS - emits ANSI prefix...`).
            const lastLineParsed = docLines.length ? parseSigLine(docLines[docLines.length - 1]) : null;
            const lastLineIsOwnSig = !!lastLineParsed && lastLineParsed.name === name;

            let sig = headerSigs.get(name);
            if (!sig && lastLineIsOwnSig) sig = lastLineParsed!.sig;
            let params = parseParams(sig, name);
            let paramsSource: 'doc' | 'inferred' | undefined = params ? 'doc' : undefined;

            // No documented signature: infer positional params straight from how
            // the function's own body reads its arguments.
            if (!params) {
                const body = extractFunctionBody(lines, i, m[0].length);
                const inferred = inferParams(body);
                if (inferred) {
                    params = inferred;
                    paramsSource = 'inferred';
                    if (!sig) sig = [name, ...inferred.map((p) => p.name)].join(' ');
                }
            }

            // Strip the "NAME ARGS - " prefix back out of the displayed doc text
            // when it was parsed as a signature above - it's already shown as the
            // code block, showing it again as prose is just noise.
            const inlineDoc = lastLineIsOwnSig
                ? [...docLines.slice(0, -1), lastLineParsed!.doc].join(' ').trim()
                : docLines.join(' ').trim();

            if (functions.has(name)) continue; // first definition wins (avoid dup from re-sourced files)

            functions.set(name, {
                name,
                file: rel,
                line: i + 1,
                private: isPrivateName(name),
                doc: inlineDoc || headerDoc || '',
                headerDoc: headerDoc && headerDoc !== inlineDoc ? headerDoc : undefined,
                sig,
                params,
                paramsSource,
            });
        }
    }

    const list = Array.from(functions.values()).sort((a, b) => a.name.localeCompare(b.name));
    const versionFile = path.join(srcRoot, 'VERSION');

    return {
        generatedAt: new Date().toISOString(),
        sourceVersion: fs.existsSync(versionFile) ? fs.readFileSync(versionFile, 'utf8').trim() : null,
        functionCount: list.length,
        publicCount: list.filter((f) => !f.private).length,
        privateCount: list.filter((f) => f.private).length,
        functions: list,
    };
}
