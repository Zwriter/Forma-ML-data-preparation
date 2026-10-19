import { create } from 'zustand';

export type SaveBehavior = 'replace' | 'copy';
const SAVE_BEHAVIOR_KEY = 'forma.save-behavior';

function readSaveBehavior(): SaveBehavior {
  try {
    return window.localStorage.getItem(SAVE_BEHAVIOR_KEY) === 'copy' ? 'copy' : 'replace';
  } catch {
    return 'replace';
  }
}

type SettingsState = {
  saveBehavior: SaveBehavior;
  setSaveBehavior: (behavior: SaveBehavior) => void;
};

export const useSettingsStore = create<SettingsState>((set) => ({
  saveBehavior: readSaveBehavior(),
  setSaveBehavior: (saveBehavior) => {
    set({ saveBehavior });
    try {
      window.localStorage.setItem(SAVE_BEHAVIOR_KEY, saveBehavior);
    } catch {
      // Keep the setting for this session if browser storage is unavailable.
    }
  },
}));
