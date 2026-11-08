# Chosen theme: Graphite + Ledger grid

**Status:** approved by the user on 2026-11-08. Preview: `design/themes-preview.html`, section
"Chosen".

**Feel:** sharp, compact chrome with a calm, readable worksheet. The structure and shape are fixed;
the colour theme is a user setting.

**Built from:** Graphite's shape, density, type and dark title bar, plus Ledger's worksheet. Ledger,
Paper and Orchid remain as colour themes in **File › Settings › Appearance**. Graphite is the default.

## Structure (fixed across all colour themes)

### Radius: sharp

| Token       | Value | Use                                                  |
| ----------- | ----- | ---------------------------------------------------- |
| `radius-sm` | 2px   | checkboxes, chips, page indicator                    |
| `radius-md` | 2px   | buttons, inputs, selects, ribbon buttons, step cards |
| `radius-lg` | 3px   | popups, cards, settings panels                       |
| (none)      | 50%   | status dots, radio dots only                         |

No pill shapes anywhere. Switches are square (2px track, 1px thumb).

### Density

- Controls (buttons, inputs, selects): **28px** high; small variant 24px.
- Ribbon buttons: icon 20px over label, 48px min width, 4–5px padding.
- Worksheet rows: **30px** (Ledger), header 36px.
- Profile table rows: 6px vertical padding.

### Spacing: 4px base

`2 · 4 · 6 · 8 · 12 · 16 · 20 · 24 · 32` px. Nothing off-scale.

### Typography

| Role                                                        | Family        | Weight                                          |
| ----------------------------------------------------------- | ------------- | ----------------------------------------------- |
| Display (window title, panel and popup titles, stat values) | Space Grotesk | 600                                             |
| Body / UI                                                   | Geist         | 400, 500 (labels, tabs), 600 (headers, buttons) |
| Numbers, row numbers, ribbon captions, code                 | Geist Mono    | 400, 500                                        |

| Step   | Size | Line height | Use                                                               |
| ------ | ---- | ----------- | ----------------------------------------------------------------- |
| `fs-1` | 11px | 1.4         | captions, chips, ribbon group captions (mono, uppercase, +0.08em) |
| `fs-2` | 12px | 1.4         | ribbon labels, field labels, pager, badges                        |
| `fs-3` | 13px | 1.45        | body, cells, inputs, buttons                                      |
| `fs-4` | 14px | 1.45        | card titles, emphasis                                             |
| `fs-5` | 16px | 1.3         | popup titles                                                      |
| `fs-6` | 20px | 1.25        | stat values, section headings                                     |
| `fs-7` | 26px | 1.2         | page title (Profile "Data profile")                               |

Worksheet numbers: Geist Mono at `fs-3 − 1px`, right-aligned. Bundle the fonts as woff2 inside the
Tauri app; it must not load from Google Fonts at runtime. All three families are SIL OFL.

### Elevation: borders only

- Everything sits flat, separated by `border` (hairline) or `border-strong` (header rule, inputs).
- One shadow level, for popups and menus only:
  `0 0 0 1px rgb(0 0 0 / 6%), 0 8px 20px rgb(0 0 0 / 18%)`.
- Cards have no shadow.

### Motion

| Token      | Value                      |
| ---------- | -------------------------- |
| `dur-fast` | 0ms (state swaps)          |
| `dur-base` | 80ms (hover/focus colour)  |
| `dur-slow` | 120ms (popup fade, if any) |
| `ease`     | linear                     |

No movement-based animation. `prefers-reduced-motion` disables all transitions.

### Focus

2px solid `accent` outline, 2px offset, on every focusable control. Inputs also get a
`0 0 0 3px accent-soft` halo when focused.

## Components

### Chrome (title bar + top tabs)

- Background `chrome`, text `chrome-text`, inactive tabs `chrome-muted`, divider `chrome-border`.
  In the Graphite theme this is the dark band. In the other themes it equals `surface`, so the
  bar reads as plain.
- Document tab: `surface` with `chrome-border` sides.
- Active top tab: `chrome-text` + a 2px `accent` bar along the bottom edge. No pill, no fill.

