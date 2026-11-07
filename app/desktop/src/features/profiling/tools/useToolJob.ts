import { useEffect } from 'react';
import { request } from '../../../services/ipcClient';
import { useDatasetStore } from '../../../stores/datasetStore';
import { useProfileStore } from '../../../stores/profileStore';
import { useProfileToolStore, type ToolKey } from '../../../stores/profileToolStore';

type ToolAck = { job_id: string; state: string; result?: unknown };

type ToolJobEvent = {
  job_id: string;
  kind: string;
  state: string;
  progress?: number | null;
  message?: string;
  result?: unknown;
  error?: { code: string; message: string } | null;
};

/** Engine job kinds of the ribbon tools (contracts/ipc.md). */
export const TOOL_JOB_KINDS = new Set([
  'profile_column',
  'profile_rows',
  'profile_distribution',
  'profile_duplicates',
  'profile_patterns',
  'profile_anomalies',
  'profile_suggestions',
]);

/** Latest event per job that arrived before its request was acknowledged. */
const early = new Map<string, ToolJobEvent>();
/** Jobs replaced by a newer request; their late events must not touch the store. */
const abandoned = new Set<string>();
let sequence = 0;

const knows = (jobId: string) =>
  Object.values(useProfileToolStore.getState().results).some((entry) => entry?.jobId === jobId);

const errorOf = (cause: unknown) => ({
  code: 'INTERNAL_ERROR',
  message: cause instanceof Error ? cause.message : 'The tool could not run.',
});

/** The open dataset and data version, when its profile is current. */
function currentTarget() {
  const { dataset, history } = useDatasetStore.getState();
  if (!dataset || !history) return null;
  const profile = useProfileStore.getState().entries[history.history_id]?.profile;
  if (!profile || profile.data_version !== history.data_version) return null;
  return { datasetId: dataset.dataset_id, dataVersion: history.data_version };
}

const requestKeyOf = (method: string, params: object, dataVersion: string) =>
  JSON.stringify([method, params, dataVersion]);

async function runTool(key: ToolKey, method: string, params: Record<string, unknown>) {
  const target = currentTarget();
  if (!target) return;
  const store = useProfileToolStore.getState();
  const previous = store.results[key];
  if (previous?.status === 'running' && previous.jobId) {
    abandoned.add(previous.jobId);
    if (!previous.jobId.startsWith('request:'))
      void request('job.cancel', { job_id: previous.jobId }).catch(() => undefined);
  }
  const placeholder = `request:${key}:${++sequence}`;
  store.start(
    key,
    requestKeyOf(method, params, target.dataVersion),
    target.dataVersion,
    placeholder,
  );
  try {
    const ack = await request<ToolAck>(method, {
      dataset_id: target.datasetId,
      data_version: target.dataVersion,
      ...params,
    });
    if (abandoned.has(placeholder)) {
      // A newer request replaced this one before the engine answered: stop its job.
      abandoned.delete(placeholder);
      abandoned.add(ack.job_id);
      if (ack.state !== 'completed')
        void request('job.cancel', { job_id: ack.job_id }).catch(() => undefined);
      return;
    }
    store.rename(placeholder, ack.job_id);
    if (ack.state === 'completed') store.complete(ack.job_id, ack.result);
    const missed = early.get(ack.job_id);
    early.delete(ack.job_id);
    if (missed) applyToolEvent(missed);
  } catch (cause) {
    store.fail(placeholder, errorOf(cause));
  }
}

/** Runs one ribbon tool for the open dataset whenever its parameters or the (current)
 *  profile change; `params: null` means the tool is not ready to ask yet. */
export function useToolJob(key: ToolKey, method: string, params: Record<string, unknown> | null) {
  const entry = useProfileToolStore((state) => state.results[key]);
  const dataVersion = useDatasetStore((state) => state.history?.data_version);
  const historyId = useDatasetStore((state) => state.history?.history_id);
  const profileVersion = useProfileStore((state) =>
    historyId ? state.entries[historyId]?.profile?.data_version : undefined,
  );
  const paramsKey = params === null ? null : JSON.stringify(params);

  useEffect(() => {
    if (paramsKey === null || !dataVersion || profileVersion !== dataVersion) return;
    const parsed = JSON.parse(paramsKey) as Record<string, unknown>;
    // Re-read the store: StrictMode runs effects twice before any re-render.
    const latest = useProfileToolStore.getState().results[key];
    if (latest?.requestKey === requestKeyOf(method, parsed, dataVersion)) return;
    void runTool(key, method, parsed);
  }, [key, method, paramsKey, dataVersion, profileVersion]);

  async function cancel() {
    const jobId = useProfileToolStore.getState().results[key]?.jobId;
    if (jobId && !jobId.startsWith('request:')) await request('job.cancel', { job_id: jobId });
  }

  async function retry() {
    if (params) await runTool(key, method, params);
  }

  const stale = Boolean(entry && dataVersion && entry.dataVersion !== dataVersion);
  return { entry, stale, cancel, retry };
}

/** Routes engine job events for tool jobs into the tool store. */
export function applyToolEvent(job: ToolJobEvent) {
  if (!TOOL_JOB_KINDS.has(job.kind) || abandoned.has(job.job_id)) return;
  if (!knows(job.job_id)) {
    early.set(job.job_id, job); // the acknowledgement may still be in flight
    return;
  }
  const store = useProfileToolStore.getState();
  if (job.state === 'running') store.progress(job.job_id, job.progress ?? 0, job.message ?? '');
  if (job.state === 'completed') store.complete(job.job_id, job.result);
  if (job.state === 'failed') store.fail(job.job_id, job.error ?? errorOf(null));
  if (job.state === 'cancelled') store.cancel(job.job_id);
}
