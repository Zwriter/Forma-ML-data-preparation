import { create } from 'zustand';
import type { Dataset, HistoryMetadata, Preview } from '../types/dataset';
type State = {
  dataset: Dataset | null;
  preview: Preview | null;
  sourceDataset: Dataset | null;
  sourcePreview: Preview | null;
  history: HistoryMetadata | null;
  selectedColumns: string[];
  setDataset: (value: Dataset) => void;
  setPreview: (value: Preview) => void;
  setSource: (dataset: Dataset, preview: Preview) => void;
  setHistory: (history: HistoryMetadata | null) => void;
  setSelectedColumns: (columns: string[]) => void;
  applyResult: (dataset: Dataset, history: HistoryMetadata, preview?: Preview) => void;
};
export const useDatasetStore = create<State>((set) => ({
  dataset: null,
  preview: null,
  sourceDataset: null,
  sourcePreview: null,
  history: null,
  selectedColumns: [],
  setDataset: (dataset) => set({ dataset }),
  setPreview: (preview) => set({ preview }),
  setSource: (dataset, preview) =>
    set({
      dataset,
      preview,
      sourceDataset: dataset,
      sourcePreview: preview,
      history: null,
      selectedColumns: preview.columns.map((column) => column.name),
    }),
  setHistory: (history) => set({ history }),
  setSelectedColumns: (selectedColumns) => set({ selectedColumns }),
  applyResult: (dataset, history, preview) =>
    set((state) => {
      const retained = state.selectedColumns.filter((name) =>
        dataset.schema.some((column) => column.name === name),
      );
      return {
        dataset,
        history,
        preview: preview ?? state.preview,
        selectedColumns: retained.length ? retained : dataset.schema.map((column) => column.name),
      };
    }),
}));
