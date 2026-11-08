# UI Audit — Forma

Audited 2026-11-08 on branch `005-data-profile`. Screenshots of the current UI are in
`design/before/` (1440×900 unless noted).

| File                       | Screen                                                        |
| -------------------------- | ------------------------------------------------------------- |
| `01-file.png`              | File backstage (Import / recent files)                        |
| `02-data-worksheet.png`    | Data tab: ribbon + worksheet (the most representative screen) |
| `03-clean.png`             | Clean tab: ribbon + worksheet                                 |
| `04-profile.png`           | Profile tab dashboard                                         |
| `05-data-dialog.png`       | Filter rows popup (Data ribbon)                               |
| `06-data-800x600.png`      | Data tab at the minimum supported window size                 |
| `07-clean-step-dialog.png` | Replace values step popup (Clean ribbon)                      |

## Stack

- **Shell**: Tauri 2 desktop window with a custom titlebar (`WorkspaceTitlebar.tsx`, window controls
  drawn in CSS). The body uses `overflow: hidden`: there is no page scrolling, and each region scrolls
  on its own.
- **UI**: React 18 + Zustand. No component library.
- **Styling**: plain global CSS, 29 files in `app/desktop/src/styles/` (3,970 lines), imported
  globally. No Tailwind, no CSS modules, no CSS-in-JS.
- **Tokens**: 6 custom properties on `:root` in `globals.css` (`--ink --muted --line --surface
--purple --purple-soft`) plus 4 status tokens declared locally in `profile.css`
  (`--good --warning --alert --track`).
- **Dark mode**: none. No `prefers-color-scheme` and no theme switch.
- **Icons**: one in-house `components/Icon.tsx` (stroke icons, purple).
- **Navigation**: Office-style. Title bar with document tabs → top tabs (File, Data, Clean, Profile,
  Pipelines, Export) → a ribbon per tab with labelled groups → main area. File opens a backstage
  view with a left navigation column (Import, Settings).

## Current tokens

### Colors: 242 hex literals, 112 distinct values; tokens used 199 times

| Role              | Token / value                                                                                                                                                                                                                                                                                                           | Notes                                                        |
| ----------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------ |
| App background    | `#f7f8fb` (10 uses, hardcoded)                                                                                                                                                                                                                                                                                          | not a token                                                  |
| Surface           | `--surface #ffffff`, plus `#fff` ×38, `#ffffff` ×2                                                                                                                                                                                                                                                                      | 3 spellings of white                                         |
| Subtle surfaces   | `#fbfcfe #f8f9fc #f5f6fa #f1f2f6 #f0f1f6 #eef0f5 #edf0f5 #edf0f3 #f4f3f8` …                                                                                                                                                                                                                                             | **~14 near-white grays** within 2–3% lightness of each other |
| Text              | `--ink #17213f` (token) and 7 hardcoded copies of `#17213f`, plus `#1f2a48 #243252 #293653 #2f… #34415f #35415c #39445e #394663 #39435d #3c4864 #3d4966 #43506e #45526e #4b5875 #4c5874`                                                                                                                                | **~16 dark navy-grays** used as text                         |
| Muted text        | `--muted #697590` and `#59647d #5f6b85 #5f6b7d #606b80 #64718b #66728b #687590 #6b7690 #74809a #77829a #7b8498 #7b869b #8791a4 #8a94a9 #8b95a9`                                                                                                                                                                         | **~16 mid-grays**, several fail contrast                     |
| Borders           | `--line #e0e4ed` and `#d4d9e4 ×7 #cbd1dd ×7 #e3e7ef ×5 #d9deea #dfe3ec #e4e7ef #e5e8ef #e6e8ef #e7eaf2 #e8eaf0 #e9edf5 #cfd5e1 #cfd4df #c9d0d9 #c9cfdb #d6dbe2 #b9c1d0`                                                                                                                                                 | **~20 border grays**                                         |
| Accent            | `--purple #8b2fba`, `--purple-soft #f0edff`, plus `#f4f3ff #f7f7ff #f0efff #edecff #ece9ff #e9e5fb #f4f2fd #f8f3fc #d9d3f7 #c7a3d8 #b66bd1 #bc8bd2 #8b2fba20`                                                                                                                                                           | ~11 purple tints, mostly one-offs                            |
| Secondary accents | `#2f5fb3` (blue: sort state), `#217346` (Excel green: active cell outline), `#d69a16` (favourite star)                                                                                                                                                                                                                  | each used in one place only                                  |
| Status            | `--good #1e8e4f`, `--warning #b86e00`, `--alert #c4314b` (Profile only); error banner `#9a2f34 / #fff0f0 / #f2c9cb`; other reds `#a83038 #a12622 #7a3036 #c42b1c #e0a3a6 #fde8ec #fdf2f4 #fdecef #fbe5ea #f7d3dc`; warnings `#fff4e0 #fff8e6 #e8c77a #8a6d1f #6b4a00`; greens `#2f8a4a #1d6f38 #e9f6ec #e6f4ec #f3faf5` | status colors redefined per feature                          |
| Shadow tint       | `#1c2d4b` at 8 alphas, `rgb(18 16 28 / …)` ×3                                                                                                                                                                                                                                                                           | two different shadow bases                                   |

