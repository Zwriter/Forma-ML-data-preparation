import { useCallback, useEffect, useRef } from 'react';
import { useDatasetStore } from '../../stores/datasetStore';
import { useJobStore } from '../../stores/jobStore';
import { useSettingsStore } from '../../stores/settingsStore';
import { useWorkspaceStore } from '../../stores/workspaceStore';
import { IpcError } from '../../services/ipcClient';
import { redoDataset, saveDataset, undoDataset } from '../../services/dataOperationClient';
import { buildSaveCopyDestination } from '../../services/saveDestination';

type Options = { onOverwriteRequired: (destination?: string) => void };

export function useWorkspaceHistory({ onOverwriteRequired }: Options) {
  const dataset = useDatasetStore((state) => state.dataset);
  const addJob = useJobStore((state) => state.add);
  const setBusy = useWorkspaceStore((state) => state.setBusy);
  const setError = useWorkspaceStore((state) => state.setError);
  const setSaveStatus = useWorkspaceStore((state) => state.setSaveStatus);
  const setCommands = useWorkspaceStore((state) => state.setCommands);
  const saveBehavior = useSettingsStore((state) => state.saveBehavior);
  const pendingDestination = useRef<string | null>(null);

  const save = useCallback(
    async (forceOverwrite = false) => {
      if (!dataset) return;
      setError(null);
      let destination = pendingDestination.current;
      try {
        if (saveBehavior === 'copy' && !destination) {
          destination = buildSaveCopyDestination(dataset.source_path, dataset.format);
        }
        pendingDestination.current = destination;
        const job = await saveDataset(dataset.dataset_id, forceOverwrite, destination ?? undefined);
        pendingDestination.current = null;
        addJob({ ...job, kind: 'save', progress: null, message: 'Queued' });
        setSaveStatus('saving');
        setBusy(true);
      } catch (cause) {
        if (cause instanceof IpcError && cause.code === 'SAVE_REQUIRED') {
          pendingDestination.current = destination;
          onOverwriteRequired(destination ?? undefined);
          return;
        }
        pendingDestination.current = null;
        setSaveStatus('failed');
        setError(cause instanceof Error ? cause.message : 'Save could not start.');
      }
    },
    [dataset, saveBehavior, addJob, setBusy, setError, setSaveStatus, onOverwriteRequired],
  );

  const cancelPendingSave = useCallback(() => {
    pendingDestination.current = null;
  }, []);

  const move = useCallback(
    async (direction: 'undo' | 'redo') => {
      if (!dataset) return;
      setError(null);
      try {
        const request = direction === 'undo' ? undoDataset : redoDataset;
        const job = await request(dataset.dataset_id);
        addJob({ ...job, kind: direction, progress: null, message: 'Queued' });
        setBusy(true);
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : `Could not ${direction}.`);
      }
    },
    [dataset, addJob, setBusy, setError],
  );

  const undo = useCallback(() => move('undo'), [move]);
  const redo = useCallback(() => move('redo'), [move]);

  useEffect(() => {
    setCommands({ save: () => save(), undo, redo });
    return () => setCommands({});
  }, [save, undo, redo, setCommands]);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (!event.ctrlKey || event.altKey || event.shiftKey) return;
      const target = event.target;
      if (
        target instanceof HTMLElement &&
        (target.isContentEditable ||
          ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName) ||
          target.getAttribute('role') === 'textbox')
      )
        return;
      const key = event.key.toLowerCase();
      const action = key === 's' ? save : key === 'z' ? undo : key === 'x' ? redo : null;
      if (!action) return;
      event.preventDefault();
      void action();
    }
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [save, undo, redo]);

  return { save, undo, redo, cancelPendingSave };
}
