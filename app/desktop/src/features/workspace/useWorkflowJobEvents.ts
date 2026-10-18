import { useEffect, type Dispatch, type SetStateAction } from 'react';
import { listen } from '@tauri-apps/api/event';
import type { Dataset, HistoryMetadata } from '../../types/dataset';
import type { Job } from '../../types/job';
import { getTauriRuntimeError, isDemoRuntime, isTauriRuntime } from '../../services/tauriRuntime';
import { useDatasetStore } from '../../stores/datasetStore';
import { useJobStore } from '../../stores/jobStore';
import { useWorkspaceStore } from '../../stores/workspaceStore';
import { useCleaningJob } from '../cleaning/useCleaningJob';

type EventJob = Job & {
  result?: { dataset?: Dataset; history?: HistoryMetadata } & Record<string, unknown>;
  error?: { code: string; message: string } | null;
};

const actionNames: Record<string, string> = {
  filter_rows: 'Filter rows',
  sort_rows: 'Sort rows',
  group_by: 'Group by',
  undo: 'Undo',
  redo: 'Redo',
  save: 'Save',
  clean: 'Cleaning',
  profile: 'Profile',
  export: 'Export',
  pivot: 'Pivot',
  unpivot: 'Unpivot',
};

export function useWorkflowJobEvents(
  setMessage: Dispatch<SetStateAction<string>>,
  onSaveComplete?: (success: boolean) => void,
  onProfileResult?: (result: Record<string, unknown>) => void,
) {
  const addJob = useJobStore((state) => state.add);
  const setHistory = useWorkspaceStore((state) => state.setHistory);
  const setDatasetHistory = useDatasetStore((state) => state.setHistory);
  const setSaveStatus = useWorkspaceStore((state) => state.setSaveStatus);
  const setWorkspaceBusy = useWorkspaceStore((state) => state.setBusy);
  const setWorkspaceError = useWorkspaceStore((state) => state.setError);
  const notify = useWorkspaceStore((state) => state.notify);
  const { acceptResult } = useCleaningJob();

  useEffect(() => {
    if (isDemoRuntime()) return;
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
        await acceptResult(
          job.result.dataset,
          job.result.history,
          ['group_by', 'pivot', 'unpivot'].includes(job.kind),
        );
      if (job.state === 'completed' && job.result?.history) {
        setDatasetHistory(job.result.history);
        setHistory(job.result.history);
        if (job.kind === 'save') setSaveStatus(job.result.history.is_dirty ? 'dirty' : 'saved');
      }
      if (job.state === 'completed')
        notify('success', `${actionNames[job.kind] ?? job.kind} completed`);
      if (job.state === 'failed') {
        if (job.kind === 'save') setSaveStatus('failed');
        const detail = job.error?.message ?? 'The last valid state remains active.';
        setWorkspaceError(`${actionNames[job.kind] ?? job.kind} failed: ${detail}`);
      }
      if (job.state === 'cancelled' && job.kind === 'save') setSaveStatus('dirty');
      if (['completed', 'failed', 'cancelled'].includes(job.state)) {
        setWorkspaceBusy(false);
        if (job.kind === 'save')
          onSaveComplete?.(job.state === 'completed' && job.result?.history?.is_dirty === false);
      }
      if (job.kind === 'profile' && job.result) onProfileResult?.(job.result);
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
    onProfileResult,
    onSaveComplete,
    notify,
    setDatasetHistory,
    setHistory,
    setMessage,
    setSaveStatus,
    setWorkspaceBusy,
    setWorkspaceError,
  ]);
}
