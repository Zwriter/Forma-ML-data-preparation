import { save } from '@tauri-apps/plugin-dialog';
import { request } from '../../services/ipcClient';
import { useDatasetStore } from '../../stores/datasetStore';
import { useProfileStore } from '../../stores/profileStore';
import { useWorkspaceStore } from '../../stores/workspaceStore';

type ExportEvent = { job_id: string; kind: string; state: string; result?: unknown };

const fileName = (path: string) => path.split(/[\\/]/).pop() ?? path;

/** "{dataset}_rejected_{yyyy-mm-dd}.csv" in the source file's folder. */
export function rejectedDestination(sourcePath: string, date = new Date()) {
  const folder = sourcePath.slice(0, sourcePath.length - fileName(sourcePath).length);
  const base = fileName(sourcePath).replace(/\.[^.]+$/, '') || 'dataset';
  const day = [date.getFullYear(), date.getMonth() + 1, date.getDate()]
    .map((part) => String(part).padStart(2, '0'))
    .join('-');
  return `${folder}${base}_rejected_${day}.csv`;
}

export function useProfileExports() {
  const dataset = useDatasetStore((state) => state.dataset);
  const dataVersion = useDatasetStore((state) => state.history?.data_version);
  const exportJobId = useProfileStore((state) => state.exportJobId);

  async function exportInvalid(column: string | null) {
    if (!dataset || !dataVersion) return;
    const destination = await save({
      defaultPath: rejectedDestination(dataset.source_path),
      filters: [
        { name: 'CSV', extensions: ['csv'] },
        { name: 'Parquet', extensions: ['parquet'] },
      ],
    });
    if (!destination) return;
    try {
      const ack = await request<{ job_id: string }>('profile.export_invalid', {
        dataset_id: dataset.dataset_id,
        data_version: dataVersion,
        column,
        destination,
        format: /\.parquet$/i.test(destination) ? 'parquet' : 'csv',
        // The save dialog already asked before replacing an existing file.
        force_overwrite: true,
      });
      useProfileStore.getState().setExportJob(ack.job_id);
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : 'The export could not start.';
      useWorkspaceStore.getState().setError(message);
    }
  }

  async function cancelExport() {
    const jobId = useProfileStore.getState().exportJobId;
    if (jobId) await request('job.cancel', { job_id: jobId });
  }

  return { exportInvalid, cancelExport, exporting: exportJobId !== null };
}

/** Finishes the running invalid-rows export; failures use the workspace error path. */
export function applyExportEvent(job: ExportEvent) {
  if (job.kind !== 'export_invalid') return;
  if (!['completed', 'failed', 'cancelled'].includes(job.state)) return;
  useProfileStore.getState().setExportJob(null);
  const notify = useWorkspaceStore.getState().notify;
  if (job.state === 'completed') {
    const { destination, row_count } = job.result as { destination: string; row_count: number };
    notify(`Exported ${row_count} rows with invalid values to ${fileName(destination)}.`);
  }
  if (job.state === 'cancelled')
    notify('The invalid-rows export was cancelled; no file was written.');
}