### Ribbon (kept layout)

- On `surface`, separated from the worksheet by `border`.
- Icons are monochrome (`text`); disabled commands use `text-subtle`.
- Hover: `bg` fill. Open/pressed command (popup showing): `bg` fill + 2px `accent` inset bottom.
- Group captions: Geist Mono `fs-1`, uppercase, `text-subtle`.

### Worksheet (from Ledger)

- Edge-to-edge in the work area, no card.
- One header row: type icon (`text-subtle`) + column name (600), on `bg`, with a 1px
  `border-strong` rule below. Number columns align right (icon after the name).
- Sort arrow hidden until hover; when sorted it stays visible in `accent`.
- Rows 30px with a 1px `border` row line. **No vertical column lines**, no zebra stripes.
- Row-number column 44px, `text-subtle`, Geist Mono. The current row's number gets `accent-soft`
  background and `accent` text.
- Active cell: 2px inset `accent` outline. Row hover: `accent-soft` at 55% opacity.
- Removed for good: A/B/C letter row, Excel-green active cell, stacked ▲▼ on every column, blue sort
  colour, duplicated "N of N columns visible".
- Toolbar: search (28px, `border-strong`), ghost "Columns 6/6" button, "30 rows" and "CSV" chips.
  Name box (`A2`) removed now that the letter row is gone.
- Pager: `fs-2` `text-muted`, page indicator as a filled `accent` square.

### Buttons

| Variant       | Fill                        | Text              | Border                       |
| ------------- | --------------------------- | ----------------- | ---------------------------- |
| Primary       | `accent` → `accent-hover`   | `accent-contrast` | none                         |
| Secondary     | `surface` → `bg`            | `text`            | `border-strong`              |
| Ghost / quiet | transparent → `accent-soft` | `text`            | none                         |
| Danger        | `surface` → `danger-soft`   | `danger`          | `danger`                     |
| Icon          | transparent                 | `text-muted`      | `border-strong`, square 28px |

Disabled: 45% opacity, `not-allowed` cursor. Pressed: `scale(.97)` is not used, because there is
no motion.

### Inputs, selects, checkboxes, switches

- 28px, `surface`, 1px `border-strong`, hover `text-muted` border, focus `accent` border + halo.
- Error: `danger` border + `danger-soft` halo, message below in `danger` `fs-2` with an alert icon.
- Selects are custom-styled. Native OS controls are never shown.
- Checkbox 16px square; checked = `accent` fill with `accent-contrast` tick.
- Switch 32×18, square; on = `accent`.

### Popups (kept behaviour)

`surface-raised`, 1px `border`, `radius-lg`, popup shadow, 14px padding, drag grip + Space Grotesk
title, footer split by `border`: ghost secondary action on the left, Cancel + primary on the right.

### Status

Badges: `fs-2` 600, `*-soft` background, coloured dot + text in the status colour.
Completeness bars: 6px, `bg` track with `border`, `success` fill (or `danger` below threshold).
Stat values: Space Grotesk `fs-6`. Missing cells uses `warning`, duplicates uses `danger`.

### Charts

Primary series `accent`, alternate series `text-subtle` (Orchid uses its mint `accent-2`).
Labels `text-muted`, values tabular.

### Settings › Appearance (new)

- **Colour theme**: a radio list of 4 rows (Graphite _default_, Ledger, Paper, Orchid). Each row
  shows a swatch strip (chrome, surface, accent, success, warning, danger), the name and a one-line
  description. Selected = `accent` border + filled radio dot.
- **Mode**: segmented System (default) / Light / Dark.
- Implementation: `data-theme="<name>"` and `data-mode="light|dark"` on the root, with every colour
  theme defining the same role set. Persist through the existing settings store. Apply before first
  paint to avoid a flash.

## Accent use

Accent appears only on: primary buttons, the active tab bar, the open ribbon command bar, the
active cell and current row number, focus rings, checked/on controls, the page indicator, links,
selected settings options and the primary chart series. Never on ribbon icons, headers or body text.

## Colour themes

