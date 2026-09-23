# Abbreviation glossary

DABT's internals use compact, underscore-separated names for performance-sensitive globals: `_DLG_KIND`, `_TXLK`, `_TUI_P_ROW`... They're fast to type in the framework but hard to read from outside it. The glossary explains each segment when you hover it (see [shell scripts](../guide/shell-scripts.md#hover)).

## Why it's hand-written

Everything else in the extension is parsed from DABT's source. Meanings can't be parsed: someone has to read the code and write down what `TXLK` stands for. So the glossary lives in `src/data/dabtAbbreviations.json`, and a script handles the automatic part: **finding** segments that aren't defined yet.

## Entry format

```json
{ "abbr": "DLG", "meaning": "Dialog — modal dialog/prompt/chooser/toast state", "subsystem": "lib/chrome/tui_dialog.sh" }
```

| Field | |
|---|---|
| `abbr` | The segment exactly as it appears between underscores. |
| `meaning` | What it stands for, then an em dash and what it's used for. One line. |
| `subsystem` | Optional. The file(s) where it's used, comma-separated, relative to the DABT root. Shown in the hover. |

## Finding missing entries

```bash
npm run gen-abbrev-candidates -- /path/to/DinosAmazingBashTui            # segments used 2+ times
npm run gen-abbrev-candidates -- /path/to/DinosAmazingBashTui --min-count=1
```

The script scans the checkout for `_`-prefixed ALL-CAPS identifiers, splits them into segments, removes the ones already in the glossary and a built-in list of plain English words (`WIDTH`, `RESET`, ...), and prints each remaining candidate with its count and example files.

To add an entry:

1. Read the code where it's used (the example files are listed).
2. Add an entry to the JSON.
3. Re-run the script until the list is empty or has only plain words. Add those to the script's word list, not to the glossary.

When DABT moves a file, update the `subsystem` paths. Search for the old path in the JSON.
