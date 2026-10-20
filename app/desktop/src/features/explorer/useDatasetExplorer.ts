import { useCallback, useRef, useState } from 'react';
import { request } from '../../services/ipcClient';
import { useDatasetStore } from '../../stores/datasetStore';
import { useWorkspaceStore } from '../../stores/workspaceStore';
import type { Dataset, Preview } from '../../types/dataset';
import { getHistory, getWorkingPreview } from '../../services/dataOperationClient';
import { useSettingsStore } from '../../stores/settingsStore';

export function useDatasetExplorer() {
  const [path, setPath] = useState('');
  const dataset = useDatasetStore((state) => state.dataset);
  const preview = useDatasetStore((state) => state.preview);
  const setSource = useDatasetStore((state) => state.setSource);
  const setDatasetHistory = useDatasetStore((state) => state.setHistory);
  const setPreview = useDatasetStore((state) => state.setPreview);
  const selectedColumns = useDatasetStore((state) => state.selectedColumns);
  const setBusy = useWorkspaceStore((state) => state.setBusy);
  const setError = useWorkspaceStore((state) => state.setError);
  const setHistory = useWorkspaceStore((state) => state.setHistory);
  const previewRequestId = useRef(0);
  const openDataset = useCallback(
    async (sourcePath = path) => {
      previewRequestId.current += 1;
      setBusy(true);
      setError(null);
      try {
        const opened = await request<Dataset>('dataset.open', {
          path: sourcePath,
          history_limit: useSettingsStore.getState().historyLimit,
        });
        const firstPage = await request<Preview>('dataset.preview', {
          dataset_id: opened.dataset_id,
          offset: 0,
          limit: 100,
        });
        const history = await getHistory(opened.dataset_id);
        setSource(opened, firstPage);
        setDatasetHistory(history);
        setHistory(history);
        setPreview(firstPage);
        return true;
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : 'Could not open the dataset.');
        return false;
      } finally {
        setBusy(false);
      }
    },
    [path, setBusy, setError, setSource, setPreview, setHistory, setDatasetHistory],
  );
  const page = useCallback(
    async (offset: number, limit = preview?.limit ?? 100, search = '') => {
      if (!dataset) return;
      const requestId = ++previewRequestId.current;
      try {
        const nextPreview = await getWorkingPreview(dataset.dataset_id, {
          offset,
          limit: Math.min(500, Math.max(10, limit)),
          columns: selectedColumns,
          search,
        });
        if (requestId === previewRequestId.current) setPreview(nextPreview);
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : 'Could not load this page.');
      }
    },
    [dataset, preview?.limit, selectedColumns, setError, setPreview],
  );
  const projectColumns = useCallback(
    async (columns: string[]) => {
      if (!dataset || !columns.length) return;
      try {
        const projected = await getWorkingPreview(dataset.dataset_id, {
          offset: 0,
          limit: Math.min(500, Math.max(10, preview?.limit ?? 100)),
          columns,
        });
        useDatasetStore.getState().setSelectedColumns(columns);
        setPreview(projected);
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : 'Could not select these columns.');
      }
    },
    [dataset, preview?.limit, setError, setPreview],
  );
  return { path, setPath, dataset, preview, openDataset, page, projectColumns };
}
