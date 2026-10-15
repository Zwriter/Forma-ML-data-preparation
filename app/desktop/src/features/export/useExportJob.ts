import { request } from '../../services/ipcClient';
import { useDatasetStore } from '../../stores/datasetStore';
import { useJobStore } from '../../stores/jobStore';

export function useExportJob() {
  const dataset = useDatasetStore((state) => state.dataset);
  const add = useJobStore((state) => state.add);
  return async function exportDataset(
    destination: string,
    format: 'csv' | 'parquet',
    overwrite: boolean,
  ) {
    if (!dataset) return;
    const job = await request<{ job_id: string; state: 'pending' | 'running' }>(
      `export.${format}`,
      { dataset_id: dataset.dataset_id, destination, force_overwrite: overwrite },
    );
    add({ ...job, kind: 'export', progress: null, message: 'Queued' });
  };
}
