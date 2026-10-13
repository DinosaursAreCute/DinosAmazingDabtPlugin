// Runs the framework's own markup validator (lib/markup/tui_validate.sh) on a page and
// returns its findings, so the editor shows exactly what `dabt` would report at start-up.
// Needs a DABT install (see apiSource.ts); returns undefined without one or on failure.
import { execFile } from 'child_process';

export interface ValidatorFinding {
    severity: 'error' | 'warning';
    file: string;
    line: number; // 1-based
    col: number; // 1-based
    message: string;
}

// One line per finding: severity, file, line, col, message (tab separated). Findings from
// included files carry that file's path.
const SCRIPT = `
source "$1/lib/tui.sh" >/dev/null 2>&1 || exit 3
tui.validate.files "$2" >/dev/null 2>&1
i=0
for m in "\${_TV_F_MSG[@]}"; do
	IFS='|' read -r f l c <<<"\${_TV_F_LOC[i]}"
	printf '%s\\t%s\\t%s\\t%s\\t%s\\n' "\${_TV_F_SEV[i]}" "$f" "$l" "$c" "$m"
	i=$((i+1))
done
exit 0
`;

export function parseValidatorOutput(output: string): ValidatorFinding[] {
    const out: ValidatorFinding[] = [];
    for (const line of output.split('\n')) {
        const [severity, file, l, c, ...rest] = line.split('\t');
        if ((severity !== 'error' && severity !== 'warning') || !file || !rest.length) continue;
        out.push({ severity, file, line: Number(l) || 1, col: Number(c) || 1, message: rest.join('\t') });
    }
    return out;
}

export function runValidator(installRoot: string, pagePath: string): Promise<ValidatorFinding[] | undefined> {
    return new Promise((resolve) => {
        execFile('bash', ['-c', SCRIPT, '_', installRoot, pagePath], { timeout: 15000 }, (err, stdout) => {
            // Findings are not a failure: the script prints them and exits 0.
            resolve(err ? undefined : parseValidatorOutput(stdout));
        });
    });
}
