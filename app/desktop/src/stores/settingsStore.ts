import { create } from 'zustand';
import { clampPageSize, DEFAULT_PAGE_SIZE } from '../services/pageSize';

export type SaveBehavior = 'replace' | 'copy';
export const MIN_HISTORY_ACTIONS = 1;
export const MAX_HISTORY_ACTIONS = 100;
export const DEFAULT_HISTORY_ACTIONS = 10;
const SAVE_BEHAVIOR_KEY = 'forma.save-behavior';
const HISTORY_LIMIT_KEY = 'forma.history-limit';
const PAGE_SIZE_KEY = 'forma.page-size';

function readSaveBehavior(): SaveBehavior {
  try {
    // Saving a copy is the default so the source file is never replaced unless chosen.
    return window.localStorage.getItem(SAVE_BEHAVIOR_KEY) === 'replace' ? 'replace' : 'copy';
  } catch {
    return 'copy';
  }
}

function clampHistoryLimit(limit: number): number {
  if (!Number.isFinite(limit)) return DEFAULT_HISTORY_ACTIONS;
  return Math.min(MAX_HISTORY_ACTIONS, Math.max(MIN_HISTORY_ACTIONS, Math.trunc(limit)));
}

/** A saved positive number, clamped; the fallback when missing or unreadable. */
function readNumber(key: string, fallback: number, clamp: (value: number) => number): number {
  try {
    const saved = Number(window.localStorage.getItem(key));
    return Number.isFinite(saved) && saved > 0 ? clamp(saved) : fallback;
  } catch {
    return fallback;
  }
}

function writeSetting(key: string, value: string) {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // Keep the setting for this session if browser storage is unavailable.
  }
}

type SettingsState = {
  saveBehavior: SaveBehavior;
  setSaveBehavior: (behavior: SaveBehavior) => void;
  historyLimit: number;
  setHistoryLimit: (limit: number) => void;
  /** Rows per worksheet page for files as they open. */
  pageSize: number;
  setPageSize: (size: number) => void;
};

export const useSettingsStore = create<SettingsState>((set) => ({
  saveBehavior: readSaveBehavior(),
  historyLimit: readNumber(HISTORY_LIMIT_KEY, DEFAULT_HISTORY_ACTIONS, clampHistoryLimit),
  pageSize: readNumber(PAGE_SIZE_KEY, DEFAULT_PAGE_SIZE, clampPageSize),
  setSaveBehavior: (saveBehavior) => {
    set({ saveBehavior });
    writeSetting(SAVE_BEHAVIOR_KEY, saveBehavior);
  },
  setHistoryLimit: (limit) => {
    const historyLimit = clampHistoryLimit(limit);
    set({ historyLimit });
    writeSetting(HISTORY_LIMIT_KEY, String(historyLimit));
  },
  setPageSize: (size) => {
    const pageSize = clampPageSize(Number.isFinite(size) ? size : DEFAULT_PAGE_SIZE);
    set({ pageSize });
    writeSetting(PAGE_SIZE_KEY, String(pageSize));
  },
}));
