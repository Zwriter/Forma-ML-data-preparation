# Forma Design Rules

Source of truth for all UI in `app/desktop`. Tokens live in `app/desktop/src/styles/tokens/`
(`index.css` imports `scale.css` and one `theme-<name>.css` per colour theme). The approved spec
and rationale are in `design/chosen-theme.md`. The token contract is enforced by
`app/desktop/tests/unit/styles/designTokens.test.ts`.

Last updated: 2026-11-08

## 1. Direction

- **Personality:** dense and technical, with a calm worksheet.
- **Feel in one sentence:** sharp, compact chrome around a readable data grid, where colour
  marks only what you can act on.
- **Signature details:** square 2px edges everywhere, uppercase mono ribbon captions, and (in the
  default Graphite theme) a dark title bar and tab strip.
- **Fixed vs user-chosen:** shape, type, density and layout are fixed. The colour theme
  (Graphite, Ledger, Paper, Orchid) and the mode (System, Light, Dark) are user settings.
- **Never look like:**
  - soft/rounded UI: pills, 6px+ corners, floating rounded cards (rejected Orchid shape)
  - editorial: serif type, a layered paper "desk" (rejected Paper shape)
  - generic SaaS: accent-coloured icons everywhere, 32px+ airy controls (rejected Ledger shape)
  - a heavy spreadsheet: vertical column lines, 26px rows, an A/B/C letter row, an Excel-green
    active cell (rejected Graphite grid and the old worksheet)
  - native OS controls, gradients, glass, card shadows, animation that moves things

## 2. Tokens

Components use **semantic tokens only**. Primitives (`--prim-*`, `--graphite-*`, `--ledger-*`,
`--paper-*`, `--orchid-*`) are private to the token folder; a test fails if they appear elsewhere.

### Colour (semantic)

Values shown for the default Graphite theme. Every theme defines every role, light and dark.

| Token                       | Light                 | Dark                  | Use for                                                                |
| --------------------------- | --------------------- | --------------------- | ---------------------------------------------------------------------- |
| `--color-bg`                | `#f2f2f2`             | `#0a0a0a`             | Window background, worksheet header, ribbon hover, chips               |
| `--color-surface`           | `#ffffff`             | `#141414`             | Ribbon, worksheet body, cards, inputs, panels                          |
| `--color-surface-raised`    | `#fafafa`             | `#1c1c1c`             | Popups, menus, toasts                                                  |
| `--color-border`            | `#d9d9d9`             | `#2b2b2b`             | Hairline dividers, row lines, card outlines                            |
| `--color-border-strong`     | `#7f7f7f`             | `#6e6e6e`             | Input/select/checkbox borders, worksheet header rule, secondary button |
| `--color-text`              | `#111111`             | `#ededed`             | Primary text, ribbon icons                                             |
| `--color-text-muted`        | `#4a4a4a`             | `#b0b0b0`             | Labels, secondary text, pager                                          |
| `--color-text-subtle`       | `#636363`             | `#8f8f8f`             | Placeholders, captions, type icons, row numbers, disabled commands     |
| `--color-accent`            | `#0a726d`             | `#2fc7bd`             | Primary action, active/selected state, focus, links                    |
| `--color-accent-hover`      | `#075b57`             | `#5ad6ce`             | Primary button hover                                                   |
| `--color-accent-contrast`   | `#ffffff`             | `#04201e`             | Text/icons on accent                                                   |
| `--color-accent-soft`       | `#e2f2f1`             | `#0f2e2c`             | Ghost hover, selected row number, focus halo, current settings option  |
| `--color-success` / `-soft` | `#177432` / `#e8f1eb` | `#3fb950` / `#1b2e1e` | "Good", valid, completeness fill                                       |
| `--color-warning` / `-soft` | `#946300` / `#f4efe6` | `#d29922` / `#322916` | "Needs attention", missing cells                                       |
| `--color-danger` / `-soft`  | `#cf222e` / `#fae9ea` | `#f85149` / `#381e1c` | Errors, invalid, duplicates, destructive actions                       |
| `--color-info` / `-soft`    | `#0969da` / `#e6f0fb` | `#58a6ff` / `#1f2b3a` | Running jobs, neutral notices                                          |
| `--color-chrome`            | `#18181b`             | `#000000`             | Title bar + top tab strip background                                   |
| `--color-chrome-text`       | `#f4f4f5`             | `#ededed`             | Chrome text, active top tab                                            |
| `--color-chrome-muted`      | `#a1a1aa`             | `#a1a1aa`             | Inactive top tabs, Saved, window controls                              |
| `--color-chrome-border`     | `#18181b`             | `#000000`             | Chrome dividers, document tab sides                                    |
| `--color-chart-1`           | = accent              | = accent              | Primary chart series                                                   |
| `--color-chart-2`           | `#636363`             | `#8f8f8f`             | Alternate chart series (Orchid: mint)                                  |
| `--color-row-hover`         | accent-soft 55%       | accent-soft 55%       | Worksheet and table row hover                                          |
| `--color-focus`             | = accent              | = accent              | Focus outline                                                          |
| `--color-scrim`             | black 40%             | black 40%             | Backdrop behind modal confirm dialogs                                  |