All four define the same roles. `*-soft` status colours are the status colour mixed into `surface`
(10% light, 16% dark). Every text role passes 4.5:1 and every boundary role passes 3:1 in both
modes; the measured ratios are below.

### Graphite (default)

| Role              | Light                                | Dark                                 | Contrast (L / D)            |
| ----------------- | ------------------------------------ | ------------------------------------ | --------------------------- |
| `bg`              | `#f2f2f2` `oklch(96.1% 0.000 0)`     | `#0a0a0a` `oklch(14.5% 0.000 0)`     |                             |
| `surface`         | `#ffffff` `oklch(100.0% 0.000 0)`    | `#141414` `oklch(19.1% 0.000 0)`     |                             |
| `surface-raised`  | `#fafafa` `oklch(98.5% 0.000 0)`     | `#1c1c1c` `oklch(22.6% 0.000 0)`     |                             |
| `border`          | `#d9d9d9` `oklch(88.5% 0.000 0)`     | `#2b2b2b` `oklch(28.9% 0.000 0)`     |                             |
| `border-strong`   | `#7f7f7f` `oklch(59.6% 0.000 0)`     | `#6e6e6e` `oklch(53.8% 0.000 0)`     | 4.00 / 3.61 on surface      |
| `text`            | `#111111` `oklch(17.8% 0.000 0)`     | `#ededed` `oklch(94.6% 0.000 0)`     | 18.88 / 15.74 on surface    |
| `text-muted`      | `#4a4a4a` `oklch(40.9% 0.000 0)`     | `#b0b0b0` `oklch(75.7% 0.000 0)`     | 8.86 / 8.49 on surface      |
| `text-subtle`     | `#636363` `oklch(50.0% 0.000 0)`     | `#8f8f8f` `oklch(65.0% 0.000 0)`     | 6.01 / 5.70 on surface      |
| `accent`          | `#0a726d` `oklch(49.9% 0.084 189.4)` | `#2fc7bd` `oklch(75.2% 0.121 188.1)` | 5.77 / 8.79 on surface      |
| `accent-hover`    | `#075b57` `oklch(42.6% 0.072 189.5)` | `#5ad6ce` `oklch(80.5% 0.110 189.3)` |                             |
| `accent-contrast` | `#ffffff` `oklch(100.0% 0.000 0)`    | `#04201e` `oklch(22.2% 0.034 188.4)` | 5.77 / 8.15 on accent       |
| `accent-soft`     | `#e2f2f1` `oklch(94.9% 0.017 192.4)` | `#0f2e2c` `oklch(27.7% 0.037 189.5)` |                             |
| `success`         | `#177432` `oklch(49.2% 0.131 148.1)` | `#3fb950` `oklch(69.5% 0.181 145.6)` | 5.09 / 5.68 on success-soft |
| `success-soft`    | `#e8f1eb` `oklch(95.0% 0.012 157.0)` | `#1b2e1e` `oklch(27.9% 0.038 148.5)` |                             |
| `warning`         | `#946300` `oklch(53.9% 0.114 75.2)`  | `#d29922` `oklch(72.0% 0.140 79.9)`  | 4.53 / 5.68 on warning-soft |
| `warning-soft`    | `#f4efe6` `oklch(95.4% 0.013 82.4)`  | `#322916` `oklch(28.6% 0.034 85.0)`  |                             |
| `danger`          | `#cf222e` `oklch(55.2% 0.205 24.5)`  | `#f85149` `oklch(66.5% 0.205 27.0)`  | 4.57 / 4.57 on danger-soft  |
| `danger-soft`     | `#fae9ea` `oklch(94.8% 0.019 13.4)`  | `#381e1c` `oklch(26.9% 0.041 24.9)`  |                             |
| `info`            | `#0969da` `oklch(54.0% 0.191 257.5)` | `#58a6ff` `oklch(71.5% 0.152 253.3)` | 4.51 / 5.68 on info-soft    |
| `info-soft`       | `#e6f0fb` `oklch(95.1% 0.018 250.6)` | `#1f2b3a` `oklch(28.5% 0.032 254.3)` |                             |
| `chrome`          | `#18181b` `oklch(21.0% 0.006 285.9)` | `#000000` `oklch(0.0% 0.000 0)`      |                             |
| `chrome-text`     | `#f4f4f5` `oklch(96.7% 0.001 0)`     | `#ededed` `oklch(94.6% 0.000 0)`     | 16.12 / 17.94 on chrome     |
| `chrome-muted`    | `#a1a1aa` `oklch(71.2% 0.013 286.1)` | `#a1a1aa` `oklch(71.2% 0.013 286.1)` | 6.91 / 8.19 on chrome       |
| `chrome-border`   | `#18181b` `oklch(21.0% 0.006 285.9)` | `#000000` `oklch(0.0% 0.000 0)`      |                             |

