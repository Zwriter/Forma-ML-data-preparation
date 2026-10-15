import { useEffect, useState } from 'react';
import { listen } from '@tauri-apps/api/event';
import type { Dataset } from '../../types/dataset';
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
import { request } from '../../services/ipcClient';
import type { Operation } from '../../types/transformation';
import { getTauriRuntimeError, isTauriRuntime } from '../../services/tauriRuntime';

type EventJob = Job & { result?: { dataset?: Dataset } & Record<string, unknown> };
export function WorkflowActions({ activeTab }: { activeTab: string }) {
  const { dataset, apply, acceptResult } = useCleaningJob();
  const profile = useProfileJob();
  const exportDataset = useExportJob();
  const addJob = useJobStore((state) => state.add);
  const [comparison, setComparison] = useState<{
    before: Record<string, unknown>[];
    after: Record<string, unknown>[];
  } | null>(null);
  const [report, setReport] = useState<Record<string, unknown> | null>(null);
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);

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
      if (job.result?.dataset) await acceptResult(job.result.dataset);
      if (job.kind === 'profile' && job.result) setReport(job.result);
    })
      .then((unlisten) => {
        stop = unlisten;
      })
      .catch((cause: unknown) => {
        setMessage(cause instanceof Error ? cause.message : getTauriRuntimeError().message);
      });
    return () => stop?.();
  }, [acceptResult, addJob]);

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
      {activeTab === 'Pipelines' && (
        <section className="card workflow-card" id="pipelines">
          <h2>Pipelines</h2>
          <p>Pipeline management is not available yet.</p>
        </section>
      )}
      {['Clean', 'Profile', 'Export', 'Pipelines'].includes(activeTab) && <JobStatus />}
      {message && ['Clean', 'Profile', 'Export', 'Pipelines'].includes(activeTab) && (
        <p role="status" aria-live="polite">
          {message}
        </p>
      )}
    </>
  );
}
