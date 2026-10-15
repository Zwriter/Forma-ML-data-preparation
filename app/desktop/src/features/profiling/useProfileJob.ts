import { request } from '../../services/ipcClient';
import { useJobStore } from '../../stores/jobStore';
import { useDatasetStore } from '../../stores/datasetStore';
import type { Job } from '../../types/job';

export function useProfileJob() {
  const dataset = useDatasetStore((state) => state.dataset);
  const add = useJobStore((state) => state.add);
  return async function profile() {
    if (!dataset) return;
    const job = await request<Job>('dataset.profile', { dataset_id: dataset.dataset_id });
    add({ ...job, kind: 'profile', progress: null, message: 'Queued' });
  };
}
