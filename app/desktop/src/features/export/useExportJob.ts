import { request } from '../../services/ipcClient';
import { useDatasetStore } from '../../stores/datasetStore';
import type { JobAcknowledgement } from '../../types/dataOperations';

export function useExportJob() {
  const dataset = useDatasetStore((state) => state.dataset);
  return async function exportDataset(
    destination: string,
    format: 'csv' | 'parquet',
    overwrite: boolean,
  ) {
    if (!dataset) return;
    return request<JobAcknowledgement>(`export.${format}`, {
      dataset_id: dataset.dataset_id,
      destination,
      force_overwrite: overwrite,
    });
  };
}
