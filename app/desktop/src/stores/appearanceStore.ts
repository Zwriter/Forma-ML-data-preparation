import { create } from 'zustand';
import {
  applyAppearance,
  type ColorMode,
  type ColorTheme,
  DARK_QUERY,
  DEFAULT_APPEARANCE,
  MODE_KEY,
  prefersDark,
  readAppearance,
  resolveMode,
  THEME_KEY,
} from '../services/appearance';

type AppearanceState = {
  theme: ColorTheme;
  mode: ColorMode;
  setTheme: (theme: ColorTheme) => void;
  setMode: (mode: ColorMode) => void;
};

function initialAppearance() {
  try {
    return readAppearance(window.localStorage);
  } catch {
    return DEFAULT_APPEARANCE;
  }
}

function save(key: string, value: string) {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // Keep the choice for this session if storage is unavailable.
  }
}

function apply(theme: ColorTheme, mode: ColorMode) {
  applyAppearance(document.documentElement, theme, resolveMode(mode, prefersDark()));
}

export const useAppearanceStore = create<AppearanceState>((set, get) => ({
  ...initialAppearance(),
  setTheme: (theme) => {
    set({ theme });
    save(THEME_KEY, theme);
    apply(theme, get().mode);
  },
  setMode: (mode) => {
    set({ mode });
    save(MODE_KEY, mode);
    apply(get().theme, mode);
  },
}));

/**
 * Applies the saved appearance before the first render and follows OS mode changes while the
 * mode is "system". Call once at startup.
 */
export function startAppearance() {
  const { theme, mode } = useAppearanceStore.getState();
  apply(theme, mode);
  if (typeof window.matchMedia !== 'function') return;
  window.matchMedia(DARK_QUERY).addEventListener('change', () => {
    const state = useAppearanceStore.getState();
    if (state.mode === 'system') apply(state.theme, state.mode);
  });
}
