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
};

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
  };
});
