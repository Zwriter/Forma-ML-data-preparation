import { create } from 'zustand';
import type { Profile } from '../types/profile';

export type ProfileEntry = {
  profile: Profile | null;
  status: 'idle' | 'running' | 'ready' | 'failed';
  jobId: string | null;
  progress: number | null;
  message: string | null;
  error: { code: string; message: string } | null;
};

type ProfileState = {
  /** One entry per history, so a profile survives tab switches within a session. */
  entries: Record<string, ProfileEntry>;
  start: (historyId: string, jobId: string) => void;
  /** Swaps a placeholder id for the engine's job id once the request is acknowledged. */
  rename: (jobId: string, engineJobId: string) => void;
  progress: (jobId: string, progress: number, message: string) => void;
  complete: (jobId: string, profile: Profile) => void;
  fail: (jobId: string, error: ProfileEntry['error']) => void;
  cancel: (jobId: string) => void;
  /** Optional Columns-table columns the user hid; remembered across sessions. */
  hiddenColumns: OptionalColumn[];
  toggleColumn: (column: OptionalColumn) => void;
  /** The column each chart shows, per history, for this session. */
  chartColumns: Record<string, Partial<Record<ChartKind, string>>>;
  pickChartColumn: (historyId: string, chart: ChartKind, column: string) => void;
  /** The invalid-rows export running in the background, if any. */
  exportJobId: string | null;
  setExportJob: (jobId: string | null) => void;
};

export type ChartKind = 'distribution' | 'category';

export const OPTIONAL_COLUMNS = [
  'type',
  'completeness',
  'unique',
  'quality',
  'missing',
  'examples',
] as const;
export type OptionalColumn = (typeof OPTIONAL_COLUMNS)[number];
export const PROFILE_COLUMNS_KEY = 'forma.profile-columns';

export function readHiddenColumns(): OptionalColumn[] {
  try {
    const saved: unknown = JSON.parse(window.localStorage.getItem(PROFILE_COLUMNS_KEY) ?? '[]');
    return Array.isArray(saved) ? OPTIONAL_COLUMNS.filter((column) => saved.includes(column)) : [];
  } catch {
    return [];
  }
}

function saveHiddenColumns(columns: OptionalColumn[]) {
  try {
    window.localStorage.setItem(PROFILE_COLUMNS_KEY, JSON.stringify(columns));
  } catch {
    // A blocked or full storage only loses the preference, never the table.
  }
}

const empty: ProfileEntry = {
  profile: null,
  status: 'idle',
  jobId: null,
  progress: null,
  message: null,
  error: null,
};

/** Staleness is derived, never stored: the profile's version vs the data's. */
export const isStale = (entry: ProfileEntry | undefined, dataVersion: string | undefined) =>
  Boolean(entry?.profile && entry.profile.data_version !== dataVersion);

export const useProfileStore = create<ProfileState>()((set) => {
  /** Applies `change` to the entry running `jobId`; events for other jobs are ignored. */
  const update = (jobId: string, change: (entry: ProfileEntry) => Partial<ProfileEntry>) =>
    set((state) => {
      const found = Object.entries(state.entries).find(([, entry]) => entry.jobId === jobId);
      if (!found) return state;
      const [historyId, entry] = found;
      return { entries: { ...state.entries, [historyId]: { ...entry, ...change(entry) } } };
    });
  const finished = { jobId: null, progress: null, message: null };

  return {
    entries: {},
    start: (historyId, jobId) =>
      set((state) => ({
        entries: {
          ...state.entries,
          [historyId]: {
            ...(state.entries[historyId] ?? empty),
            status: 'running',
            jobId,
            progress: 0,
            message: null,
            error: null,
          },
        },
      })),
    rename: (jobId, engineJobId) => update(jobId, () => ({ jobId: engineJobId })),
    progress: (jobId, progress, message) => update(jobId, () => ({ progress, message })),
    complete: (jobId, profile) =>
      update(jobId, () => ({ ...finished, profile, status: 'ready', error: null })),
    fail: (jobId, error) => update(jobId, () => ({ ...finished, status: 'failed', error })),
    cancel: (jobId) =>
      update(jobId, (entry) => ({ ...finished, status: entry.profile ? 'ready' : 'idle' })),
    hiddenColumns: readHiddenColumns(),
    toggleColumn: (column) =>
      set((state) => {
        const hiddenColumns = state.hiddenColumns.includes(column)
          ? state.hiddenColumns.filter((hidden) => hidden !== column)
          : OPTIONAL_COLUMNS.filter(
              (name) => name === column || state.hiddenColumns.includes(name),
            );
        saveHiddenColumns(hiddenColumns);
        return { hiddenColumns };
      }),
    chartColumns: {},
    pickChartColumn: (historyId, chart, column) =>
      set((state) => ({
        chartColumns: {
          ...state.chartColumns,
          [historyId]: { ...state.chartColumns[historyId], [chart]: column },
        },
      })),
    exportJobId: null,
    setExportJob: (exportJobId) => set({ exportJobId }),
  };
});
