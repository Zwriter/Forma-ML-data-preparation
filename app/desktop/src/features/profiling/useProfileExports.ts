import { save } from '@tauri-apps/plugin-dialog';
import { request } from '../../services/ipcClient';
import { useDatasetStore } from '../../stores/datasetStore';
import { useProfileStore } from '../../stores/profileStore';
import { useWorkspaceStore } from '../../stores/workspaceStore';

type FileJobEvent = { job_id: string; kind: string; state: string; result?: unknown };

/** The two background jobs that write files from the Profile tab; one runs at a time. */
const FILE_JOBS = ['export_invalid', 'profile_report'];

const fileName = (path: string) => path.split(/[\\/]/).pop() ?? path;

/** `{folder}{dataset}{suffix}{yyyy-mm-dd}.{extension}` beside the source file. */
function datedPath(sourcePath: string, suffix: string, extension: string, date: Date) {
  const folder = sourcePath.slice(0, sourcePath.length - fileName(sourcePath).length);
  const base = fileName(sourcePath).replace(/\.[^.]+$/, '') || 'dataset';
  const day = [date.getFullYear(), date.getMonth() + 1, date.getDate()]
    .map((part) => String(part).padStart(2, '0'))
    .join('-');
  return `${folder}${base}${suffix}${day}.${extension}`;
}

export const rejectedDestination = (sourcePath: string, date = new Date()) =>
  datedPath(sourcePath, '_rejected_', 'csv', date);

export const reportDestination = (sourcePath: string, date = new Date()) =>
  datedPath(sourcePath, '-profile-', 'html', date);

/** Starts a file-writing job and remembers it; request errors go to the workspace. */
async function startFileJob(method: string, params: Record<string, unknown>) {
  try {
    const ack = await request<{ job_id: string }>(method, params);
    useProfileStore.getState().setExportJob(ack.job_id);
  } catch (cause) {
    const message = cause instanceof Error ? cause.message : 'The file could not be written.';
    useWorkspaceStore.getState().setError(message);
  }
}

export function useProfileExports() {
  const dataset = useDatasetStore((state) => state.dataset);
  const history = useDatasetStore((state) => state.history);
  const exportJobId = useProfileStore((state) => state.exportJobId);

  async function exportInvalid(column: string | null) {
    if (!dataset || !history) return;
    const destination = await save({
      defaultPath: rejectedDestination(dataset.source_path),
      filters: [
        { name: 'CSV', extensions: ['csv'] },
        { name: 'Parquet', extensions: ['parquet'] },
      ],
    });
    if (!destination) return;
    await startFileJob('profile.export_invalid', {
      dataset_id: dataset.dataset_id,
      data_version: history.data_version,
      column,
      destination,
      format: /\.parquet$/i.test(destination) ? 'parquet' : 'csv',
      // The save dialog already asked before replacing an existing file.
      force_overwrite: true,
    });
  }

  async function generateReport() {
    if (!dataset || !history) return;
    const destination = await save({
      defaultPath: reportDestination(dataset.source_path),
      filters: [{ name: 'HTML', extensions: ['html'] }],
    });
    if (!destination) return;
    const charts = useProfileStore.getState().chartColumns[history.history_id] ?? {};
    await startFileJob('profile.report', {
      dataset_id: dataset.dataset_id,
      data_version: history.data_version,
      destination,
      distribution_column: charts.distribution ?? null,
      category_column: charts.category ?? null,
      force_overwrite: true,
    });
  }

  async function cancelExport() {
    const jobId = useProfileStore.getState().exportJobId;
    if (jobId) await request('job.cancel', { job_id: jobId });
  }

  return { exportInvalid, generateReport, cancelExport, exporting: exportJobId !== null };
}

/** Finishes the running file job; failures use the workspace error path. */
export function applyExportEvent(job: FileJobEvent) {
  if (!FILE_JOBS.includes(job.kind)) return;
  if (!['completed', 'failed', 'cancelled'].includes(job.state)) return;
  useProfileStore.getState().setExportJob(null);
  const notify = useWorkspaceStore.getState().notify;
  const report = job.kind === 'profile_report';
  if (job.state === 'completed') {
    const { destination, row_count } = job.result as { destination: string; row_count?: number };
    notify(
      report
        ? `Saved the profile report to ${fileName(destination)}.`
        : `Exported ${row_count} rows with invalid values to ${fileName(destination)}.`,
    );
  }
  if (job.state === 'cancelled')
    notify(
      report
        ? 'The profile report was cancelled; no file was written.'
        : 'The invalid-rows export was cancelled; no file was written.',
    );
}