### Ledger

| Role              | Light                                | Dark                                 | Contrast (L / D)            |
| ----------------- | ------------------------------------ | ------------------------------------ | --------------------------- |
| `bg`              | `#f4f6f9` `oklch(97.2% 0.005 258.3)` | `#0d1117` `oklch(17.6% 0.014 258.4)` |                             |
| `surface`         | `#ffffff` `oklch(100.0% 0.000 0)`    | `#151b24` `oklch(22.0% 0.020 258.3)` |                             |
| `surface-raised`  | `#ffffff` `oklch(100.0% 0.000 0)`    | `#1c2430` `oklch(25.8% 0.025 258.3)` |                             |
| `border`          | `#dde2ea` `oklch(91.1% 0.012 259.8)` | `#2a3442` `oklch(32.2% 0.029 256.8)` |                             |
| `border-strong`   | `#7d889b` `oklch(62.4% 0.031 261.4)` | `#64718a` `oklch(54.7% 0.042 263.4)` | 3.58 / 3.52 on surface      |
| `text`            | `#0f172a` `oklch(20.8% 0.040 265.8)` | `#e6ebf2` `oklch(93.8% 0.011 256.7)` | 17.85 / 14.44 on surface    |
| `text-muted`      | `#475569` `oklch(44.6% 0.037 257.3)` | `#a3aebf` `oklch(74.8% 0.027 259.0)` | 7.58 / 7.71 on surface      |
| `text-subtle`     | `#5f6b7e` `oklch(52.5% 0.033 259.6)` | `#8994a6` `oklch(66.4% 0.030 260.3)` | 5.40 / 5.64 on surface      |
| `accent`          | `#1f5fd1` `oklch(51.6% 0.188 261.0)` | `#6b9bff` `oklch(70.1% 0.156 263.5)` | 5.81 / 6.39 on surface      |
| `accent-hover`    | `#194db0` `oklch(45.0% 0.167 261.7)` | `#8ab0ff` `oklch(76.1% 0.122 264.1)` |                             |
| `accent-contrast` | `#ffffff` `oklch(100.0% 0.000 0)`    | `#0b1220` `oklch(18.3% 0.031 263.4)` | 5.81 / 6.92 on accent       |
| `accent-soft`     | `#e8effc` `oklch(95.1% 0.019 263.0)` | `#1a2a4a` `oklch(28.9% 0.063 263.0)` |                             |
| `success`         | `#127a45` `oklch(51.1% 0.122 154.3)` | `#4cc38a` `oklch(73.5% 0.136 159.3)` | 4.70 / 5.81 on success-soft |
| `success-soft`    | `#e7f2ec` `oklch(95.1% 0.014 162.5)` | `#1e3634` `oklch(31.3% 0.030 189.0)` |                             |
| `warning`         | `#975a00` `oklch(52.5% 0.117 65.8)`  | `#f0b54a` `oklch(80.9% 0.139 79.2)`  | 4.86 / 6.74 on warning-soft |
| `warning-soft`    | `#f5efe6` `oklch(95.4% 0.014 78.3)`  | `#38342a` `oklch(32.6% 0.018 88.8)`  |                             |
| `danger`          | `#c0292f` `oklch(52.9% 0.187 24.7)`  | `#ff7a7a` `oklch(73.5% 0.163 21.9)`  | 5.00 / 5.34 on danger-soft  |
| `danger-soft`     | `#f9eaea` `oklch(94.9% 0.016 17.4)`  | `#3a2a32` `oklch(30.7% 0.027 347.3)` |                             |
| `info`            | `#0b6aa8` `oklch(50.8% 0.126 245.7)` | `#5bb6f0` `oklch(74.4% 0.121 239.2)` | 5.00 / 5.73 on info-soft    |
| `info-soft`       | `#e7f0f6` `oklch(95.0% 0.013 236.6)` | `#203445` `oklch(31.6% 0.040 245.2)` |                             |
| `chrome`          | `#ffffff` `oklch(100.0% 0.000 0)`    | `#151b24` `oklch(22.0% 0.020 258.3)` |                             |
| `chrome-text`     | `#0f172a` `oklch(20.8% 0.040 265.8)` | `#e6ebf2` `oklch(93.8% 0.011 256.7)` | 17.85 / 14.44 on chrome     |
| `chrome-muted`    | `#475569` `oklch(44.6% 0.037 257.3)` | `#a3aebf` `oklch(74.8% 0.027 259.0)` | 7.58 / 7.71 on chrome       |
| `chrome-border`   | `#dde2ea` `oklch(91.1% 0.012 259.8)` | `#2a3442` `oklch(32.2% 0.029 256.8)` |                             |

