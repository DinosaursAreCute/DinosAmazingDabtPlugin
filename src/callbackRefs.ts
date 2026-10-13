// The markup-to-script links of one DABT page: which script files it loads and which
// function each callback attribute names. Pure (the caller supplies file existence).
import * as path from 'path';
import { scanXml } from './xmlScan';

export interface CallbackRef {
    fn: string;
    start: number; // offsets of the attribute value
    end: number;
}

export interface PageLinks {
    scripts: string[]; // absolute paths of the <script src> files that exist
    refs: CallbackRef[];
}

export function pageLinks(
    text: string,
    pageDir: string,
    callbackAttrs: ReadonlySet<string>,
    fileExists: (absPath: string) => boolean
): PageLinks {
    const scripts: string[] = [];
    const refs: CallbackRef[] = [];
    for (const el of scanXml(text)) {
        for (const attr of el.attrs) {
            if (el.name === 'script' && attr.name === 'src') {
                const abs = path.resolve(pageDir, attr.value);
                if (fileExists(abs)) scripts.push(abs);
            } else if (callbackAttrs.has(attr.name) && attr.value && !attr.value.includes('{{')) {
                refs.push({ fn: attr.value.trim().split(/\s+/)[0], start: attr.valueStart, end: attr.valueEnd });
            }
        }
    }
    return { scripts, refs };
}
