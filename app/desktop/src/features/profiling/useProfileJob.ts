import { request } from '../../services/ipcClient';
import { useDatasetStore } from '../../stores/datasetStore';
import type { JobAcknowledgement } from '../../types/dataOperations';

export function useProfileJob() {
  const dataset = useDatasetStore((state) => state.dataset);
  return async function profile() {
    if (!dataset) return;
    return request<JobAcknowledgement>('dataset.profile', { dataset_id: dataset.dataset_id });
  };
}
