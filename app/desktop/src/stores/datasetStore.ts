import { create } from 'zustand';
import type { Dataset, HistoryMetadata, Preview } from '../types/dataset';
export type OpenFileTab = {
  id: string;
  dataset: Dataset;
  preview: Preview;
  sourceDataset: Dataset;
  sourcePreview: Preview;
  history: HistoryMetadata | null;
  selectedColumns: string[];
};

type State = {
  dataset: Dataset | null;
  preview: Preview | null;
  sourceDataset: Dataset | null;
  sourcePreview: Preview | null;
  history: HistoryMetadata | null;
  selectedColumns: string[];
  openFiles: OpenFileTab[];
  activeFileId: string | null;
  setDataset: (value: Dataset) => void;
  setPreview: (value: Preview) => void;
  setSource: (dataset: Dataset, preview: Preview) => void;
  selectFile: (id: string) => void;
  closeFile: (id: string) => void;
  setHistory: (history: HistoryMetadata | null) => void;
  setSelectedColumns: (columns: string[]) => void;
  applyResult: (dataset: Dataset, history: HistoryMetadata, preview?: Preview) => void;
};

function snapshot(state: State): OpenFileTab | null {
  if (!state.dataset || !state.preview || !state.sourceDataset || !state.sourcePreview) return null;
  return {
    id: state.activeFileId ?? state.dataset.dataset_id,
    dataset: state.dataset,
    preview: state.preview,
    sourceDataset: state.sourceDataset,
    sourcePreview: state.sourcePreview,
    history: state.history,
    selectedColumns: state.selectedColumns,
  };
}

function replaceTab(state: State, tab: OpenFileTab): OpenFileTab[] {
  return state.openFiles.map((item) => (item.id === tab.id ? tab : item));
}

function workspaceFromTab(tab: OpenFileTab) {
  const { id: _id, ...workspace } = tab;
  return workspace;
}

export const useDatasetStore = create<State>((set) => ({
  dataset: null,
  preview: null,
  sourceDataset: null,
  sourcePreview: null,
  history: null,
  selectedColumns: [],
  openFiles: [],
  activeFileId: null,
  setDataset: (dataset) =>
    set((state) => {
      const current = snapshot(state);
      if (!current) return { dataset };
      const tab = { ...current, dataset };
      return { dataset, openFiles: replaceTab(state, tab) };
    }),
  setPreview: (preview) =>
    set((state) => {
      const current = snapshot(state);
      if (!current) return { preview };
      const tab = { ...current, preview };
      return { preview, openFiles: replaceTab(state, tab) };
    }),
  setSource: (dataset, preview) =>
    set((state) => {
      const selectedColumns = preview.columns.map((column) => column.name);
      const tab: OpenFileTab = {
        id: dataset.dataset_id,
        dataset,
        preview,
        sourceDataset: dataset,
        sourcePreview: preview,
        history: null,
        selectedColumns,
      };
      return {
        ...workspaceFromTab(tab),
        activeFileId: tab.id,
        openFiles: [...state.openFiles.filter((item) => item.id !== tab.id), tab],
      };
    }),
  selectFile: (id) =>
    set((state) => {
      const tab = state.openFiles.find((item) => item.id === id);
      if (!tab) return {};
      const current = snapshot(state);
      const openFiles = current ? replaceTab(state, current) : state.openFiles;
      return { ...workspaceFromTab(tab), activeFileId: id, openFiles };
    }),
  closeFile: (id) =>
    set((state) => {
      const openFiles = state.openFiles.filter((item) => item.id !== id);
      if (state.activeFileId !== id) return { openFiles };
      const next = openFiles.at(-1);
      return next
        ? { ...workspaceFromTab(next), activeFileId: next.id, openFiles }
        : {
            dataset: null,
            preview: null,
            sourceDataset: null,
            sourcePreview: null,
            history: null,
            selectedColumns: [],
            activeFileId: null,
            openFiles,
          };
    }),
  setHistory: (history) =>
    set((state) => {
      const current = snapshot(state);
      if (!current) return { history };
      const tab = { ...current, history };
      return { history, openFiles: replaceTab(state, tab) };
    }),
  setSelectedColumns: (selectedColumns) =>
    set((state) => {
      const current = snapshot(state);
      if (!current) return { selectedColumns };
      const tab = { ...current, selectedColumns };
      return { selectedColumns, openFiles: replaceTab(state, tab) };
    }),
  applyResult: (dataset, history, preview) =>
    set((state) => {
      const current = snapshot(state);
      const retained = state.selectedColumns.filter((name) =>
        dataset.schema.some((column) => column.name === name),
      );
      return {
        dataset,
        history,
        preview: preview ?? state.preview,
        selectedColumns: retained.length ? retained : dataset.schema.map((column) => column.name),
        ...(current
          ? {
              openFiles: replaceTab(state, {
                ...current,
                dataset,
                history,
                preview: preview ?? current.preview,
                selectedColumns: retained.length
                  ? retained
                  : dataset.schema.map((column) => column.name),
              }),
            }
          : {}),
      };
    }),
}));