In Ledger, Paper and Orchid, `--color-chrome*` equal `surface` / `text` / `text-muted` / `border`,
so the chrome reads as plain. Components never branch on theme name.

### Type

| Token              | Size / line height | Weight                | Use for                                                                |
| ------------------ | ------------------ | --------------------- | ---------------------------------------------------------------------- |
| `--text-display-*` | 26px / 1.2         | 600, `--font-display` | Page title (Profile "Data profile") only                               |
| `--text-heading-*` | 20px / 1.25        | 600, `--font-display` | Stat values, backstage page heading                                    |
| `--text-title-*`   | 16px / 1.3         | 600, `--font-display` | Popup and dialog titles, settings group titles                         |
| `--text-body-lg-*` | 14px / 1.45        | 600                   | Card/panel titles                                                      |
| `--text-body-*`    | 13px / 1.45        | 400                   | Default: cells, inputs, buttons, lists, top tabs (500)                 |
| `--text-small-*`   | 12px / 1.4         | 400–500               | Ribbon labels, field labels, badges, pager, worksheet numbers (mono)   |
| `--text-caption-*` | 11px / 1.4         | 500                   | Chips, ribbon group captions (mono, uppercase, `--text-caps-tracking`) |

Families: `--font-display` Space Grotesk, `--font-body` Geist, `--font-mono` Geist Mono. Weights:
`--weight-regular` 400, `--weight-medium` 500, `--weight-semibold` 600.

### Spacing

| Token         | Value | Use for                                                     |
| ------------- | ----- | ----------------------------------------------------------- |
| `--space-0-5` | 2px   | Between ribbon buttons, icon-to-badge                       |
| `--space-1`   | 4px   | Label to field, icon to text in small controls              |
| `--space-1-5` | 6px   | Icon to text in buttons and headers, chip padding-x         |
| `--space-2`   | 8px   | Gap between controls in a row, toolbar padding-y, list gaps |
| `--space-3`   | 12px  | Field-to-field, groups inside a card, button padding-x      |
| `--space-4`   | 16px  | Card and popup padding, gap between cards                   |
| `--space-5`   | 20px  | Backstage content padding                                   |
| `--space-6`   | 24px  | Section gap in backstage/settings                           |
| `--space-8`   | 32px  | Page-level gap (Profile sections)                           |

### Sizes, radius, elevation, motion, layering

