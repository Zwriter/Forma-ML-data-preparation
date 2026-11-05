import { useEffect, useRef } from 'react';
import { request } from '../../services/ipcClient';
import { toOperations, useCleaningStore } from '../../stores/cleaningStore';
import { useDatasetStore } from '../../stores/datasetStore';
import type { CleaningPreview, CleaningStep } from '../../types/cleaning';
import { DEFAULT_PAGE_SIZE } from '../../services/pageSize';

const DEBOUNCE_MS = 250;

/**
 * Keep the Clean worksheet showing the enabled draft for the page on screen.
 * Paging still loads the Data page first, which supplies offset and limit here.
 */
export function useLivePreview(steps: CleaningStep[]) {
  const datasetId = useDatasetStore((state) => state.dataset?.dataset_id);
  const offset = useDatasetStore((state) => state.preview?.offset ?? 0);
  const limit = useDatasetStore((state) => state.preview?.limit ?? DEFAULT_PAGE_SIZE);
  const columns = useDatasetStore((state) => state.selectedColumns);
  const search = useDatasetStore((state) => state.search);
  const latest = useRef(0);

  useEffect(() => {
    const cleaning = useCleaningStore.getState();
    const id = ++latest.current;
    if (!datasetId || !steps.some((step) => step.enabled)) {
      cleaning.setPreview(null);
      return;
    }
    cleaning.setPreviewStatus('updating');
    const timer = setTimeout(async () => {
      try {
        const result = await request<CleaningPreview>('cleaning.preview', {
          dataset_id: datasetId,
          operations: toOperations(steps),
          offset,
          limit,
          ...(columns.length ? { columns } : {}),
          ...(search.trim() ? { search } : {}),
        });
        if (id === latest.current) useCleaningStore.getState().setPreview(result);
      } catch (cause) {
        if (id !== latest.current) return;
        useCleaningStore.setState({ preview: null });
        useCleaningStore
          .getState()
          .setPreviewStatus('error', cause instanceof Error ? cause.message : 'Preview failed.');
      }
    }, DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [datasetId, steps, offset, limit, columns, search]);
}
