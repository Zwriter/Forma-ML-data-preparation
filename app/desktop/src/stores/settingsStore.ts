import { create } from 'zustand';

export type SaveBehavior = 'replace' | 'copy';
export const MIN_HISTORY_ACTIONS = 1;
export const MAX_HISTORY_ACTIONS = 100;
export const DEFAULT_HISTORY_ACTIONS = 10;
const SAVE_BEHAVIOR_KEY = 'forma.save-behavior';
const HISTORY_LIMIT_KEY = 'forma.history-limit';

function readSaveBehavior(): SaveBehavior {
  try {
    return window.localStorage.getItem(SAVE_BEHAVIOR_KEY) === 'copy' ? 'copy' : 'replace';
  } catch {
    return 'replace';
  }
}

function clampHistoryLimit(limit: number): number {
  if (!Number.isFinite(limit)) return DEFAULT_HISTORY_ACTIONS;
  return Math.min(MAX_HISTORY_ACTIONS, Math.max(MIN_HISTORY_ACTIONS, Math.trunc(limit)));
}

function readHistoryLimit(): number {
  try {
    const saved = Number(window.localStorage.getItem(HISTORY_LIMIT_KEY));
    return Number.isFinite(saved) && saved > 0 ? clampHistoryLimit(saved) : DEFAULT_HISTORY_ACTIONS;
  } catch {
    return DEFAULT_HISTORY_ACTIONS;
  }
}

type SettingsState = {
  saveBehavior: SaveBehavior;
  setSaveBehavior: (behavior: SaveBehavior) => void;
  historyLimit: number;
  setHistoryLimit: (limit: number) => void;
};

export const useSettingsStore = create<SettingsState>((set) => ({
  saveBehavior: readSaveBehavior(),
  historyLimit: readHistoryLimit(),
  setSaveBehavior: (saveBehavior) => {
    set({ saveBehavior });
    try {
      window.localStorage.setItem(SAVE_BEHAVIOR_KEY, saveBehavior);
    } catch {
      // Keep the setting for this session if browser storage is unavailable.
    }
  },
  setHistoryLimit: (limit) => {
    const historyLimit = clampHistoryLimit(limit);
    set({ historyLimit });
    try {
      window.localStorage.setItem(HISTORY_LIMIT_KEY, String(historyLimit));
    } catch {
      // Keep the setting for this session if browser storage is unavailable.
    }
  },
}));
