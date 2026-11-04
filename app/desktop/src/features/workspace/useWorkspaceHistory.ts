import { useCallback, useEffect, useRef } from 'react';
import { useDatasetStore } from '../../stores/datasetStore';
import { useSettingsStore } from '../../stores/settingsStore';
import { useWorkspaceStore } from '../../stores/workspaceStore';
import { IpcError } from '../../services/ipcClient';
import { redoDataset, saveDataset, undoDataset } from '../../services/dataOperationClient';
import { buildSaveCopyDestination } from '../../services/saveDestination';

type Options = { onOverwriteRequired: (destination?: string) => void };
type OpenDataset = { dataset_id: string; source_path: string; format: 'csv' | 'parquet' };

const MAX_COPY_ATTEMPTS = 50;
const isSaveRequired = (cause: unknown) =>
  cause instanceof IpcError && cause.code === 'SAVE_REQUIRED';

export function useWorkspaceHistory({ onOverwriteRequired }: Options) {
  const dataset = useDatasetStore((state) => state.dataset);
  const setBusy = useWorkspaceStore((state) => state.setBusy);
  const setError = useWorkspaceStore((state) => state.setError);
  const setSaveStatus = useWorkspaceStore((state) => state.setSaveStatus);
  const setCommands = useWorkspaceStore((state) => state.setCommands);
  const saveBehavior = useSettingsStore((state) => state.saveBehavior);
  // Source path → the copy this session wrote, which later saves may update without asking.
  const ownCopies = useRef(new Map<string, string>());

  const saveCopy = useCallback(async (current: OpenDataset) => {
    const own = ownCopies.current.get(current.source_path);
    if (own) return saveDataset(current.dataset_id, true, own);
    // A taken name belongs to an earlier save or another file: never replace it, use the next one.
    for (let attempt = 1; attempt <= MAX_COPY_ATTEMPTS; attempt += 1) {
      const name = buildSaveCopyDestination(
        current.source_path,
        current.format,
        new Date(),
        attempt,
      );
      try {
        const started = await saveDataset(current.dataset_id, false, name);
        ownCopies.current.set(current.source_path, name);
        return started;
      } catch (cause) {
        if (!isSaveRequired(cause)) throw cause;
      }
    }
    throw new Error('Could not find a free file name for the copy.');
  }, []);

  const save = useCallback(
    async (forceOverwrite = false) => {
      if (!dataset) return;
      setError(null);
      try {
        if (saveBehavior === 'copy') await saveCopy(dataset);
        else await saveDataset(dataset.dataset_id, forceOverwrite);
        setSaveStatus('saving');
        setBusy(true);
      } catch (cause) {
        // Only replacing the source file asks first; copies never replace anything.
        if (isSaveRequired(cause)) return onOverwriteRequired();
        setSaveStatus('failed');
        setError(cause instanceof Error ? cause.message : 'Save could not start.');
      }
    },
    [dataset, saveBehavior, saveCopy, setBusy, setError, setSaveStatus, onOverwriteRequired],
  );

  const move = useCallback(
    async (direction: 'undo' | 'redo') => {
      if (!dataset) return;
      setError(null);
      try {
        const request = direction === 'undo' ? undoDataset : redoDataset;
        await request(dataset.dataset_id);
        setBusy(true);
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : `Could not ${direction}.`);
      }
    },
    [dataset, setBusy, setError],
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
