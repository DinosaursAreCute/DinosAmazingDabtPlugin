#!/usr/bin/env node
// Bundles+runs src/parse/cli.ts, which regenerates src/data/dabtApi.json
// and src/data/dabtXsd.json from a real DABT checkout. TS can't run
// directly under plain `node`, and this way there's exactly one parser
// (src/parse/*.ts) shared with the runtime live-scanner - see
// src/apiSource.ts and the comment at the top of src/parse/cli.ts.
//
// Usage: npm run gen-data -- /path/to/DinosAmazingBashTui

const esbuild = require('esbuild');
const fs = require('fs');
const os = require('os');
const path = require('path');

const outfile = path.join(os.tmpdir(), `dabt-gen-data-${process.pid}.js`);

esbuild.buildSync({
    entryPoints: [path.join(__dirname, '..', 'src', 'parse', 'cli.ts')],
    bundle: true,
    platform: 'node',
    format: 'cjs',
    outfile,
});

try {
    // cli.ts reads process.argv itself (argv[2] = the DABT root path), so
    // just requiring the bundle runs it with this process's real argv.
    require(outfile);
} finally {
    fs.unlinkSync(outfile);
}
