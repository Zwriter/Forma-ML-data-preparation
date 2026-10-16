import { useCallback } from 'react';
import { request } from '../../services/ipcClient';
import type { Operation } from '../../types/transformation';
import { useJobStore } from '../../stores/jobStore';
import { useDatasetStore } from '../../stores/datasetStore';
import type { Dataset, HistoryMetadata, Preview } from '../../types/dataset';
import { useWorkspaceStore } from '../../stores/workspaceStore';

export function useCleaningJob() {
  const dataset = useDatasetStore((state) => state.dataset);
  const setDataset = useDatasetStore((state) => state.setDataset);
  const setPreview = useDatasetStore((state) => state.setPreview);
  const applyResult = useDatasetStore((state) => state.applyResult);
  const setHistory = useWorkspaceStore((state) => state.setHistory);
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
    async (derived: Dataset, history?: HistoryMetadata) => {
      const preview = await request<Preview>('dataset.preview', {
          dataset_id: derived.dataset_id,
          offset: 0,
          limit: 100,
        });
      setDataset(derived);
      setPreview(preview);
      if (history) {
        applyResult(derived, history, preview);
        setHistory(history);
      }
    },
    [setDataset, setPreview, applyResult, setHistory],
  );
  return { dataset, preview, apply, acceptResult };
}

type JobState = 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