### Typography

- Family: `'Segoe UI', Arial, sans-serif` (one declaration, inherited). No monospace or tabular
  figures for numeric cells.
- **18 font sizes**: 9, 10, 11, 12 (×44), 13 (×24), 14, 15, 16, 17, 18, 19, 20, 21, 22, 24, 25, 26,
  plus `clamp(24px, 2vw, 31px)`. There is no type scale: 17/18/19 and 24/25/26 are all used.
- **Weights**: 400, 500, 600 (×19), 650 (×4), 700.
- Line height and letter spacing are mostly left at browser defaults.

### Spacing

- No scale. `gap` alone has 26 distinct values: 0, 2, 3, 4, 5, 6, 7, 8, 9, 10, 12, 13, 14, 16, 18px
  **and** 0.25, 0.3, 0.35, 0.4, 0.5, 0.55, 0.65, 0.75rem.
- `padding` has 40+ distinct shorthands (`8px 10px`, `7px 9px`, `5px 9px`, `6px 9px`, `9px 12px`…).
- px and rem are mixed: 5 files use rem (`cleaning`, `menu-button`, `step-form`,
  `workspace-content-dialogs`, `workspace-content-selection`); the rest use px.

### Radius

- **13 values**: 0, 2, 3, 4, 5 (×11), 6 (×14), 7 (×8), 8 (×12), 9 (×7), 10, 12, 18, 999px, 50%.

### Elevation

- 14 different `box-shadow` declarations: `0 2px 8px`, `0 6px 18px`, `0 8px 24px`, `0 8px 28px`,
  `0 14px 34px`, `0 0.5rem 1.5rem`, `0 1rem 3rem`, with two different shadow colors.
  There are no elevation levels.

### Motion

- 1 transition (`translate 0.15s`), 1 animation (`notification-enter 160ms ease-out`). Hover and
  focus changes are instant. `prefers-reduced-motion` is respected once.

### Breakpoints

- 900, 1000, 760, 620, 500px, spread across 7 media queries in 5 files.

## Components inventory

