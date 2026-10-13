// Bundles every test/*.test.ts with esbuild (the editor API is not needed: the units under
// test are pure) and runs the result with node's test runner.
const esbuild = require('esbuild');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');

const root = path.join(__dirname, '..');
const testDir = path.join(root, 'test');
const entries = fs.readdirSync(testDir).filter((f) => f.endsWith('.test.ts')).map((f) => path.join(testDir, f));
const out = fs.mkdtempSync(path.join(os.tmpdir(), 'dabt-tools-test-'));

esbuild.buildSync({
    entryPoints: entries,
    bundle: true,
    platform: 'node',
    format: 'cjs',
    outdir: out,
    loader: { '.json': 'json' },
    logLevel: 'warning',
});
const files = fs.readdirSync(out).filter((f) => f.endsWith('.js')).map((f) => path.join(out, f));
const result = spawnSync(process.execPath, ['--test', ...files], { stdio: 'inherit' });
fs.rmSync(out, { recursive: true, force: true });
process.exit(result.status ?? 1);