| Token                                                       | Value                    | Use for                                                             |
| ----------------------------------------------------------- | ------------------------ | ------------------------------------------------------------------- |
| `--size-control` / `-sm`                                    | 28px / 24px              | Buttons, inputs, selects / dense toolbars, pager                    |
| `--size-row` / `--size-header-row`                          | 30px / 36px              | Worksheet body / header rows                                        |
| `--size-titlebar`                                           | 34px                     | Title bar                                                           |
| `--size-icon` / `-sm`                                       | 20px / 16px              | Ribbon icons / inline icons                                         |
| `--size-checkbox`                                           | 16px                     | Checkbox box                                                        |
| `--size-switch-width` × `-height`                           | 32 × 18px                | Switch                                                              |
| `--size-row-number`                                         | 44px                     | Worksheet row-number column                                         |
| `--size-ribbon-button-min`                                  | 48px                     | Ribbon button min width                                             |
| `--size-popup-width`                                        | 320px                    | Anchored popups (default)                                           |
| `--radius-sm` / `--radius-control`                          | 2px                      | Chips, checkboxes / buttons, inputs, ribbon buttons, step cards     |
| `--radius-panel`                                            | 3px                      | Popups, cards, panels                                               |
| `--radius-round`                                            | 50%                      | Status dots and radio dots only                                     |
| `--border-width` / `-strong`                                | 1px / 2px                | All borders / active indicator bars                                 |
| `--shadow-none`                                             | none                     | Everything that isn't floating                                      |
| `--shadow-popup`                                            | ring + 8px blur          | Popups, menus, toasts only                                          |
| `--duration-instant` / `-fast` / `-slow`                    | 0 / 80 / 120ms           | State swap / hover-focus colour / popup fade                        |
| `--ease-standard`                                           | linear                   | All transitions                                                     |
| `--focus-ring-width` / `-offset` / `--focus-halo-width`     | 2 / 2 / 3px              | Focus outline / input halo                                          |
| `--opacity-disabled`                                        | 0.45                     | Disabled controls                                                   |
| `--z-raised` / `-sticky` / `-overlay` / `-popup` / `-toast` | 1 / 2 / 20 / 1000 / 1100 | Active cell / sticky header / panels over content / popups / toasts |

## 3. Colour usage

- Accent appears **only** on: primary buttons, the active top-tab bar, the open ribbon command bar,
  the active cell and current row number, focus rings, checked/on controls, the page indicator,
  links, the selected settings option, and `--color-chart-1`.
- Never put accent on ribbon icons, column headers, body text, borders at rest or decoration.
- At most **one primary button per popup, panel or backstage page.**
- Status colours mean status only. Each status pairs text in `--color-<status>` with a background
  in `--color-<status>-soft`. Never use status colours as decoration.
- Text goes on `bg`, `surface`, `surface-raised` or `accent-soft` only. No grey text on a coloured
  fill other than `*-soft` status pills.
- Charts: series 1 `--color-chart-1`, series 2 `--color-chart-2`, invalid/missing in status colours.
  Axis labels `--color-text-muted`, gridlines `--color-border`.
- **Dark mode** uses the same structure: `bg` is darkest, `surface` one step lighter, and
  `surface-raised` lighter again. Borders still separate everything.
- **Theme switching** sets `data-theme` / `data-mode` on `<html>` before first paint. No component
  knows which theme is active.

## 4. Typography

- One screen uses at most **3 type sizes and 2 weights** besides the chrome.
- Space Grotesk (`--font-display`) is only for titles and stat values (`title`, `heading`, `display`).
- Numbers that line up (worksheet, profile tables, pager, stats) use `--font-mono` in the
  worksheet and `font-variant-numeric: tabular-nums` elsewhere, and are right-aligned in columns.
- Uppercase only for ribbon group captions and card sub-labels (`caption`, mono or 600, tracked).
- No font size, weight or family outside the tokens. No `font-weight: 650/700`.

## 5. Layout and spacing

- **Window, not page:** `body` never scrolls. The worksheet, profile content, backstage list,
  steps panel and popups each scroll on their own (`overflow: auto` on that region only).
- **Fixed stack:** title bar (`--size-titlebar`) → top tabs → ribbon → workspace (fills the rest)
  → pager/status. Only the workspace changes height.
- **Supported window:** minimum 800×600. Breakpoints: **≤ 900px** compact (ribbon labels may
  wrap, steps panel overlays instead of docking) and **≤ 620px** narrow (ribbon scrolls
  horizontally, popups go full width with `--space-2` inset). No other breakpoints.
- Worksheet is edge-to-edge in the workspace: no margin, no card.
- Popup and card padding: `--space-4`. Field to field: `--space-3`. Label to input: `--space-1`.
  Controls in a row: `--space-2`. Popup footer: `--space-3` above, divided by `--color-border`.
- Every spacing value is a `--space-*` token. No odd pixel values (5, 7, 9, 13px).

## 6. Depth and surfaces

