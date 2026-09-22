import * as vscode from 'vscode';
import { resolveColorToVscodeColor } from './dabtColors';
import { isDabtXmlDocument } from './xmlHeuristics';
import { findClassRefMatches } from './xmlClassRefs';

// Native VS Code color swatches (the normal clickable/editable CSS-style
// reference, not a custom decoration) on class="name" - one for fg, one for
// bg, both anchored on the class name so a class that sets both shows two
// stacked swatches instead of one merged/ambiguous color. Which is which is
// disambiguated by the fg/bg inlay hints (xmlClassInlayHints.ts) right next
// to it.
export class DabtXmlClassColorProvider implements vscode.DocumentColorProvider {
    provideDocumentColors(document: vscode.TextDocument): vscode.ColorInformation[] {
        if (!isDabtXmlDocument(document)) return [];

        const out: vscode.ColorInformation[] = [];
        for (const ref of findClassRefMatches(document)) {
            const range = new vscode.Range(document.positionAt(ref.valueStart), document.positionAt(ref.valueEnd));
            const bg = ref.rule.bg && resolveColorToVscodeColor(ref.rule.bg);
            const fg = ref.rule.fg && resolveColorToVscodeColor(ref.rule.fg);
            if (bg) out.push(new vscode.ColorInformation(range, bg));
            if (fg) out.push(new vscode.ColorInformation(range, fg));
        }
        return out;
    }

    provideColorPresentations(
        _color: vscode.Color,
        context: { document: vscode.TextDocument; range: vscode.Range }
    ): vscode.ColorPresentation[] {
        // class="..." names a theme class, not a raw color literal - there's
        // no in-place edit that stays valid XML, so picking a color just
        // keeps the class name as-is (same as VS Code shows for other
        // "referenced, not literal" colors). To actually change the color,
        // edit the fg:/bg: line in theme.css itself, where it's a normal,
        // fully editable CSS color value.
        return [new vscode.ColorPresentation(context.document.getText(context.range))];
    }
}
