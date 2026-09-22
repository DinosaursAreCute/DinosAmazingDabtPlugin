import * as vscode from 'vscode';
import bundled from './data/dabtApi.json';
import { DabtApiData, DabtFunction } from './types';

export type { DabtParam, DabtFunction } from './types';
export { isPrivateName } from './naming';

const bundledData = bundled as DabtApiData;

class ApiIndex {
    private byName = new Map<string, DabtFunction>();
    private meta_: { generatedAt: string; sourceVersion: string | null; functionCount: number };

    constructor(data: DabtApiData) {
        this.meta_ = { generatedAt: '', sourceVersion: null, functionCount: 0 };
        this.load(data);
    }

    load(data: DabtApiData) {
        this.byName.clear();
        for (const f of data.functions) this.byName.set(f.name, f);
        this.meta_ = {
            generatedAt: data.generatedAt,
            sourceVersion: data.sourceVersion,
            functionCount: this.byName.size,
        };
    }

    get(name: string): DabtFunction | undefined {
        return this.byName.get(name);
    }

    has(name: string): boolean {
        return this.byName.has(name);
    }

    all(): DabtFunction[] {
        return Array.from(this.byName.values());
    }

    public_(): DabtFunction[] {
        return this.all().filter((f) => !f.private);
    }

    get meta() {
        return this.meta_;
    }
}

export const apiIndex = new ApiIndex(bundledData);

export function docString(fn: DabtFunction): vscode.MarkdownString {
    const md = new vscode.MarkdownString();
    md.appendCodeblock(fn.sig ?? `${fn.name} ...`, 'bash');
    if (fn.paramsSource === 'inferred') {
        md.appendMarkdown(
            '_argument names inferred from the function body (no doc comment) - positions are reliable, names beyond `local x="$N"` captures may be generic (`ARGn`)._\n\n'
        );
    }
    if (fn.doc) md.appendMarkdown(fn.doc + '\n\n');
    md.appendMarkdown(
        `${fn.private ? '⚠️ **private DABT internal** — do not call from app/callback code. ' : ''}` +
            `Defined in \`${fn.file}:${fn.line}\`.`
    );
    return md;
}