- Stack: `--color-bg` (window) → `--color-surface` (ribbon, worksheet, cards) →
  `--color-surface-raised` (popups, menus, toasts).
- Separation is by `--border-width` + `--color-border`. Only floating layers get `--shadow-popup`.
- **No nested cards.** A panel inside a card is a divided section (border-top), not another box.
- Profile panels sit in one surface separated by dividers; summary stats are bordered tiles.

## 7. Components

Every interactive component has these states: default, hover, focus-visible, active/pressed,
disabled, plus loading or error where relevant. One shared implementation per component.
Feature CSS may lay a component out, but never restyle its colours, sizes or radius.

### Button

| Variant     | Use                                                       | Rest                                               | Hover                  | Text                                     |
| ----------- | --------------------------------------------------------- | -------------------------------------------------- | ---------------------- | ---------------------------------------- |
| `primary`   | The one main action (Apply filter, Add step, Import file) | `--color-accent`                                   | `--color-accent-hover` | `--color-accent-contrast`, 600           |
| `secondary` | Cancel, alternate actions                                 | `--color-surface` + `--color-border-strong` border | `--color-bg` fill      | `--color-text`, 600                      |
| `ghost`     | Low-emphasis actions (Add condition, Discard, Columns)    | transparent                                        | `--color-accent-soft`  | `--color-text`, 500                      |
| `danger`    | Destructive only (Remove step, delete)                    | `--color-surface` + `--color-danger` border        | `--color-danger-soft`  | `--color-danger`, 600                    |
| `icon`      | Icon-only (refresh, settings, row actions)                | transparent + `--color-border-strong`              | `--color-bg`           | `--color-text-muted`, needs `aria-label` |

- Sizes: `md` = `--size-control` (28px, padding-x `--space-3`, `--text-body-size`); `sm` =
  `--size-control-sm` (24px, padding-x `--space-2`, `--text-small-size`). Icon buttons are square.
- Radius `--radius-control`. Icon 16px (`--size-icon-sm`), gap `--space-1-5`.
- Focus-visible: `--focus-ring-width` solid `--color-focus`, offset `--focus-ring-offset`.
- Active: same as hover (no scale or translate). Disabled: `--opacity-disabled`, `cursor: not-allowed`.
- Loading: label stays, a 16px spinner replaces the icon, `aria-busy="true"`, not clickable.

### Ribbon button and group (kept layout)

- Button: column with icon (`--size-icon`, `--color-text`) over label (`--text-small-size`),
  min width `--size-ribbon-button-min`, padding `--space-1`, radius `--radius-control`.
- Hover: `--color-bg`. Open (its popup is showing) / pressed: `--color-bg` + inset
  `--border-width-strong` bottom bar in `--color-accent`, `aria-expanded="true"`.
- Disabled: icon and label `--color-text-subtle`, `aria-disabled="true"`.
- Group: separated by `--color-border` vertical rule, caption below in `--font-mono`
  `--text-caption-size`, uppercase, `--text-caps-tracking`, `--color-text-subtle`.

### Input, search, select

- Height `--size-control`, padding-x `--space-2`, `--color-surface`, border
  `--border-width` `--color-border-strong`, radius `--radius-control`, `--text-body-size`.
- Placeholder `--color-text-subtle`. Hover border `--color-text-muted`.
- Focus: border `--color-accent` + `0 0 0 var(--focus-halo-width) var(--color-accent-soft)`.
- Error: border `--color-danger` + halo in `--color-danger-soft`, `aria-invalid="true"`; message
  below in `--color-danger`, `--text-small-size`, alert icon, linked by `aria-describedby`.
- Disabled: `--opacity-disabled`. Read-only: `--color-bg` fill.
- Search: same field with a leading 16px search icon in `--color-text-subtle`.
- Select: custom-styled field (chevron in `--color-text-muted`). Never the unstyled native control.
  Native `<select>` is allowed only with `appearance: none` and these tokens.
- Every field has a visible `<label>` (`--text-small-size`, 500, `--color-text-muted`) or an
  `aria-label` when the context is unmistakable (worksheet search).

### Checkbox, radio, switch

- Checkbox: `--size-checkbox`, `--radius-sm`, `--color-border-strong` border; checked:
  `--color-accent` fill, tick in `--color-accent-contrast`.
