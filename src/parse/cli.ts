// Regenerates the bundled offline-fallback snapshots (src/data/dabtApi.json,
// src/data/dabtXsd.json) from a real DABT checkout, using the exact same
// parseDabtApi/parseDabtXsd functions the extension uses to live-scan a
// user's DABT install at runtime (src/apiSource.ts) - one parser, two
// call sites, nothing to keep in sync by hand.
//
// Not run directly (this is TypeScript); invoked via `npm run gen-data`,
// which bundles this file with esbuild and executes it. See scripts/gen-data.js.
import * as fs from 'fs';
import * as path from 'path';
import { parseDabtApi } from './parseDabtApi';
import { parseDabtXsd } from './parseDabtXsd';

const srcRoot = process.argv[2];
if (!srcRoot || !fs.existsSync(srcRoot)) {
    console.error('Usage: npm run gen-data -- /path/to/DinosAmazingBashTui');
    process.exit(1);
}

// Not __dirname: this file gets bundled to a single temp file elsewhere
// before running (see scripts/gen-data.js), so __dirname wouldn't point at
// the extension repo any more. Resolve against the invoking process's CWD
// instead (npm scripts always run with CWD = the package root).
const dataDir = path.join(process.cwd(), 'src', 'data');
fs.mkdirSync(dataDir, { recursive: true });

const api = parseDabtApi(srcRoot);
fs.writeFileSync(path.join(dataDir, 'dabtApi.json'), JSON.stringify(api, null, 2) + '\n');
console.log(
    `Wrote ${api.functionCount} functions (${api.publicCount} public / ${api.privateCount} private) to src/data/dabtApi.json`
);

const xsd = parseDabtXsd(srcRoot);
if (xsd) {
    fs.writeFileSync(path.join(dataDir, 'dabtXsd.json'), JSON.stringify(xsd, null, 2) + '\n');
    const attrCount = xsd.elements.reduce((n, e) => n + e.attributes.length, 0);
    console.log(`Wrote ${xsd.elements.length} elements (${attrCount} attributes) to src/data/dabtXsd.json`);
} else {
    console.warn('share/tui.xsd not found under srcRoot - skipped dabtXsd.json');
}
