import { useCallback } from 'react';
import { request } from '../../services/ipcClient';
import type { CleaningStep, StepValidation } from '../../types/cleaning';
import type { JobAcknowledgement } from '../../types/dataOperations';
import { useDatasetStore } from '../../stores/datasetStore';
import type { Column, Dataset, HistoryMetadata, Preview } from '../../types/dataset';
import { useWorkspaceStore } from '../../stores/workspaceStore';
import { toOperations } from '../../stores/cleaningStore';
import { carryVisibleColumns } from '../workspace/visibleColumns';
import { DEFAULT_PAGE_SIZE } from '../../services/pageSize';

export function useCleaningJob() {
  const dataset = useDatasetStore((state) => state.dataset);
  const setDataset = useDatasetStore((state) => state.setDataset);
  const setPreview = useDatasetStore((state) => state.setPreview);
  const setSelectedColumns = useDatasetStore((state) => state.setSelectedColumns);
  const applyResult = useDatasetStore((state) => state.applyResult);
  const setHistory = useWorkspaceStore((state) => state.setHistory);
  const validate = useCallback(
    async (steps: CleaningStep[]) => {
      if (!dataset) return null;
      return request<{ valid: boolean; steps: StepValidation[]; columns?: Column[][] }>(
        'cleaning.validate',
        {
          dataset_id: dataset.dataset_id,
          operations: toOperations(steps),
        },
      );
    },
    [dataset],
  );
  const apply = useCallback(
    async (steps: CleaningStep[]) => {
      if (!dataset) return;
      return request<JobAcknowledgement>('cleaning.apply', {
        dataset_id: dataset.dataset_id,
        operations: toOperations(steps),
      });
    },
    [dataset],
  );
  const acceptResult = useCallback(
    async (derived: Dataset, history?: HistoryMetadata, resetProjection = false) => {
      const { selectedColumns, dataset: before } = useDatasetStore.getState();
      const visible = resetProjection
        ? derived.schema.map((column) => column.name)
        : carryVisibleColumns(selectedColumns, before?.schema ?? derived.schema, derived.schema);
      if (visible.join('\u0000') !== selectedColumns.join('\u0000')) setSelectedColumns(visible);
      const preview = await request<Preview>('dataset.preview', {
        dataset_id: derived.dataset_id,
        offset: 0,
        limit: useDatasetStore.getState().preview?.limit ?? DEFAULT_PAGE_SIZE,
        ...(visible.length ? { columns: visible } : {}),
      });
      setDataset(derived);
      setPreview(preview);
      if (history) {
        applyResult(derived, history, preview);
        setHistory(history);
      }
    },
    [setDataset, setPreview, setSelectedColumns, applyResult, setHistory],
  );
  return { dataset, validate, apply, acceptResult };
}
