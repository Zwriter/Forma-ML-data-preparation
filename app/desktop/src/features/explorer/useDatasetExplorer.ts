import { useCallback, useState } from 'react';
import { request } from '../../services/ipcClient';
import { useDatasetStore } from '../../stores/datasetStore';
import { useWorkspaceStore } from '../../stores/workspaceStore';
import type { Dataset, Preview } from '../../types/dataset';

export function useDatasetExplorer() {
  const [path, setPath] = useState('');
  const dataset = useDatasetStore((state) => state.dataset);
  const preview = useDatasetStore((state) => state.preview);
  const setSource = useDatasetStore((state) => state.setSource);
  const setPreview = useDatasetStore((state) => state.setPreview);
  const setBusy = useWorkspaceStore((state) => state.setBusy);
  const setError = useWorkspaceStore((state) => state.setError);
  const openDataset = useCallback(
    async (sourcePath = path) => {
      setBusy(true);
      setError(null);
      try {
        const opened = await request<Dataset>('dataset.open', { path: sourcePath });
        const firstPage = await request<Preview>('dataset.preview', {
          dataset_id: opened.dataset_id,
          offset: 0,
          limit: 100,
        });
        setSource(opened, firstPage);
        setPreview(firstPage);
        return true;
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : 'Could not open the dataset.');
        return false;
      } finally {
        setBusy(false);
      }
    },
    [path, setBusy, setError, setSource, setPreview],
  );
  const page = useCallback(
    async (offset: number) => {
      if (!dataset) return;
      try {
        setPreview(
          await request<Preview>('dataset.preview', {
            dataset_id: dataset.dataset_id,
            offset,
            limit: 100,
          }),
        );
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : 'Could not load this page.');
      }
    },
    [dataset, setError, setPreview],
  );
  return { path, setPath, dataset, preview, openDataset, page };
}
