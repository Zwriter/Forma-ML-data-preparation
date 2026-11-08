import { create } from 'zustand';

/** What the Profile content area shows: the dashboard or one ribbon tool. */
export type ProfileTool =
  | 'dashboard'
  | 'column_details'
  | 'data_quality'
  | 'distribution'
  | 'duplicates'
  | 'patterns'
  | 'anomalies'
  | 'recommendations'
  | 'creations';

/** The engine tool behind a request (contracts/ipc.md); Recommendations and Creations share one. */
export type ToolKey =
  | 'column_detail'
  | 'rows'
  | 'distribution'
  | 'duplicates'
  | 'patterns'
  | 'anomalies'
  | 'suggestions';

export type ToolError = { code: string; message: string };

export type ToolEntry = {
  /** Identifies the request (method, parameters, data version) the entry belongs to. */
  requestKey: string;
  dataVersion: string;
  status: 'running' | 'ready' | 'failed';
  jobId: string | null;
  progress: number | null;
  message: string | null;
  /** The last finished result; kept while a newer request runs. */
  result: unknown;
  error: ToolError | null;
};

type Inputs = Partial<Record<ProfileTool, Record<string, unknown>>>;

type ToolState = {
  /** The dataset the tool state below belongs to. */
  datasetId: string | null;
  tool: ProfileTool;
  inputs: Inputs;
  results: Partial<Record<ToolKey, ToolEntry>>;
  /** Suggestion ids hidden per data version. */
  dismissed: Record<string, string[]>;
  autoRefresh: boolean;
  open: (tool: ProfileTool) => void;
  close: () => void;
  setInput: (tool: ProfileTool, key: string, value: unknown) => void;
  start: (key: ToolKey, requestKey: string, dataVersion: string, jobId: string) => void;
  rename: (jobId: string, engineJobId: string) => void;
  progress: (jobId: string, progress: number, message: string) => void;
  complete: (jobId: string, result: unknown) => void;
  fail: (jobId: string, error: ToolError) => void;
  cancel: (jobId: string) => void;
  dismiss: (dataVersion: string, id: string) => void;
  setAutoRefresh: (on: boolean) => void;
  /** Back to the dashboard with nothing remembered, e.g. when another file opens. */
  reset: () => void;
  /** Resets when the Profile tab now shows a different dataset. */
  showFor: (datasetId: string | null) => void;
};

export const AUTO_REFRESH_KEY = 'forma.profile-auto-refresh';

export function readAutoRefresh() {
  try {
    return window.localStorage.getItem(AUTO_REFRESH_KEY) === 'true';
  } catch {
    return false;
  }
}

function saveAutoRefresh(on: boolean) {
  try {
    window.localStorage.setItem(AUTO_REFRESH_KEY, String(on));
  } catch {
    // Blocked storage only loses the preference for the next session.
  }
}

export const initialToolState = () => ({
  datasetId: null as string | null,
  tool: 'dashboard' as ProfileTool,
  inputs: {},
  results: {},
  dismissed: {},
  autoRefresh: readAutoRefresh(),
});

export const useProfileToolStore = create<ToolState>()((set) => {
  /** Applies `change` to the entry running `jobId`; other jobs are ignored. */
  const update = (jobId: string, change: (entry: ToolEntry) => Partial<ToolEntry>) =>
    set((state) => {
      const found = Object.entries(state.results).find(([, entry]) => entry?.jobId === jobId);
      if (!found) return state;
      const [key, entry] = found as [ToolKey, ToolEntry];
      return { results: { ...state.results, [key]: { ...entry, ...change(entry) } } };
    });
  const finished = { jobId: null, progress: null, message: null };

  return {
    ...initialToolState(),
    open: (tool) => set({ tool }),
    close: () => set({ tool: 'dashboard' }),
    setInput: (tool, key, value) =>
      set((state) => ({
        inputs: { ...state.inputs, [tool]: { ...state.inputs[tool], [key]: value } },
      })),
    start: (key, requestKey, dataVersion, jobId) =>
      set((state) => ({
        results: {
          ...state.results,
          [key]: {
            result: state.results[key]?.result ?? null,
            requestKey,
            dataVersion,
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
    complete: (jobId, result) => update(jobId, () => ({ ...finished, status: 'ready', result })),
    fail: (jobId, error) =>
      update(jobId, () => ({ ...finished, status: 'failed', result: null, error })),
    cancel: (jobId) => update(jobId, () => ({ ...finished, status: 'ready' })),
    dismiss: (dataVersion, id) =>
      set((state) => ({
        dismissed: {
          ...state.dismissed,
          [dataVersion]: [...(state.dismissed[dataVersion] ?? []), id],
        },
      })),
    setAutoRefresh: (autoRefresh) => {
      saveAutoRefresh(autoRefresh);
      set({ autoRefresh });
    },
    reset: () =>
      set((state) => ({
        ...initialToolState(),
        datasetId: state.datasetId,
        autoRefresh: state.autoRefresh,
      })),
    showFor: (datasetId) =>
      set((state) =>
        state.datasetId === datasetId
          ? state
          : { ...initialToolState(), datasetId, autoRefresh: state.autoRefresh },
      ),
  };
});
