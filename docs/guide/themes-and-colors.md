# Themes and colors

DABT styles panes and widgets with a CSS-like `theme.css` (see the framework's [markup guide](https://dinosaursarecute.github.io/DinosAmazingBashTui/guide/markup)):

```css
.accent        { fg: br_cyan; bg: #1e1e2e; mods: bold; }
.accent:focus  { fg: black;   bg: br_cyan; }
```

In markup, a widget uses it with `class="accent"`. DABT Tools connects the two.

## In XML pages

For every `class="name"` that resolves to a rule in the page's own `<theme src="...">` file(s):

| What you see | Where |
|---|---|
| **Color swatches**: one for `bg`, one for `fg`, stacked | Just before the class name. These are VS Code's own color decorators, so they look like the ones in any CSS file. |
| **Inlay hint** `fg:br_cyan bg:#1e1e2e mod:bold` | Just after the closing quote, so you can tell which swatch is which. |
| **Completion** of class names | In `class="`, with each class's fg/bg/mods as detail and its states (`focus`, `hover`, `border`, `title`...) in the docs. |

The swatches show the **base** rule. State variants like `:focus` are listed in completion but not drawn.

Clicking a swatch in XML opens the color picker but **doesn't change anything**. `class=` names a theme class, not a color. To change the color, edit the `fg:`/`bg:` line in `theme.css`, where the picker does work.

The class hints share `dabt.inlayHints.enable` with the bash parameter hints.

## In `theme.css`

VS Code's CSS support already puts swatches on standard color names and `#hex` values, including inside DABT's `fg:`/`bg:` lines. What it doesn't know are DABT's **bright** names (`br_red`, `br_cyan`, ...). DABT Tools adds swatches for those, and picking a new color rewrites the name to a `#rrggbb` literal.

This only runs on stylesheets that look like a DABT theme (`.class { ... fg:|bg:|mods: ... }`). Unrelated project CSS is left alone.

## How names map to colors

Terminal colors depend on the terminal, so the swatches use the xterm/VTE default palette as a fixed, recognizable preview:

| Name | Swatch | Name | Swatch |
|---|---|---|---|
| `black` | `#000000` | `br_black` | `#555753` |
| `red` | `#cc0000` | `br_red` | `#ef2929` |
| `green` | `#4e9a06` | `br_green` | `#8ae234` |
| `yellow` | `#c4a000` | `br_yellow` | `#fce94f` |
| `blue` | `#3465a4` | `br_blue` | `#729fcf` |
| `magenta` | `#75507b` | `br_magenta` | `#ad7fa8` |
| `cyan` | `#06989a` | `br_cyan` | `#34e2e2` |
| `white` | `#d3d7cf` | `br_white` | `#eeeeec` |

`#RRGGBB` values are shown as-is. `default` means *the terminal's own foreground or background*, so it gets no swatch. What your users actually see depends on their terminal theme. The swatch is only a guide.
