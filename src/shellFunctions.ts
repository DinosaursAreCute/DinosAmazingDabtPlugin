// Function definitions of a shell file: `name() {` or `function name {` at line start.
export interface FunctionDef {
    name: string;
    line: number;
}

const DEF_RE = /^(?:function\s+([A-Za-z_][\w.]*)(?:\s*\(\))?|([A-Za-z_][\w.]*)\s*\(\))\s*\{?/;

export function parseFunctionDefs(text: string): FunctionDef[] {
    const out: FunctionDef[] = [];
    const lines = text.split('\n');
    for (let i = 0; i < lines.length; i++) {
        const m = DEF_RE.exec(lines[i]);
        if (m) out.push({ name: m[1] ?? m[2], line: i });
    }
    return out;
}