| Component                 | Implementation                                                                                 | Variants / notes                                                                                                                                                                                                                                                    |
| ------------------------- | ---------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Title bar + document tabs | `WorkspaceTitlebar.tsx`, `workspace-shell.css`                                                 | custom window controls; close hover `#c42b1c`                                                                                                                                                                                                                       |
| Top tabs                  | `.top-tabs a`, `workspace-navigation.css`                                                      | underline active state (`::after`, purple)                                                                                                                                                                                                                          |
| Ribbon                    | `workspace-ribbon.css`, `ribbonCommands.ts`, `profileRibbon.ts`                                | shared across Data / Clean / Profile, consistent. Icon over label with group captions                                                                                                                                                                               |
| File backstage            | `FileBackstage.tsx`, `workspace-file.css`                                                      | left rail with active pill and inset bar, recent/favourites segmented filter                                                                                                                                                                                        |
| Worksheet                 | `DatasetPreview.tsx`, `ColumnHeading.tsx`, `explorer-table.css`                                | Excel-style column letters (A–F) above named headers, row numbers starting at 2, Excel-green active cell outline, stacked ▲▼ sort arrows, name box (`A2`)                                                                                                           |
| Worksheet toolbar         | `explorer-toolbar.css`                                                                         | name box, search, "6 of 6 columns visible" text **and** "6 visible / 6 columns" chip (same fact twice), "30 rows" chip, "CSV" chip, Columns button                                                                                                                  |
| Pager                     | `TablePager.tsx`                                                                               | native `<select>`, purple page pill                                                                                                                                                                                                                                 |
| Buttons                   | **no shared Button component**                                                                 | `.quiet-button` (16 uses), `.profile-link-button`, `.profile-icon-button`, `.menu-button`, `.file-primary-action`, plus ~35 contextual `X button {}` selectors that each restyle `<button>`. Some Profile buttons are left unstyled and render as native OS buttons |
| Inputs / selects          | no shared component                                                                            | each feature styles its own (`.search-box input`, `.open-panel input`, `.column-selector-search input`, `.data-operation-dialog input`, …). Profile toolbar selects are native                                                                                      |
| Popups / dialogs          | `DataOperationDialog`, `StepFormDialog`, `SaveConfirmDialog`, `ToolView`, `MissingValuesPanel` | anchored, draggable popups (`useDraggablePopups`). Data and Clean popups match each other; Profile tool popups use separate CSS                                                                                                                                     |
| Inline tabs               | `.inspector-tabs`, `.steps-panel-tab`, `.recent-file-filters`                                  | 3 different tab styles                                                                                                                                                                                                                                              |
| Cards / panels            | `.card` (globals), Profile summary cards, quality, chart panels                                | Profile panels are dividers inside one surface, not cards                                                                                                                                                                                                           |
| Status pills              | `.profile-table` "Good" / "Needs attention"                                                    | Profile only                                                                                                                                                                                                                                                        |
| Toasts                    | `NotificationPopup.tsx`                                                                        | one style                                                                                                                                                                                                                                                           |
| Steps panel               | `StepsPanel`, `StepCard`, `StepList` (Clean)                                                   | collapsible right panel, switch toggles                                                                                                                                                                                                                             |
| Charts                    | `features/profiling/charts` (SVG)                                                              | flat purple bars, green ring gauge                                                                                                                                                                                                                                  |
| Empty states              | backstage list only                                                                            | worksheet/profile have none                                                                                                                                                                                                                                         |

## Problems (ranked)

1. **The Profile tab is visually off-system.** `ProfileHeader.tsx:46,81` and the column-row `…`
   and gear buttons are unstyled native buttons ("Generate report" looks like Windows 95 next to the
   purple ribbon). The selects (`All types`, `All quality`, chart pickers) are native. The page title
   "Data profile" is the only large in-content heading in the app. Chart purple is a third purple
   tint. See `04-profile.png`.
2. **No real token system.** 112 distinct colors with only 10 tokens, used 199 times against 242
   literals. About 16 text grays, 16 muted grays and 20 border grays exist where 2–3 of each would do.
   A theme change today means editing all 29 CSS files.
3. **No shared Button / Input / Select / Tabs components.** About 40 selectors restyle `<button>`
   by context. This is the main source of the "UI inconsistency" the user reported: button height,
   radius and border differ between the File backstage, Data popups, Clean steps panel and Profile.
4. **The worksheet looks dated.** It copies Excel literally (`explorer-table.css`): an A/B/C letter
   row stacked on top of the real header, an Excel-green active-cell outline (`#217346`,
   `explorer-table.css:66`) that clashes with the purple accent, tiny stacked ▲▼ arrows on every
   column, a blue sort color (`#2f5fb3`) used nowhere else, 30px rows with full grid lines, and a
   type label at 10–11px gray. The toolbar repeats the visible-column count twice
   (`explorer-toolbar.css`, `06-data-800x600.png`).
