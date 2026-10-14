import { useCallback } from 'react';
import { request } from '../../services/ipcClient';
import type { Operation } from '../../types/transformation';
import { useJobStore } from '../../stores/jobStore';
import { useDatasetStore } from '../../stores/datasetStore';
import type { Dataset, Preview } from '../../types/dataset';

export function useCleaningJob() {
  const dataset = useDatasetStore((state) => state.dataset);
  const setDataset = useDatasetStore((state) => state.setDataset);
  const setPreview = useDatasetStore((state) => state.setPreview);
  const add = useJobStore((state) => state.add);
  const preview = useCallback(
    async (operation: Operation) => {
      if (!dataset) return null;
      return request<{ before: Record<string, unknown>[]; after: Record<string, unknown>[] }>(
        'cleaning.preview',
        { dataset_id: dataset.dataset_id, operation },
      );
    },
    [dataset],
  );
  const apply = useCallback(
    async (operations: Operation[]) => {
      if (!dataset) return;
      const job = await request<{ job_id: string; state: JobState }>('cleaning.apply', {
        dataset_id: dataset.dataset_id,
        operations,
      });
      add({ ...job, kind: 'clean', progress: null, message: 'Queued' });
      return job;
    },
    [dataset, add],
  );
  const acceptResult = useCallback(
    async (derived: Dataset) => {
      setDataset(derived);
      setPreview(
        await request<Preview>('dataset.preview', {
          dataset_id: derived.dataset_id,
          offset: 0,
          limit: 100,
        }),
      );
    },
    [setDataset, setPreview],
  );
  return { dataset, preview, apply, acceptResult };
}

type JobState = 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
