# Building and packaging

## Setup

```bash
git clone https://github.com/DinosaursAreCute/DinosAmazingDabtPlugin.git && cd DinosAmazingDabtPlugin
npm install
./scripts/watch.sh
```

Then press `F5` in VS Code. Two launch configurations are included:

| Launch config | Opens |
|---|---|
| **Run DABT Tools Extension** | An Extension Development Host with an empty window. |
| **Run Extension in DinosAmazingBashTui** | The host opened directly on a sibling DABT checkout, with real pages, callbacks and `lib/` to test against. The data source resolves to *workspace folder* (live). |

`watch.sh` rebuilds on every save. Reload the host window (`Ctrl+R`) to pick up changes.

## Scripts

Small, single-purpose scripts, following the same idea as DABT's own `tools/`:

| Script | npm equivalent | Does |
|---|---|---|
| `scripts/build.sh` | `npm run compile` | Dev build to `dist/extension.js`, with source maps. |
| `scripts/watch.sh` | `npm run watch` | Rebuild on save. Pair with `F5`. |
| `scripts/package.sh` | `npx vsce package` | Minified build and `dabt-tools-<version>.vsix`, ready for `code --install-extension`. |
| `scripts/gen-data.sh DABT_DIR` | `npm run gen-data -- DABT_DIR` | Regenerate the bundled `src/data/dabtApi.json` + `dabtXsd.json` from a DABT checkout. |
| - | `npm run gen-abbrev-candidates -- DABT_DIR` | List abbreviation segments missing from the glossary. See [abbreviations.md](abbreviations.md). |

Type-check without building:

```bash
npx tsc --noEmit -p .
```

## Before a release

1. **Refresh the snapshot** against the latest DABT release, so people without DABT installed get current signatures:
   ```bash
   ./scripts/gen-data.sh ../DinosAmazingBashTui
   git diff --stat src/data/     # sourceVersion should be the new DABT VERSION
   ```
2. **Check the glossary**: `npm run gen-abbrev-candidates -- ../DinosAmazingBashTui` should list nothing new that matters.
3. Bump `version` in `package.json`, and move the `[Unreleased]` section in `CHANGELOG.md` under that version.
4. `./scripts/package.sh` and install the `.vsix` into a clean profile (`code --profile temp --install-extension ...`) to smoke-test.

`package.sh` passes `--no-rewrite-relative-links`. Otherwise `vsce` rewrites the README's image paths to GitHub URLs, and those break for a local install.

## This documentation site

The site you're reading is `docs/`, built with Jekyll and indexed with [Pagefind](https://pagefind.app/) by `.github/workflows/pages.yml` on every push to `master` that touches `docs/` or `package.json`. It shares its theme with the [D.A.B.T docs](https://dinosaursarecute.github.io/DinosAmazingBashTui/).

One-time setup: repository **Settings → Pages → Source → GitHub Actions**.

Local preview:

```bash
cd docs
bundle install
bundle exec jekyll serve --baseurl /DinosAmazingDabtPlugin
# -> http://127.0.0.1:4000/DinosAmazingDabtPlugin/
```

Search only works on the deployed site, because the Pagefind index is built in CI. The header version badge reads `docs/_data/version.yml`, which CI writes from `package.json`. Locally it shows `dev`.
