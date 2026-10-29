import { create } from 'zustand';
import type { HistoryMetadata } from '../types/dataset';
import type { SaveStatus } from '../types/dataOperations';
export type WorkspaceNotification = {
  id: number;
  kind: 'error';
  message: string;
};
type State = {
  busy: boolean;
  error: string | null;
  notification: WorkspaceNotification | null;
  history: HistoryMetadata | null;
  saveStatus: SaveStatus;
  commands: { save?: () => Promise<void>; undo?: () => Promise<void>; redo?: () => Promise<void> };
  setBusy: (busy: boolean) => void;
  setError: (error: string | null) => void;
  dismissNotification: () => void;
  setHistory: (history: HistoryMetadata | null) => void;
  setSaveStatus: (status: SaveStatus) => void;
  setCommands: (commands: State['commands']) => void;
  save: () => Promise<void>;
  undo: () => Promise<void>;
  redo: () => Promise<void>;
};
export const useWorkspaceStore = create<State>((set, get) => ({
  busy: false,
  error: null,
  notification: null,
  history: null,
  saveStatus: 'idle',
  commands: {},
  setBusy: (busy) => set({ busy }),
  setError: (error) =>
    set((state) => {
      if (error)
        return {
          error,
          notification: { id: (state.notification?.id ?? 0) + 1, kind: 'error', message: error },
        };
      return {
        error,
        ...(state.notification?.kind === 'error' ? { notification: null } : {}),
      };
    }),
  dismissNotification: () => set({ notification: null }),
  setHistory: (history) => set({ history, saveStatus: history?.is_dirty ? 'dirty' : 'saved' }),
  setSaveStatus: (saveStatus) => set({ saveStatus }),
  setCommands: (commands) => set({ commands }),
  save: async () => {
    await get().commands.save?.();
  },
  undo: async () => {
    await get().commands.undo?.();
  },
  redo: async () => {
    await get().commands.redo?.();
  },
}));
