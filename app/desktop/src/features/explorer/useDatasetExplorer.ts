import { useCallback, useRef, useState } from 'react';
import { request } from '../../services/ipcClient';
import { useDatasetStore } from '../../stores/datasetStore';
import { useWorkspaceStore } from '../../stores/workspaceStore';
import type { Dataset, Preview } from '../../types/dataset';
import { getHistory, getWorkingPreview } from '../../services/dataOperationClient';
import { useSettingsStore } from '../../stores/settingsStore';
import { useViewMaskStore } from '../../stores/viewMaskStore';
import { clampPageSize, DEFAULT_PAGE_SIZE } from '../../services/pageSize';

type Opened = Dataset & { dropped_columns?: string[] };

const droppedSortNotice = (columns: string[]) =>
  `The saved sort no longer applies to ${columns.map((name) => `"${name}"`).join(', ')}: ` +
  `${columns.length > 1 ? 'these columns are' : 'this column is'} not in the file.`;

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
        const opened = await request<Opened>('dataset.open', {
          path: sourcePath,
          history_limit: useSettingsStore.getState().historyLimit,
          view: useViewMaskStore.getState().viewFor(sourcePath),
        });
        const firstPage = await request<Preview>('dataset.preview', {
          dataset_id: opened.dataset_id,
          offset: 0,
          limit: useSettingsStore.getState().pageSize,
        });
        const history = await getHistory(opened.dataset_id);
        setSource(opened, firstPage);
        setDatasetHistory(history);
        setHistory(history);
        setPreview(firstPage);
        if (opened.dropped_columns?.length)
          useWorkspaceStore.getState().notify(droppedSortNotice(opened.dropped_columns));
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
    async (offset: number, limit = preview?.limit ?? DEFAULT_PAGE_SIZE, search = '') => {
      if (!dataset) return;
      const requestId = ++previewRequestId.current;
      const contextVersion = useDatasetStore.getState().previewContextVersion;
      try {
        const nextPreview = await getWorkingPreview(dataset.dataset_id, {
          offset,
          limit: clampPageSize(limit),
          columns: selectedColumns,
          search,
        });
        const current = useDatasetStore.getState();
        if (
          requestId === previewRequestId.current &&
          current.previewContextVersion === contextVersion &&
          current.dataset?.dataset_id === dataset.dataset_id
        )
          setPreview(nextPreview);
      } catch (cause) {
        const current = useDatasetStore.getState();
        if (
          requestId === previewRequestId.current &&
          current.previewContextVersion === contextVersion &&
          current.dataset?.dataset_id === dataset.dataset_id
        )
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
          limit: clampPageSize(preview?.limit ?? DEFAULT_PAGE_SIZE),
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
