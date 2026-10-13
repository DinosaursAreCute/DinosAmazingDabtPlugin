// Renders themed release notes for one version from its CHANGELOG.md section.
//   node scripts/gen-release-notes.js VERSION [--tagline "text"] [--intro "text"] [--out FILE]
// Output defaults to release-notes/vVERSION.md. The theme (centred logo and title, section
// headers as images, "What is new" / "What changed" / "Fixed") follows the DABT release notes.
const fs = require('fs');
const path = require('path');
const headers = require('./gen-headers');

const root = path.join(__dirname, '..');
const args = process.argv.slice(2);
const version = args.find((a) => /^\d+\.\d+\.\d+/.test(a));
const option = (name) => {
    const i = args.indexOf(name);
    return i >= 0 ? args[i + 1] : undefined;
};
if (!version) {
    console.error('usage: gen-release-notes.js VERSION [--tagline TEXT] [--intro TEXT] [--out FILE]');
    process.exit(2);
}

const changelog = fs.readFileSync(path.join(root, 'CHANGELOG.md'), 'utf8');
const heading = new RegExp(`^## \\[${version.replace(/\./g, '\\.')}\\][^\\n]*\\n`, 'm').exec(changelog);
if (!heading) {
    console.error(`no "## [${version}]" section in CHANGELOG.md`);
    process.exit(1);
}
const rest = changelog.slice(heading.index + heading[0].length);
const section = rest.slice(0, rest.search(/^## \[/m) < 0 ? undefined : rest.search(/^## \[/m));
const date = /\] - (\d{4}-\d{2}-\d{2})/.exec(heading[0])?.[1] ?? '';

const parts = {};
for (const m of section.split(/^### /m).slice(1)) {
    const [title, ...body] = m.split('\n');
    parts[title.trim()] = body.join('\n').trim();
}

const HEADERS = 'https://raw.githubusercontent.com/DinosaursAreCute/DinosAmazingDabtPlugin/main/assets/headers';
const LOGO = 'https://raw.githubusercontent.com/DinosaursAreCute/DinosAmazingDabtPlugin/main/assets/logo.png';
// CHANGELOG heading -> header image name and its alt text, in the order they are written.
const THEME = [
    ['Added', 'release-new', 'What is new'],
    ['Changed', 'release-what-changed', 'What changed'],
    ['Fixed', 'release-fixed', 'Fixed'],
    ['Deprecated', 'release-deprecated', 'Deprecated'],
    ['Removed', 'release-removed', 'Removed'],
    ['Security', 'release-security', 'Security'],
];

for (const [name, text] of Object.entries(headers.NAMED)) {
    const file = path.join(root, 'assets', 'headers', `${name}.svg`);
    if (!fs.existsSync(file)) headers.write(text, file, 7);
}
const titleFile = headers.versionFile(version);
if (!fs.existsSync(titleFile)) headers.write(version, titleFile, 7);

const block = (file, label) =>
    `<h2><img src="${HEADERS}/${file}.svg" alt="${label}" height="35"></h2>\n`;

const out = [];
out.push(`<div align="center">\n<img src="${LOGO}" alt="DABT Tools" width="160">\n`);
out.push(
    `<h1><img src="${HEADERS}/${path.basename(titleFile)}" alt="DABT Tools ${version}" height="60"></h1>\n`
);
if (option('--tagline')) out.push(`<h3><em>${option('--tagline')}</em></h3>\n`);
out.push(`${date ? `<sub>${date}</sub>\n` : ''}</div>\n`);
if (option('--intro')) out.push(`${option('--intro')}\n`);
for (const [key, file, label] of THEME) {
    if (parts[key]) out.push(block(file, label), `${parts[key]}\n`);
}
out.push(
    block('release-install', 'Install'),
    `\`\`\`bash\ncode --install-extension dabt-tools-${version}.vsix\n\`\`\`\n`
);

const target = option('--out') ?? path.join(root, 'release-notes', `v${version}.md`);
fs.mkdirSync(path.dirname(target), { recursive: true });
fs.writeFileSync(target, out.join('\n'));
console.log(path.relative(root, target));