- Radio: 16px `--radius-round`; checked: 4px `--color-accent` ring.
- Switch: `--size-switch-width` × `--size-switch-height`, radius `--radius-sm` (square), track
  `--color-border-strong` off / `--color-accent` on, thumb `--color-surface`. `role="switch"`.
- Label to control gap `--space-2`. The whole label row is clickable.

### Segmented control / inline tabs

Replaces the three old inline tab styles (`.inspector-tabs`, `.steps-panel-tab`,
`.recent-file-filters`).

- Container: `--border-width` `--color-border-strong`, radius `--radius-control`.
- Segment: height `--size-control-sm`, `--text-small-size` 500, `--color-text-muted`; divided by
  `--color-border`.
- Selected: `--color-accent` fill + `--color-accent-contrast` text (settings, filters), or for view
  tabs `--color-text` + 2px `--color-accent` bottom bar. Use `role="tablist"` / `aria-selected` or
  `aria-pressed`.

### Title bar and top tabs (chrome)

- Title bar height `--size-titlebar`, `--color-chrome` fill, `--color-chrome-text`; logo + "Forma"
  in `--font-display` `--text-body-lg-size`.
- Document tab: `--color-surface` fill, `--color-chrome-border` sides, `--text-small-size` 500,
  close icon 16px.
- Saved indicator: 7px `--color-success` dot + `--color-chrome-muted` text.
- Window controls: 40px wide, `--color-chrome-muted` icons; hover `--color-chrome-text`. Close
  hover: `--color-danger-soft` fill with a `--color-danger` icon.
- Top tabs: on `--color-chrome`, `--text-body-size` 500, padding `--space-2` `--space-3`. Inactive
  `--color-chrome-muted`, hover and active `--color-chrome-text`. Active tab has a
  `--border-width-strong` `--color-accent` bar flush with the bottom edge. No pill, no fill.

### Worksheet (data table)

- Edge-to-edge in the workspace. `table-layout: fixed`, `border-collapse: separate`.
- Header row `--size-header-row`, sticky (`--z-sticky`), `--color-bg` fill, bottom rule
  `--border-width` `--color-border-strong`. Cell: type icon (`--size-icon-sm`,
  `--color-text-subtle`) + name (`--weight-semibold`, `--color-text`), gap `--space-1-5`.
- Number columns are right-aligned, with the icon after the name.
- Sort: arrow hidden at rest, `--color-text-subtle` on header hover, `--color-accent` and always
  visible when sorted. Exposed via `aria-sort`.
- Body rows `--size-row`, `--text-body-size`, padding-x `--space-2`, bottom
  line `--border-width` `--color-border`. **No vertical lines, no zebra.**
- Numbers: `--font-mono` at `--text-small-size`, right-aligned. Booleans/false values: `--color-text-muted`.
- Row-number column `--size-row-number`, right-aligned, `--font-mono` `--text-small-size`,
  `--color-text-subtle`. Current row: `--color-accent-soft` fill, `--color-accent` 600 text.
- Active cell: inset `--border-width-strong` `--color-accent` outline, `--z-raised`.
- Row hover: `--color-row-hover`. Selected range: `--color-accent-soft`.
- Toolbar above (height `--size-control` + `--space-2` padding): search (flexes), ghost
  "Columns n/m" button, chips for row count and file type. One count only. No name box.
- Empty: centered empty state (see below) inside the grid area.

### Pager / status strip

- Height `--size-control` + `--space-1-5` padding, top `--color-border` line, `--text-small-size`
  `--color-text-muted`. Rows-per-page select `sm`. Current page: `--size-control-sm` square,
  `--color-accent` fill, `--color-accent-contrast` 600, `--radius-sm`. Prev/next are `icon` `sm`.

### Popup (anchored, draggable dialog)

- Opens under its ribbon button, `--size-popup-width` (wider allowed for builders: 400/480px),
  `--color-surface-raised`, `--border-width` `--color-border`, `--radius-panel`, `--shadow-popup`,
  padding `--space-4`, `--z-popup`. `role="dialog"`, `aria-labelledby` its title.
