import { create } from 'zustand';
import type { Dataset, Preview } from '../types/dataset';
type State = { dataset: Dataset | null; preview: Preview | null; sourceDataset: Dataset | null; sourcePreview: Preview | null; setDataset: (value: Dataset) => void; setPreview: (value: Preview) => void; setSource: (dataset: Dataset, preview: Preview) => void };
export const useDatasetStore = create<State>((set) => ({ dataset: null, preview: null, sourceDataset: null, sourcePreview: null,
  setDataset: (dataset) => set({ dataset }), setPreview: (preview) => set({ preview }),
  setSource: (dataset, preview) => set({ dataset, preview, sourceDataset: dataset, sourcePreview: preview }) }));
