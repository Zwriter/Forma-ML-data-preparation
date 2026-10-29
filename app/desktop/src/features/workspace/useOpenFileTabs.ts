import { useCallback, useRef } from 'react';
import { useDatasetStore } from '../../stores/datasetStore';
import { useWorkspaceStore } from '../../stores/workspaceStore';

type DialogMode = 'close' | 'overwrite' | null;

export function useOpenFileTabs(
  setDialogMode: (mode: DialogMode) => void,
  closeWindow: () => void,
) {
  const files = useDatasetStore((state) => state.openFiles);
  const activeFileId = useDatasetStore((state) => state.activeFileId);
  const selectFile = useDatasetStore((state) => state.selectFile);
  const closeFile = useDatasetStore((state) => state.closeFile);
  const closeIntent = useRef<'window' | 'file' | null>(null);
  const closingFileId = useRef<string | null>(null);

  const syncHistory = useCallback(() => {
    useWorkspaceStore.getState().setHistory(useDatasetStore.getState().history);
  }, []);

  const activate = useCallback(
    (id: string) => {
      selectFile(id);
      syncHistory();
    },
    [selectFile, syncHistory],
  );

  const remove = useCallback(
    (id: string) => {
      closeFile(id);
      syncHistory();
    },
    [closeFile, syncHistory],
  );

  const findDirtyFile = useCallback(() => {
    const store = useDatasetStore.getState();
    return (
      store.openFiles.find((file) => file.history?.is_dirty) ??
      (useWorkspaceStore.getState().history?.is_dirty
        ? store.openFiles.find((file) => file.id === store.activeFileId)
        : undefined)
    );
  }, []);

  const requestCloseWindow = useCallback(() => {
    const dirtyFile = findDirtyFile();
    if (!dirtyFile && !useWorkspaceStore.getState().history?.is_dirty) return false;
    if (dirtyFile) activate(dirtyFile.id);
    closeIntent.current = 'window';
    setDialogMode('close');
    return true;
  }, [activate, findDirtyFile, setDialogMode]);

  const requestCloseFile = useCallback(
    (id: string) => {
      const file = files.find((item) => item.id === id);
      if (!file) return;
      if (!file.history?.is_dirty) {
        remove(id);
        return;
      }
      activate(id);
      closingFileId.current = id;
      closeIntent.current = 'file';
      setDialogMode('close');
    },
    [activate, files, remove, setDialogMode],
  );

  const onSaveComplete = useCallback(
    (success: boolean) => {
      if (!success) return;
      setDialogMode(null);
      const intent = closeIntent.current;
      closeIntent.current = null;
      if (intent === 'file' && closingFileId.current) {
        remove(closingFileId.current);
        closingFileId.current = null;
      } else if (intent === 'window') {
        const nextDirty = findDirtyFile();
        if (nextDirty || useWorkspaceStore.getState().history?.is_dirty) {
          if (nextDirty) activate(nextDirty.id);
          closeIntent.current = 'window';
          setDialogMode('close');
        } else closeWindow();
      }
    },
    [activate, closeWindow, findDirtyFile, remove, setDialogMode],
  );

  const discardClose = useCallback(() => {
    const intent = closeIntent.current;
    closeIntent.current = null;
    setDialogMode(null);
    if (intent === 'file' && closingFileId.current) {
      remove(closingFileId.current);
      closingFileId.current = null;
    } else closeWindow();
  }, [closeWindow, remove, setDialogMode]);

  const cancelClose = useCallback(() => {
    closeIntent.current = null;
    closingFileId.current = null;
    setDialogMode(null);
  }, [setDialogMode]);

  return {
    files,
    activeFileId,
    activate,
    requestCloseFile,
    requestCloseWindow,
    onSaveComplete,
    discardClose,
    cancelClose,
  };
}
