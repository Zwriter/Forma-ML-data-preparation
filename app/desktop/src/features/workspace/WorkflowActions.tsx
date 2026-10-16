import { useEffect, useState } from 'react';
import { listen } from '@tauri-apps/api/event';
import type { Dataset, HistoryMetadata } from '../../types/dataset';
import type { Job } from '../../types/job';
import { TransformationBuilder } from '../cleaning/TransformationBuilder';
import { BeforeAfterComparison } from '../cleaning/BeforeAfterComparison';
import { ProfilePanel } from '../profiling/ProfilePanel';
import { ExportDialog } from '../export/ExportDialog';
import { JobStatus } from '../jobs/JobStatus';
import { useCleaningJob } from '../cleaning/useCleaningJob';
import { useProfileJob } from '../profiling/useProfileJob';
import { useExportJob } from '../export/useExportJob';
import { useJobStore } from '../../stores/jobStore';
import { useDatasetStore } from '../../stores/datasetStore';
import { request } from '../../services/ipcClient';
import type { Operation } from '../../types/transformation';
import { getTauriRuntimeError, isTauriRuntime } from '../../services/tauriRuntime';
import { useWorkspaceStore } from '../../stores/workspaceStore';
import { FilterBuilder } from '../data-operations/FilterBuilder';
import { SortBuilder } from '../data-operations/SortBuilder';
import { applyDataOperation } from '../../services/dataOperationClient';
import type { DataOperation } from '../../types/dataOperations';

