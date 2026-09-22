#!/usr/bin/env bash
# build.sh - compile the extension (dev build, with source maps).
set -eu
cd "$(dirname "$0")/.."
npm run compile
