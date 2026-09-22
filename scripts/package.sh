#!/usr/bin/env bash
# package.sh - minified production build + .vsix, ready for `code --install-extension`.
# --no-rewrite-relative-links: vsce otherwise rewrites README image paths to
# raw.githubusercontent.com URLs on the `repository` field's repo, which
# doesn't exist there yet - that would leave every image broken. The bundled
# assets/ files are what actually renders for a local VSIX install.
set -eu
cd "$(dirname "$0")/.."
npx vsce package --no-rewrite-relative-links
