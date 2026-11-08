/** Colour theme and mode: read from storage, resolve "system", and mark the document root. */
export const COLOR_THEMES = ['graphite', 'ledger', 'paper', 'orchid'] as const;
export type ColorTheme = (typeof COLOR_THEMES)[number];

export const COLOR_MODES = ['system', 'light', 'dark'] as const;
export type ColorMode = (typeof COLOR_MODES)[number];
export type ResolvedMode = 'light' | 'dark';

export const THEME_KEY = 'forma.color-theme';
export const MODE_KEY = 'forma.color-mode';
export const DARK_QUERY = '(prefers-color-scheme: dark)';

export type Appearance = { theme: ColorTheme; mode: ColorMode };
export const DEFAULT_APPEARANCE: Appearance = { theme: 'graphite', mode: 'system' };

function pick<T extends string>(value: string | null, allowed: readonly T[], fallback: T): T {
  return allowed.includes(value as T) ? (value as T) : fallback;
}

export function readAppearance(storage: Pick<Storage, 'getItem'>): Appearance {
  try {
    return {
      theme: pick(storage.getItem(THEME_KEY), COLOR_THEMES, DEFAULT_APPEARANCE.theme),
      mode: pick(storage.getItem(MODE_KEY), COLOR_MODES, DEFAULT_APPEARANCE.mode),
    };
  } catch {
    return DEFAULT_APPEARANCE;
  }
}

export function resolveMode(mode: ColorMode, prefersDark: boolean): ResolvedMode {
  if (mode === 'system') return prefersDark ? 'dark' : 'light';
  return mode;
}

export function prefersDark(): boolean {
  return typeof window.matchMedia === 'function' && window.matchMedia(DARK_QUERY).matches;
}

/** The token CSS keys off these attributes; light is the absence of data-mode. */
export function applyAppearance(root: HTMLElement, theme: ColorTheme, mode: ResolvedMode) {
  root.dataset.theme = theme;
  if (mode === 'dark') root.dataset.mode = 'dark';
  else delete root.dataset.mode;
}