5. **Contrast failures (WCAG AA)**, measured:
   | Pair | Ratio | Needs | Where |
   | --- | --- | --- | --- |
   | `#9aa3b5` on white | 2.54 | 3.0 (UI) | drag grip `workspace-content-selection.css:23`, "missing" legend `profile-quality.css:30` |
   | `#8b95a9` on white | 3.01 | 4.5 | search placeholder `explorer-toolbar.css:66` |
   | `#8791a4` on white | 3.17 | 4.5 | `.sample-note` `inspector.css:64,119` |
   | `#7b869b` on white | 3.67 | 4.5 | column type label `explorer-table.css:119` |
   | `#d69a16` on white | 2.47 | 3.0 | favourite star `workspace-file.css:208` |
   | focus ring `#bc8bd2` on white | 2.71 | 3.0 | every focusable control `globals.css:55` |
   | `--warning #b86e00` on white | 3.99 | 4.5 | "Needs attention" text, Profile |
   | `--good #1e8e4f` on white | 4.17 | 4.5 | "Good" text, Profile |
   | `--muted #697590` on `#f0edff` | 4.02 | 4.5 | muted text on purple-soft (selected rows/rail) |
   | `--muted` on app bg `#f7f8fb` | 4.35 | 4.5 | muted text on page background |
   | input border `#cbd1dd` on white | 1.53 | 3.0 | text inputs and selects |

   Passing: ink on bg 14.9, purple on white 6.5, white on purple 6.5, alert 5.4, error banner 6.7.

6. **Inconsistent type and spacing steps.** 18 font sizes, 13 radii, 26 gap values and mixed px/rem,
   so sibling surfaces never quite line up (popup padding vs ribbon padding vs backstage padding).
7. **Elevation is ad hoc.** 14 shadow recipes with 2 shadow colors, and popups vs toasts vs cards
   have no defined levels.
8. **No dark mode.** Every color is a literal or a light-only token.
9. **Sparse interaction feedback.** Almost no hover/press transitions, and the focus ring fails 3:1.
10. **Wasted vertical space in the ribbon.** About 108px tall with group captions, while the window has
    no page scroll. The worksheet gets about 600px at 1440×900 and about 330px at 800×600.

## Keep list

Confirmed with the user on 2026-11-08. "Keep" means **structure and behaviour**. These parts still
get the new theme (colours, type, buttons, inputs, radius, elevation).

- **App frame**: a desktop window with no page scrolling, where each region scrolls on its own.
  Custom title bar with document tabs, Saved indicator and window controls.
- **Navigation pattern**: title bar → top tabs (File, Data, Clean, Profile, Pipelines, Export) →
  a ribbon per tab → workspace. Tab order and the File-as-backstage behaviour stay.
- **File tab (backstage)**: left rail (Import / Settings, back arrow), recent and favourites
  filter, search, Import file primary action, recent-file list with favourite star.
- **Data tab ribbon**: groups and commands as they are (File: Save/Undo/Redo, Table: Select
  columns/Filter row/Sort, Reshape: Group by/Pivot/Unpivot), with icon-over-label buttons and
  group captions.
- **Clean tab ribbon**: groups and commands as they are (Transform: Convert/Replace/Fill,
  Combine: Split/Merge, Columns and rows: Remove/Rename), plus the collapsible steps panel with
  step cards and enable switches.
- **Anchored, draggable popups** that open under the ribbon button (Filter rows, Replace values,
  and the rest), with Cancel + primary action in the footer.
- **Profile tab functionality**: Refresh, auto-refresh, Generate report, summary counts, data
  quality, missing values, distribution and categorical charts, the column table with filters and
  per-column actions, and the ribbon tools (Data quality, Distribution, Duplicates, Creations,
  Patterns, Anomalies, Recommendations).
- **Worksheet behaviour**: active cell, keyboard navigation, column sort, search, column
  visibility, pager / rows per page. Only the presentation changes.

## Change list

- **Theme: open to a new accent.** Purple is _not_ locked. The themes step should show 3–4
  clearly different directions, at least one of which keeps purple for comparison. Rebuild
  neutrals into a small set (about 2 text, 1 muted, 2 border, 3 surface levels), fold the scattered
  status colours into one set, and define elevation levels and a type/spacing/radius scale.
- **Worksheet → modern data grid.** Remove the A/B/C letter row and the Excel-green active cell
  (use the accent instead). One header row with a type icon and name, sort shown on hover and
  when active, lighter row separators instead of a full grid, numbers right-aligned with tabular
  figures. Merge the duplicated "N of N columns visible" text and chip. Decide whether the name box
  (`A2`) still earns its space once letters are gone.
