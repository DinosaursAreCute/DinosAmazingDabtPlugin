#!/usr/bin/env bash
# install.sh - test, build, package and install the extension into an editor.
#
#   scripts/install.sh [--editor CMD] [--skip-tests] [--no-install]
#
#   --editor CMD   editor CLI to install into (code, codium, cursor, ...). Default: first found of
#                  code, codium, code-insiders, cursor, windsurf; $DABT_EDITOR overrides the search.
#   --skip-tests   skip `npm test` and the typecheck
#   --no-install   build the .vsix only
# The .vsix lands in the repo root as dabt-tools-VERSION.vsix; an installed copy is replaced (--force).
set -euo pipefail
cd "$(dirname "$0")/.."

editor="${DABT_EDITOR:-}"
run_tests=1
do_install=1
while (($#)); do
	case "$1" in
	--editor)
		[[ $# -ge 2 ]] || {
			echo "install.sh: --editor needs a value" >&2
			exit 2
		}
		editor="$2"
		shift
		;;
	--skip-tests) run_tests=0 ;;
	--no-install) do_install=0 ;;
	-h | --help)
		sed -n '2,10p' "$0" | sed 's/^# \{0,1\}//'
		exit 0
		;;
	*)
		echo "install.sh: unknown option '$1' (try --help)" >&2
		exit 2
		;;
	esac
	shift
done

step() { printf '\n==> %s\n' "$*"; }

command -v npm >/dev/null || {
	echo "install.sh: npm not found" >&2
	exit 1
}
[[ -d node_modules ]] || {
	step "npm ci"
	npm ci
}

if ((run_tests)); then
	step "typecheck"
	npm run --silent typecheck
	step "tests"
	npm test --silent
fi

# vsce runs the `vscode:prepublish` script, which makes the minified production build.
step "package"
version="$(sed -n 's/^  "version": "\([^"]*\)".*/\1/p' package.json | head -n1)"
vsix="dabt-tools-${version}.vsix"
rm -f -- "$vsix"
npx --no-install vsce package --no-rewrite-relative-links --out "$vsix"
[[ -f "$vsix" ]] || {
	echo "install.sh: $vsix was not produced" >&2
	exit 1
}
echo "built $vsix"

((do_install)) || exit 0

if [[ -z "$editor" ]]; then
	for candidate in code codium code-insiders cursor windsurf; do
		if command -v "$candidate" >/dev/null; then
			editor="$candidate"
			break
		fi
	done
fi
if [[ -z "$editor" ]] || ! command -v "$editor" >/dev/null; then
	echo "install.sh: no editor CLI found${editor:+ (tried '$editor')}; install $vsix by hand or pass --editor CMD" >&2
	exit 1
fi

step "install into $editor"
"$editor" --install-extension "$vsix" --force
echo "installed dabt-tools ${version}; reload the editor window to pick it up"
