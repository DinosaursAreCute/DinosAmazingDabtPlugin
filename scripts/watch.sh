#!/usr/bin/env bash
# watch.sh - rebuild on every save. Pair with F5 (Run DABT Tools Extension).
set -eu
cd "$(dirname "$0")/.."
npm run watch