- **Profile tab UI**: bring it onto the system with themed buttons and selects instead of native
  ones, consistent panel headers, chart colours from the theme, and status pills that pass contrast.
- **Consistency**: one Button (primary / secondary / quiet / icon), Input, Select, Checkbox,
  Switch, Segmented/Tabs and Popup component used by every tab.
- **Accessibility**: fix every failing pair in Problem 5. The focus ring must reach 3:1 and input
  borders 3:1.
- **Dark mode**: not requested. Keep it possible by defining all colours as tokens.
- Not yet decided: whether the ribbon gets more compact (Problem 10) and what Pipelines/Export
  look like (not inspected; placeholders).

## References

- **Aim for: Office / Excel (familiar).** Keep the Microsoft 365 / Fluent ribbon-and-backstage
  mental model so it stays familiar to spreadsheet users.
- **Aim for: Notion / Airtable (soft).** Airy, friendly, softer chrome and a lighter grid, as in an
  Airtable-style data grid.
- The two are combined: a familiar Office structure with soft Notion/Airtable styling.
- Avoid: the current literal Excel copy in the worksheet (letter row, green cell) and native OS
  controls that are not themed.

## Resolution (migration, 2026-11-08)

Screenshots after migration: `design/after/` (Graphite light/dark, plus Ledger, Paper, Orchid and
800×600). Rules: `DESIGN_RULES.md`. Tokens: `app/desktop/src/styles/tokens/`.

| #   | Problem                                         | Status                                                                                                                                                                                                                                                                                                                                 |
| --- | ----------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Profile tab off-system (native buttons/selects) | **Resolved.** Header, tools, suggestions and column actions use shared `btn` variants; selects use the shared field style; status, chart and quality colours come from tokens.                                                                                                                                                         |
| 2   | No token system (112 colours)                   | **Resolved.** 0 hex/rgb literals outside `src/styles/tokens/`; 25 colour roles × 4 themes × 2 modes, contrast enforced by `tests/unit/styles/designTokens.test.ts`.                                                                                                                                                                    |
| 3   | No shared Button / Input / Select / Tabs        | **Resolved.** `styles/components/` (button, field, segmented, setting-group). `quiet-button`, `profile-link-button`, `toolbar-link`, `file-primary-action` and per-feature `X button {}` restyles were removed. A few sub-components keep their own button styling on purpose: sort arrows, pager, inline tabs, window controls, rail. |
| 4   | Worksheet looks dated                           | **Resolved.** Letter row, name box, Excel-green cell, stacked ▲▼, blue sort colour and duplicate column count removed; Ledger grid (30px rows, hairlines, mono right-aligned numbers, type icons, hover sort arrows). Row numbers now start at 1.                                                                                      |
| 5   | Contrast failures                               | **Resolved.** Every failing pair replaced by tokens that pass AA (focus ring = accent, input borders = `border-strong`, placeholders/captions = `text-subtle` ≥ 4.5:1).                                                                                                                                                                |
| 6   | 18 font sizes, 13 radii, 26 gaps                | **Resolved.** 7 type roles, 3 radii, 9 spacing steps. Remaining px values are layout sizes, listed in DESIGN_RULES.md §12.                                                                                                                                                                                                             |
| 7   | 14 ad hoc shadows                               | **Resolved.** One `--shadow-popup` (light/dark), everything else flat with borders.                                                                                                                                                                                                                                                    |
| 8   | No dark mode                                    | **Resolved.** System/Light/Dark plus 4 colour themes in File › Settings › Appearance (`appearanceStore`, applied before first render).                                                                                                                                                                                                 |
| 9   | Sparse interaction feedback                     | **Resolved.** Hover/focus colour transitions at `--duration-fast`; reduced motion respected; no moving animation.                                                                                                                                                                                                                      |
| 10  | Tall ribbon                                     | **Improved.** Ribbon is about 76px (was about 108px): compact buttons, mono captions.                                                                                                                                                                                                                                                  |

Open items: Pipelines and Export tabs were not redesigned (placeholders). Fonts are bundled through
`@fontsource` and the Tauri CSP now allows only `font-src 'self'`.
