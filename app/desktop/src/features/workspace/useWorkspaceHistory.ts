import { useCallback, useEffect } from 'react';
import { useDatasetStore } from '../../stores/datasetStore';
import { useJobStore } from '../../stores/jobStore';
import { useWorkspaceStore } from '../../stores/workspaceStore';
import { IpcError } from '../../services/ipcClient';
import { redoDataset, saveDataset, undoDataset } from '../../services/dataOperationClient';

type Options = { onOverwriteRequired: () => void };

export function useWorkspaceHistory({ onOverwriteRequired }: Options) {
  const dataset = useDatasetStore((state) => state.dataset);
  const addJob = useJobStore((state) => state.add);
  const setBusy = useWorkspaceStore((state) => state.setBusy);
  const setError = useWorkspaceStore((state) => state.setError);
  const setSaveStatus = useWorkspaceStore((state) => state.setSaveStatus);
  const setCommands = useWorkspaceStore((state) => state.setCommands);

  const save = useCallback(
    async (forceOverwrite = false) => {
      if (!dataset) return;
      setError(null);
      try {
        const job = await saveDataset(dataset.dataset_id, forceOverwrite);
        addJob({ ...job, kind: 'save', progress: null, message: 'Queued' });
        setSaveStatus('saving');
        setBusy(true);
      } catch (cause) {
        if (cause instanceof IpcError && cause.code === 'SAVE_REQUIRED') {
          onOverwriteRequired();
          return;
        }
        setSaveStatus('failed');
        setError(cause instanceof Error ? cause.message : 'Save could not start.');
      }
    },
    [dataset, addJob, setBusy, setError, setSaveStatus, onOverwriteRequired],
  );

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

  return { save, undo, redo };
}