type EventJob = Job & {
  result?: { dataset?: Dataset; history?: HistoryMetadata } & Record<string, unknown>;
  error?: { code: string; message: string } | null;
};
export function WorkflowActions({
  activeTab,
  onSaveComplete,
  operationDialog,
  onCloseOperationDialog,
}: {
  activeTab: string;
  onSaveComplete?: (success: boolean) => void;
  operationDialog?: 'filter' | 'sort' | null;
  onCloseOperationDialog?: () => void;
}) {
  const { dataset, apply, acceptResult } = useCleaningJob();
  const profile = useProfileJob();
  const exportDataset = useExportJob();
  const addJob = useJobStore((state) => state.add);
  const setHistory = useWorkspaceStore((state) => state.setHistory);
  const setDatasetHistory = useDatasetStore((state) => state.setHistory);
  const setSaveStatus = useWorkspaceStore((state) => state.setSaveStatus);
  const setWorkspaceBusy = useWorkspaceStore((state) => state.setBusy);
  const setWorkspaceError = useWorkspaceStore((state) => state.setError);
  const [comparison, setComparison] = useState<{
    before: Record<string, unknown>[];
    after: Record<string, unknown>[];
  } | null>(null);
  const [report, setReport] = useState<Record<string, unknown> | null>(null);
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const setStoreBusy = useWorkspaceStore((state) => state.setBusy);

  useEffect(() => {
    if (!isTauriRuntime()) {
      setMessage(getTauriRuntimeError().message);
      return;
    }
    let stop: (() => void) | undefined;
    listen<EventJob>('engine-event', async (event) => {
      const job = event.payload;
      addJob(job);
      setMessage(`${job.kind}: ${job.message}`);
      if (job.state === 'completed' && job.result?.dataset)
        await acceptResult(job.result.dataset, job.result.history);
      if (job.state === 'completed' && job.result?.history) {
        setDatasetHistory(job.result.history);
        setHistory(job.result.history);
        if (job.kind === 'save')
          setSaveStatus(job.result.history.is_dirty ? 'dirty' : 'saved');
      }
      if (job.state === 'failed' && job.kind === 'save') {
        setSaveStatus('failed');
        const failure = job.error?.message ?? 'Save failed. Your changes remain unsaved.';
        setMessage(failure);
        setWorkspaceError(failure);
      }
      if (job.state === 'failed' && job.kind !== 'save') {
        setWorkspaceError(job.error?.message ?? `${job.kind} failed. The last valid state remains active.`);
      }
      if (job.state === 'cancelled' && job.kind === 'save') setSaveStatus('dirty');
      if (['completed', 'failed', 'cancelled'].includes(job.state)) {
        setWorkspaceBusy(false);
        if (job.kind === 'save')
          onSaveComplete?.(
            job.state === 'completed' && job.result?.history?.is_dirty === false,
          );
      }
      if (job.kind === 'profile' && job.result) setReport(job.result);
    })
      .then((unlisten) => {
        stop = unlisten;
      })
      .catch((cause: unknown) => {
        setMessage(cause instanceof Error ? cause.message : getTauriRuntimeError().message);
      });
    return () => stop?.();
  }, [
    acceptResult,
    addJob,
    onSaveComplete,
    setHistory,
    setDatasetHistory,
    setSaveStatus,
    setWorkspaceBusy,
    setWorkspaceError,
  ]);

  if (!dataset) return null;
  async function previewOperation(operation: Operation) {
    setBusy(true);
    setMessage('');
    try {
      const result = await requestPreview(operation);
      setComparison(result);
      setMessage('Preview ready.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Preview failed.');
    } finally {
      setBusy(false);
    }
  }
  async function applyOperations(operations: Operation[]) {
    setBusy(true);
    try {
      await apply(operations);
      setMessage('Cleaning job queued.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Cleaning failed.');
    } finally {
      setBusy(false);
    }
  }
  async function requestPreview(operation: Operation) {
    if (!dataset) throw new Error('Open a dataset before previewing transformations.');
    return request<{ before: Record<string, unknown>[]; after: Record<string, unknown>[] }>(
      'cleaning.preview',
      { dataset_id: dataset.dataset_id, operation },
    );
  }
  async function runProfile() {
    setBusy(true);
    try {
      await profile();
      setMessage('Profile job queued.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Profile failed.');
    } finally {
      setBusy(false);
    }
  }
  async function runExport(destination: string, format: 'csv' | 'parquet', overwrite: boolean) {
    setBusy(true);
    try {
      await exportDataset(destination, format, overwrite);
      setMessage('Export job queued.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Export failed.');
    } finally {
      setBusy(false);
    }
  }
  async function runDataOperation(operation: DataOperation) {
    if (!dataset) return;
    setBusy(true);
    setStoreBusy(true);
    try {
      const job = await applyDataOperation(dataset.dataset_id, operation);
      addJob({ ...job, kind: operation.type, progress: null, message: 'Queued' });
      onCloseOperationDialog?.();
      setMessage(`${operation.type === 'filter_rows' ? 'Filter' : 'Sort'} job queued.`);
    } catch (cause) {
      setStoreBusy(false);
      setWorkspaceError(cause instanceof Error ? cause.message : 'Could not start this operation.');
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      {activeTab === 'Profile' && (
        <section className="card workflow-card" id="profile">
          <h2>Data profile</h2>
          <button disabled={busy} onClick={() => void runProfile()}>
            Profile dataset
          </button>
          <ProfilePanel report={report} />
        </section>
      )}
      {activeTab === 'Clean' && (
        <>
          <TransformationBuilder
            onPreview={(operation) => void previewOperation(operation)}
            onApply={(operations) => void applyOperations(operations)}
          />
          {comparison && (
            <section className="card">
              <h2>Transformation preview</h2>
              <BeforeAfterComparison before={comparison.before} after={comparison.after} />
            </section>
          )}
        </>
      )}
      {activeTab === 'Export' && (
        <ExportDialog
          busy={busy}
          onExport={(destination, format, overwrite) =>
            void runExport(destination, format, overwrite)
          }
        />
      )}
      {activeTab === 'Data' && operationDialog === 'filter' && (
        <FilterBuilder columns={dataset.schema} onApply={(operation) => void runDataOperation(operation)} onClose={() => onCloseOperationDialog?.()} />
      )}
      {activeTab === 'Data' && operationDialog === 'sort' && (
        <SortBuilder columns={dataset.schema} onApply={(operation) => void runDataOperation(operation)} onClose={() => onCloseOperationDialog?.()} />
      )}
      {activeTab === 'Pipelines' && (
        <section className="card workflow-card" id="pipelines">
          <h2>Pipelines</h2>
          <p>Pipeline management is not available yet.</p>
        </section>
      )}
      {['Data', 'Clean', 'Profile', 'Export', 'Pipelines'].includes(activeTab) && <JobStatus />}
      {message && ['Data', 'Clean', 'Profile', 'Export', 'Pipelines'].includes(activeTab) && (
        <p role="status" aria-live="polite">
          {message}
        </p>
      )}
    </>
  );
}