### Paper

| Role              | Light                                | Dark                                 | Contrast (L / D)            |
| ----------------- | ------------------------------------ | ------------------------------------ | --------------------------- |
| `bg`              | `#f6f3ee` `oklch(96.5% 0.007 80.7)`  | `#171411` `oklch(19.4% 0.008 67.3)`  |                             |
| `surface`         | `#fffdf9` `oklch(99.4% 0.006 84.6)`  | `#1f1b17` `oklch(22.5% 0.010 67.3)`  |                             |
| `surface-raised`  | `#ffffff` `oklch(100.0% 0.000 0)`    | `#28231e` `oklch(26.0% 0.012 67.3)`  |                             |
| `border`          | `#e6dfd4` `oklch(90.6% 0.017 79.3)`  | `#3a332b` `oklch(32.6% 0.017 70.9)`  |                             |
| `border-strong`   | `#8f8576` `oklch(62.1% 0.025 78.1)`  | `#766b5c` `oklch(53.4% 0.027 75.6)`  | 3.57 / 3.28 on surface      |
| `text`            | `#1f1a14` `oklch(22.2% 0.014 72.1)`  | `#f1ebe2` `oklch(94.2% 0.014 78.3)`  | 17.00 / 14.44 on surface    |
| `text-muted`      | `#5a5046` `oklch(43.8% 0.021 67.2)`  | `#c2b7a8` `oklch(78.4% 0.024 75.8)`  | 7.74 / 8.66 on surface      |
| `text-subtle`     | `#6b6155` `oklch(49.8% 0.023 72.3)`  | `#a3978a` `oklch(68.3% 0.023 69.6)`  | 5.96 / 5.99 on surface      |
| `accent`          | `#a8441f` `oklch(51.6% 0.141 39.4)`  | `#ee8a5f` `oklch(73.2% 0.135 43.5)`  | 5.89 / 6.87 on surface      |
| `accent-hover`    | `#933b19` `oklch(46.8% 0.127 39.9)`  | `#f4a27e` `oklch(78.5% 0.110 44.4)`  |                             |
| `accent-contrast` | `#ffffff` `oklch(100.0% 0.000 0)`    | `#1f1208` `oklch(19.7% 0.028 58.1)`  | 5.98 / 7.35 on accent       |
| `accent-soft`     | `#f7e6dc` `oklch(93.6% 0.023 52.7)`  | `#3a2418` `oklch(28.5% 0.040 49.2)`  |                             |
| `success`         | `#2f7a3a` `oklch(51.7% 0.122 146.3)` | `#7cc68a` `oklch(76.2% 0.113 149.2)` | 4.57 / 6.15 on success-soft |
| `success-soft`    | `#eaf0e6` `oklch(94.8% 0.015 132.5)` | `#2e3629` `oklch(32.1% 0.025 133.5)` |                             |
| `warning`         | `#8a5600` `oklch(50.0% 0.109 69.6)`  | `#e8b45a` `oklch(80.0% 0.123 79.2)`  | 5.24 / 6.50 on warning-soft |
| `warning-soft`    | `#f3ece0` `oklch(94.5% 0.018 81.3)`  | `#3f3322` `oklch(32.9% 0.033 75.9)`  |                             |
| `danger`          | `#b3261e` `oklch(50.1% 0.178 28.7)`  | `#f28b82` `oklch(74.5% 0.127 25.8)`  | 5.48 / 5.39 on danger-soft  |
| `danger-soft`     | `#f7e8e3` `oklch(94.2% 0.018 39.4)`  | `#412d28` `oklch(31.9% 0.031 34.5)`  |                             |
| `info`            | `#2a6496` `oklch(48.9% 0.101 247.7)` | `#7fb3e0` `oklch(74.7% 0.085 245.4)` | 5.35 / 5.73 on info-soft    |
| `info-soft`       | `#eaeeef` `oklch(94.6% 0.005 214.3)` | `#2e3337` `oklch(31.8% 0.010 242.0)` |                             |
| `chrome`          | `#fffdf9` `oklch(99.4% 0.006 84.6)`  | `#1f1b17` `oklch(22.5% 0.010 67.3)`  |                             |
| `chrome-text`     | `#1f1a14` `oklch(22.2% 0.014 72.1)`  | `#f1ebe2` `oklch(94.2% 0.014 78.3)`  | 17.00 / 14.44 on chrome     |
| `chrome-muted`    | `#5a5046` `oklch(43.8% 0.021 67.2)`  | `#c2b7a8` `oklch(78.4% 0.024 75.8)`  | 7.74 / 8.66 on chrome       |
| `chrome-border`   | `#e6dfd4` `oklch(90.6% 0.017 79.3)`  | `#3a332b` `oklch(32.6% 0.017 70.9)`  |                             |

