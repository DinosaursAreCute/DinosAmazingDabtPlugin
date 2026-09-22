import * as vscode from 'vscode';
import { isDabtXmlDocument } from './xmlHeuristics';
import { findClassRefMatches } from './xmlClassRefs';

// fg/bg/mod labels right after class="name", same idea and style as the
// bash argument-name inlay hints (dabt.inlayHints.enable governs both):
// plain themed text, not a custom-colored badge. The color swatches
// themselves come from the native DocumentColorProvider (xmlClassColor.ts)
// right before the class name; these hints just say which swatch is which,
// since a class commonly sets both.
export class DabtXmlClassInlayHintsProvider implements vscode.InlayHintsProvider {
    private emitter = new vscode.EventEmitter<void>();
    onDidChangeInlayHints = this.emitter.event;

    refresh() {
        this.emitter.fire();
    }

    provideInlayHints(document: vscode.TextDocument, range: vscode.Range): vscode.InlayHint[] {
        if (!isDabtXmlDocument(document)) return [];
        if (!vscode.workspace.getConfiguration('dabt').get<boolean>('inlayHints.enable', true)) return [];

        const hints: vscode.InlayHint[] = [];
        for (const ref of findClassRefMatches(document)) {
            const pos = document.positionAt(ref.valueEnd);
            if (pos.line < range.start.line || pos.line > range.end.line) continue;

            const parts: vscode.InlayHintLabelPart[] = [];
            if (ref.rule.fg) parts.push(new vscode.InlayHintLabelPart(' fg'), labelValue(ref.rule.fg));
            if (ref.rule.bg) parts.push(new vscode.InlayHintLabelPart(' bg'), labelValue(ref.rule.bg));
            if (ref.rule.mods) parts.push(new vscode.InlayHintLabelPart(' mod'), labelValue(ref.rule.mods));
            if (parts.length === 0) continue;

            const hint = new vscode.InlayHint(pos, parts, vscode.InlayHintKind.Type);
            hint.paddingLeft = true;
            hints.push(hint);
        }
        return hints;
    }
}

function labelValue(value: string): vscode.InlayHintLabelPart {
    const part = new vscode.InlayHintLabelPart(`:${value}`);
    return part;
}
