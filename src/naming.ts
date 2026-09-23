// Recognized private-name shapes, per the invariant in DABT's 
// "_tui.*/_exec_*/_tr_*/leading-underscore fns are private - never call
// from config/callback code". Shared by the live parser, the bundled-data
// generator and the runtime lint/completion providers so there's exactly
// one definition to keep in sync with DABT itself.
const PRIVATE_PREFIXES = [/^_/, /^_tui\./, /^_tui_/, /^_exec_/, /^_tr_/];

export function isPrivateName(name: string): boolean {
    return PRIVATE_PREFIXES.some((re) => re.test(name));
}
