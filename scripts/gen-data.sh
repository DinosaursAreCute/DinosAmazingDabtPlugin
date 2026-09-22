#!/usr/bin/env bash
# gen-data.sh - refresh the bundled fallback snapshot from a DABT checkout.
# Usage: scripts/gen-data.sh /path/to/DinosAmazingBashTui
set -eu
cd "$(dirname "$0")/.."
node scripts/gen-data.js "$@"
