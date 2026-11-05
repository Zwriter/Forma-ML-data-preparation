import { useEffect } from 'react';
import { listen } from '@tauri-apps/api/event';
import type { Dataset, HistoryMetadata } from '../../types/dataset';
import type { Job } from '../../types/job';
import { getTauriRuntimeError, isDemoRuntime, isTauriRuntime } from '../../services/tauriRuntime';
import { useDatasetStore } from '../../stores/datasetStore';
import { useWorkspaceStore } from '../../stores/workspaceStore';
import { useCleaningJob } from '../cleaning/useCleaningJob';
import { draftKey, useCleaningStore } from '../../stores/cleaningStore';
import { useViewMaskStore } from '../../stores/viewMaskStore';
import { applyProfileEvent } from '../profiling/useProfileJob';
import type { SortKey } from '../../types/dataOperations';

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

export function useWorkflowJobEvents(onSaveComplete?: (success: boolean) => void) {
  const setHistory = useWorkspaceStore((state) => state.setHistory);
  const setDatasetHistory = useDatasetStore((state) => state.setHistory);
  const setSaveStatus = useWorkspaceStore((state) => state.setSaveStatus);
  const setWorkspaceBusy = useWorkspaceStore((state) => state.setBusy);
  const setWorkspaceError = useWorkspaceStore((state) => state.setError);
  const { acceptResult } = useCleaningJob();

  useEffect(() => {
    if (isDemoRuntime()) return;
    if (!isTauriRuntime()) {
      setWorkspaceError(getTauriRuntimeError().message);
      return;
    }
    let stop: (() => void) | undefined;
    listen<EventJob>('engine-event', async (event) => {
      const job = event.payload;
      if (job.kind === 'clean' && ['completed', 'failed', 'cancelled'].includes(job.state)) {
        const cleaning = useCleaningStore.getState();
        cleaning.finishApply(job.job_id);
        // The draft key is the open file, which survives the dataset swap below.
        if (job.state === 'completed') cleaning.clear(draftKey(useDatasetStore.getState()));
      }
      if (job.state === 'completed' && job.result?.dataset)
        await acceptResult(
          job.result.dataset,
          job.result.history,
          ['group_by', 'pivot', 'unpivot'].includes(job.kind),
        );
      if (job.kind === 'save' && job.state === 'completed') rememberSavedView(job.result);
      if (job.state === 'completed' && job.result?.history) {
        setDatasetHistory(job.result.history);
        setHistory(job.result.history);
        if (job.kind === 'save') setSaveStatus(job.result.history.is_dirty ? 'dirty' : 'saved');
      }
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
      applyProfileEvent(job);
    })
      .then((unlisten) => {
        stop = unlisten;
      })
      .catch((cause: unknown) => {
        setWorkspaceError(cause instanceof Error ? cause.message : getTauriRuntimeError().message);
      });
    return () => stop?.();
  }, [
    acceptResult,
    onSaveComplete,
    setDatasetHistory,
    setHistory,
    setSaveStatus,
    setWorkspaceBusy,
    setWorkspaceError,
  ]);
}

/** Remember the saved sort for the written file and, for a copy, its source. */
function rememberSavedView(result: EventJob['result']) {
  const view = result?.view as SortKey[] | undefined;
  const destination = result?.destination;
  if (!Array.isArray(view) || typeof destination !== 'string') return;
  const source = useDatasetStore.getState().dataset?.source_path;
  useViewMaskStore.getState().remember(source ? [destination, source] : [destination], view);
}