### Orchid

| Role              | Light                                | Dark                                 | Contrast (L / D)            |
| ----------------- | ------------------------------------ | ------------------------------------ | --------------------------- |
| `bg`              | `#f6f4fb` `oklch(97.1% 0.009 299.2)` | `#120e1a` `oklch(17.5% 0.025 299.1)` |                             |
| `surface`         | `#ffffff` `oklch(100.0% 0.000 0)`    | `#1a1524` `oklch(20.9% 0.030 299.1)` |                             |
| `surface-raised`  | `#ffffff` `oklch(100.0% 0.000 0)`    | `#231c30` `oklch(24.5% 0.038 299.7)` |                             |
| `border`          | `#e7e2f2` `oklch(92.1% 0.022 300.2)` | `#342b44` `oklch(31.0% 0.045 300.3)` |                             |
| `border-strong`   | `#8d84a3` `oklch(63.2% 0.047 298.3)` | `#756b8c` `oklch(54.9% 0.052 298.6)` | 3.52 / 3.60 on surface      |
| `text`            | `#1d1530` `oklch(22.1% 0.052 295.5)` | `#efeaf7` `oklch(94.5% 0.018 303.4)` | 17.47 / 15.11 on surface    |
| `text-muted`      | `#554b6b` `oklch(43.6% 0.053 298.5)` | `#bdb3d0` `oklch(78.4% 0.042 301.1)` | 8.06 / 8.94 on surface      |
| `text-subtle`     | `#675d7d` `oklch(50.0% 0.051 298.9)` | `#9d93b1` `oklch(68.2% 0.045 300.4)` | 6.11 / 6.15 on surface      |
| `accent`          | `#7e2fb5` `oklch(48.6% 0.201 307.2)` | `#c38bf0` `oklch(73.0% 0.152 308.6)` | 7.09 / 7.03 on surface      |
| `accent-hover`    | `#66249a` `oklch(42.3% 0.180 305.2)` | `#d4a8f5` `oklch(79.8% 0.116 310.0)` |                             |
| `accent-contrast` | `#ffffff` `oklch(100.0% 0.000 0)`    | `#1a0b28` `oklch(18.9% 0.058 305.4)` | 7.09 / 7.37 on accent       |
| `accent-soft`     | `#f1e8fa` `oklch(94.3% 0.026 308.2)` | `#2f1d45` `oklch(27.5% 0.074 302.6)` |                             |
| `success`         | `#1a7548` `oklch(49.9% 0.110 156.3)` | `#6fd39c` `oklch(79.1% 0.124 157.8)` | 4.95 / 7.09 on success-soft |
| `success-soft`    | `#e8f1ed` `oklch(95.0% 0.011 167.8)` | `#283337` `oklch(31.3% 0.017 221.9)` |                             |
| `warning`         | `#965600` `oklch(51.6% 0.118 63.1)`  | `#f0b75a` `oklch(81.4% 0.128 77.5)`  | 5.03 / 7.10 on warning-soft |
| `warning-soft`    | `#f5eee6` `oklch(95.2% 0.013 71.3)`  | `#3c2f2d` `oklch(31.9% 0.019 28.4)`  |                             |
| `danger`          | `#c1264f` `oklch(53.5% 0.189 12.1)`  | `#ff8aa5` `oklch(76.8% 0.144 6.3)`   | 4.90 / 5.99 on danger-soft  |
| `danger-soft`     | `#f9e9ed` `oklch(94.8% 0.018 0.4)`   | `#3f2839` `oklch(31.2% 0.044 336.6)` |                             |
| `info`            | `#0f6fa8` `oklch(52.0% 0.120 242.8)` | `#7cc4f2` `oklch(79.0% 0.098 237.8)` | 4.74 / 6.80 on info-soft    |
| `info-soft`       | `#e7f1f6` `oklch(95.2% 0.013 228.9)` | `#2a3145` `oklch(31.6% 0.037 269.3)` |                             |
| `chrome`          | `#ffffff` `oklch(100.0% 0.000 0)`    | `#1a1524` `oklch(20.9% 0.030 299.1)` |                             |
| `chrome-text`     | `#1d1530` `oklch(22.1% 0.052 295.5)` | `#efeaf7` `oklch(94.5% 0.018 303.4)` | 17.47 / 15.11 on chrome     |
| `chrome-muted`    | `#554b6b` `oklch(43.6% 0.053 298.5)` | `#bdb3d0` `oklch(78.4% 0.042 301.1)` | 8.06 / 8.94 on chrome       |
| `chrome-border`   | `#e7e2f2` `oklch(92.1% 0.022 300.2)` | `#342b44` `oklch(31.0% 0.045 300.3)` |                             |

