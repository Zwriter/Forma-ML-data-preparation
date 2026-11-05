import { create } from 'zustand';
import type { SortKey } from '../types/dataOperations';

/** The sort view remembered per file, kept apart from the file's data. */
export const VIEWS_KEY = 'forma.sort-views';

type Views = Record<string, SortKey[]>;

const normalize = (path: string) => path.replace(/\\/g, '/');

const isSortKey = (key: unknown): key is SortKey =>
  typeof key === 'object' &&
  key !== null &&
  typeof (key as SortKey).column === 'string' &&
  ['ascending', 'descending'].includes((key as SortKey).direction) &&
  ['first', 'last'].includes((key as SortKey).nulls);

export function readViews(): Views {
  try {
    const parsed: unknown = JSON.parse(window.localStorage.getItem(VIEWS_KEY) ?? '{}');
    if (typeof parsed !== 'object' || parsed === null) return {};
    return Object.fromEntries(
      Object.entries(parsed).filter(
        (entry): entry is [string, SortKey[]] =>
          Array.isArray(entry[1]) && entry[1].every(isSortKey),
      ),
    );
  } catch {
    return {};
  }
}

type State = {
  views: Views;
  viewFor: (path: string) => SortKey[];
  remember: (paths: string[], view: SortKey[]) => void;
};

export const useViewMaskStore = create<State>((set, get) => ({
  views: readViews(),
  viewFor: (path) => get().views[normalize(path)] ?? [],
  remember: (paths, view) => {
    const views = { ...get().views };
    for (const path of paths) {
      if (view.length) views[normalize(path)] = view;
      else delete views[normalize(path)];
    }
    set({ views });
    try {
      window.localStorage.setItem(VIEWS_KEY, JSON.stringify(views));
    } catch {
      // Keep the views for this session if browser storage is unavailable.
    }
  },
}));