- Header: drag grip (`--color-text-subtle`) + title in `--font-display` `--text-title-size`.
- Body fields use the Input rules. Grouped conditions are divided sections, not nested cards.
- Footer: `--color-border` top, `--space-3` gap: ghost secondary action left; `secondary` Cancel
  and `primary` action right. `Esc` closes, `Enter` submits when valid, focus returns to the opener.
- Never taller than the workspace; the body scrolls inside.

### Menu (MenuButton, step actions)

- `--color-surface-raised`, `--border-width` `--color-border`, `--radius-panel`, `--shadow-popup`,
  padding `--space-1`. Item height `--size-control`, padding-x `--space-2`, hover `--color-bg`,
  danger items `--color-danger`. Arrow-key navigation, `role="menu"` / `menuitem`.

### Card / panel

- `--color-surface`, `--border-width` `--color-border`, `--radius-panel`, padding `--space-4`,
  `--shadow-none`. Title `--text-body-lg-size` 600. Sub-labels `caption` uppercase `--color-text-subtle`.
- Stat tile (Profile summary): bordered card, value `--font-display` `--text-heading-size`
  tabular, label `--text-small-size` `--color-text-muted`. Warning/danger values take status colours.

### List row (recent files, column list, step card)

- Height ≥ `--size-control` + `--space-2`, padding `--space-2`, `--color-surface`,
  `--border-width` `--color-border`, `--radius-control`. Hover: `--color-row-hover`. Selected:
  `--color-accent-soft` + inset `--border-width-strong` `--color-accent` left bar.
- Leading icon `--size-icon-sm` `--color-text-muted`; meta right-aligned `--color-text-muted` tabular.
- Favourite star: `--color-warning` fill when on (meets 3:1).
- Step card: number badge 22px `--color-accent-soft` / `--color-accent`, title `--text-body-size`
  600, summary `--text-small-size` `--color-text-muted`, switch at the right. Disabled step: title
  and summary `--color-text-subtle` (not opacity).

### Navigation rail (File backstage, Settings)

- Width 160px, `--color-surface`, right `--color-border`. Item `--size-control` + `--space-1`,
  padding-x `--space-2`, `--text-body-size`, `--color-text-muted`, radius `--radius-control`.
- Active: `--color-accent-soft` fill, `--color-accent` text, inset `--border-width-strong`
  `--color-accent` left bar. Back button: `icon` variant.

### Badge / chip

- Status badge: `--text-small-size` 600, padding `0 var(--space-2)`, `--radius-sm`,
  `--color-<status>` text and a 6px dot on `--color-<status>-soft`. Always text, never colour alone.
- Neutral chip (type names, counts, "CSV"): `--text-caption-size` 500, `--color-bg` fill,
  `--color-border`, `--color-text-muted`.

### Progress / completeness bar

- 6px high, `--radius-sm`, track `--color-bg` + `--color-border`, fill `--color-success`
  (below the quality threshold: `--color-danger`; running: `--color-info`). Pair with a number.

### Toast (NotificationPopup)

- `--color-surface-raised`, `--border-width` `--color-border` with a 3px left bar in the status
  colour, `--radius-panel`, `--shadow-popup`, padding `--space-3`, `--z-toast`, top-right
  `--space-4` inset. `role="status"` (errors: `role="alert"`). Auto-dismiss ≥ 5s, never for errors.

### Error banner (inline)

- `--color-danger-soft` fill, `--color-danger` text and 1px border, `--radius-control`, padding
  `--space-2` `--space-3`, alert icon, an actionable message plus a retry/fix action when one exists.

### Empty state

- Centered in its region: 20px icon `--color-text-subtle`, title `--text-body-lg-size` 600, one
  line `--color-text-muted`, and at most one `primary` or `secondary` action. No illustrations.

### Charts (Profile)

- SVG, no rounded bars (`--radius-sm` max). Bars `--color-chart-1`; alternates `--color-chart-2`.
  Ring gauge: track `--color-bg`, value `--color-success`/`--color-warning`/`--color-danger` by
  threshold. Labels `--text-small-size` `--color-text-muted`, values tabular. Each chart has a
  text summary (`aria-label` or caption).

### Settings › Appearance