Orchid also defines `accent-2` (light `#0e8a77`, dark `#5fd6bd`; ≥3:1 on surface) for a second
chart series.

## Keep list, as applied

- Desktop window with no page scroll; each region scrolls on its own.
- Title bar → top tabs (File, Data, Clean, Profile, Pipelines, Export) → ribbon → workspace.
- File backstage: left rail, Recent/Favourites, search, Import file, recent list with star.
- Data and Clean ribbons: same groups and commands, restyled only.
- Anchored, draggable popups with the footer actions on the right.
- Clean steps panel with step cards and enable switches.
- Profile functionality unchanged; it moves onto these components (no native buttons or selects).

## Rejected, and why (feeds "never look like")

- **Ledger shape**: 4px radius, regular 32px density and accent-coloured ribbon icons were too
  soft and generic next to Graphite. Its palette survives as a colour theme and its worksheet was
  adopted.
- **Paper**: serif headings, the layered "desk" and 6px radius read as editorial, not as a tool.
  Its palette survives as a colour theme.
- **Orchid**: pill tabs and buttons, the floating rounded worksheet card, springy motion and the
  rounded Figtree type were too soft. Its palette, which keeps Forma's purple, survives as a colour
  theme.
- **Graphite worksheet**: 26px rows with vertical column lines were too dense and grid-heavy;
  Ledger's 30px hairline grid replaces it.
- **Never**: rounded or pill shapes; card shadows; gradients or glass; serif type; coloured
  ribbon icons; an Excel-style letter row or green cell; native OS buttons or selects; accent
  colour on body text or headers; animation that moves things.
