import { request } from '../../services/ipcClient';
import { useDatasetStore } from '../../stores/datasetStore';
import { useProfileStore } from '../../stores/profileStore';
import type { Profile } from '../../types/profile';

type ProfileAck = { job_id: string; state: string; result?: Profile };

type ProfileJobEvent = {
  job_id: string;
  kind: string;
  state: string;
  progress?: number | null;
  message?: string;
  result?: unknown;
  error?: { code: string; message: string } | null;
};

/** Latest event per job that arrived before its request was acknowledged. */
const early = new Map<string, ProfileJobEvent>();

const knows = (jobId: string) =>
  Object.values(useProfileStore.getState().entries).some((entry) => entry.jobId === jobId);

const errorOf = (cause: unknown) => ({
  code: 'INTERNAL_ERROR',
  message: cause instanceof Error ? cause.message : 'Profiling failed.',
});

export function useProfileJob() {
  const dataset = useDatasetStore((state) => state.dataset);
  const historyId = useDatasetStore((state) => state.history?.history_id);
  const jobId = useProfileStore((state) =>
    historyId ? state.entries[historyId]?.jobId : undefined,
  );

  async function run() {
    if (!dataset || !historyId) return;
    const store = useProfileStore.getState();
    const placeholder = `request:${historyId}`;
    store.start(historyId, placeholder);
    try {
      const ack = await request<ProfileAck>('dataset.profile', {
        dataset_id: dataset.dataset_id,
      });
      store.rename(placeholder, ack.job_id);
      if (ack.state === 'completed' && ack.result) store.complete(ack.job_id, ack.result);
      const missed = early.get(ack.job_id);
      early.delete(ack.job_id);
      if (missed) applyProfileEvent(missed);
    } catch (cause) {
      store.fail(placeholder, errorOf(cause));
    }
  }

  async function cancel() {
    if (jobId) await request('job.cancel', { job_id: jobId });
  }

  return { run, cancel };
}

/** Routes engine job events for profile jobs into the profile store. */
export function applyProfileEvent(job: ProfileJobEvent) {
  if (job.kind !== 'profile') return;
  if (!knows(job.job_id)) {
    early.set(job.job_id, job); // the ack may still be in flight
    return;
  }
  const store = useProfileStore.getState();
  if (job.state === 'running') store.progress(job.job_id, job.progress ?? 0, job.message ?? '');
  if (job.state === 'completed') store.complete(job.job_id, job.result as Profile);
  if (job.state === 'failed') store.fail(job.job_id, job.error ?? errorOf(null));
  if (job.state === 'cancelled') store.cancel(job.job_id);
}