- **Colour theme:** radio list (`role="radiogroup"`), one row per theme: a swatch strip (chrome,
  surface, accent, success, warning, danger; each 14×22px, `--color-border` outline), name
  (`--text-body-size` 600), one-line description (`--text-caption-size` `--color-text-muted`) and
  a radio dot. Selected: `--color-accent` border + inset 1px ring. Graphite is first and default.
- **Mode:** segmented control System / Light / Dark (System default). System follows
  `prefers-color-scheme` live.
- Changes apply immediately, persist through the settings store, and are restored before the
  first paint (no flash).

## 8. Motion

- Only colour, background, border and opacity transition: `--duration-fast` `--ease-standard`.
- Popups and toasts may fade in over `--duration-slow`. Nothing slides, scales, bounces or springs.
- `prefers-reduced-motion: reduce` sets all durations to 0 (done in `scale.css`).
- No loading skeleton animation. Use a static placeholder with an `aria-busy` region and a spinner
  only on the control that started the work.

## 9. Accessibility

- Contrast: 4.5:1 for text, 3:1 for large text and UI boundaries, in every colour theme and mode.
  The token test enforces this; never add a colour that hasn't been through it.
- Visible focus on every interactive element: `--focus-ring-width` solid `--color-focus`,
  offset `--focus-ring-offset`. Never `outline: none` without a replacement.
- Full keyboard use: tab order follows the visual order (title bar → tabs → ribbon → workspace);
  arrow keys move within the worksheet, menus, radio groups and segmented controls.
- Every input has a label; icon-only buttons have an accessible name; status is never colour-only.
- Desktop pointer targets ≥ 24×24px (`--size-control-sm`); prefer `--size-control`.
- Popups trap focus while open and return focus to their opener.

## 10. Do / Don't

| Do                                                      | Don't                                             |
| ------------------------------------------------------- | ------------------------------------------------- |
| `background: var(--color-surface)`                      | `background: #fff` or `var(--graphite-gray-100)`  |
| `border-radius: var(--radius-control)`                  | `border-radius: 6px` / `999px`                    |
| One `primary` button per popup                          | Two filled buttons side by side                   |
| Hairline row lines in the worksheet                     | Vertical column lines or zebra stripes            |
| Monochrome ribbon icons, accent bar on the open command | Accent-coloured icons everywhere                  |
| `--font-mono` right-aligned numbers                     | Proportional left-aligned numbers                 |
| Status pill with text and dot                           | A coloured dot with no label                      |
| Divided sections inside a card                          | A card inside a card                              |
| Shared Button/Input/Select components                   | Restyling `<button>` per feature (`.x button {}`) |
| Colour transitions at `--duration-fast`                 | Scale on press, slide-ins, springs                |

## 11. Banned

- Hardcoded colours (hex, rgb, hsl, named) outside `src/styles/tokens/`. The only exception is
  `rgb()` inside a shadow token.
- Font sizes, weights, families, radii, shadows, durations or z-indexes not taken from a token.
- New greys, new type sizes or new radii without adding the token here and in the token folder
  first, and passing the token test.
- Primitive tokens (`--prim-*`, `--<theme>-*`) in component CSS or TSX.
- Inline `style` colours in TSX (chart data widths and positions are fine).
- Unstyled native buttons, selects, checkboxes or scrollbars that don't match the theme.
- Anything from the "never look like" list in section 1.
- Media queries other than the two breakpoints (900px, 620px) and `prefers-reduced-motion`.
  Container queries are allowed where a panel lays out by its own width (Profile dashboard).

## 12. Documented exceptions

| Where                                               | Value                 | Why                                                                     |
| --------------------------------------------------- | --------------------- | ----------------------------------------------------------------------- |
| `workspace-content-general-responsive.css`          | `font-size: 0`        | Hides rail labels at ≤ 620px while keeping them as accessible names.    |
| `profile-charts.css`                                | `margin-right: 60px`  | Chart label column width, a layout size, not spacing.                   |
| `workspace-content-base.css`                        | `clamp(…, 8vh, 90px)` | Welcome panel vertical centring, a layout size.                         |
| Widths such as `160px`, `320px`, `min(480px, 55vw)` | px                    | Layout dimensions; spacing tokens cover gaps, padding and margins only. |
