# Shell scripts

Everything on this page is active in any file VS Code treats as `shellscript` (`.sh`, `.bash`, files with a bash shebang). It doesn't depend on a file-name convention, so helpers, plugins and one-off scripts all get the same support as `*_callbacks.sh`.

## Completion

Type a DABT prefix (`tui.`, `_tui.`, `dabt.`...) or any two characters, and every matching function from the [API index](data-source.md) is offered:

| Shown as | Meaning |
|---|---|
| `tui.paint`  *DABT API* | Public API: safe to call from app and callback code. Sorted first. |
| `_tui._layout`  *private* | A private internal. Offered for people editing DABT's own `lib/`, but sorted last and labeled, so it isn't picked by accident. |

Each item's documentation panel shows the signature, the doc text and `file:line` where it's defined.

## Hover

Hover any known function to see the same card: signature, doc, definition site, and a **⚠ private DABT internal** warning where it applies. If the parameter names were [inferred](data-source.md#inferred-parameters) rather than documented, the card says so.

Hovering an internal identifier that isn't a function (a leading-underscore variable like `_DLG_KIND` or `_TXLK`) explains its abbreviation segments instead:

```
_DLG_KIND
DLG — Dialog — modal dialog/prompt/chooser/toast state  (lib/chrome/tui_dialog.sh)

_TXLK
TXLK — last edit kind (type/move/undo) — coalesces consecutive keystrokes into one undo step  (lib/widgets/tui_text.sh)
```

The name is split on `_`, and each segment that has a glossary entry is explained. Plain words (`KIND`) and segments nobody has documented yet are skipped. The meanings come from a hand-written glossary. See [development/abbreviations.md](../development/abbreviations.md). Turn this off with `dabt.abbreviations.enable`.

## Inlay hints

Bash gives no feedback on which positional argument is which. DABT Tools adds the parameter name before each one:

```bash
tui.paint ID:status TEXT:"saved"
tui.every SEC:0.5 FN:refresh_clock ID?:clock
```

- Optional parameters get a `?`.
- A variadic last parameter (`ARGS...`) labels every remaining argument.
- Redirects (`>file`, `2>&1`, `<<EOF`) and their targets are skipped, so they don't take a parameter slot.
- Several calls on one line (`a; b && c | d`) are handled separately.
- Hints for [inferred](data-source.md#inferred-parameters) names have a tooltip saying so.

Turn them off with `dabt.inlayHints.enable`, which also controls the `fg`/`bg`/`mod` hints in XML. VS Code's own `editor.inlayHints.enabled` (e.g. `offUnlessPressed`) applies on top of that.

## Signature help

While you type arguments to a DABT function, the parameter-info popup shows its signature with the **current parameter highlighted**. It opens on space or comma, and **Trigger Parameter Hints** (`Ctrl+Shift+Space`) reopens it. It stays open while the cursor is in the whitespace where the next argument goes.

## Show API docs

**DABT: Show API Docs for Symbol Under Cursor** shows the signature, doc and definition site of the function under the cursor as a notification. It's handy with a keybinding:

```json
{ "key": "ctrl+alt+d", "command": "dabt.showApiDoc", "when": "editorLangId == shellscript" }
```

## Linting

Diagnostics for shell files have their own page: [linting.md](linting.md).
