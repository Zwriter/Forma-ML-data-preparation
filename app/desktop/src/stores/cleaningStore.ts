import { create } from 'zustand';
import type {
  CleaningPreview,
  CleaningStep,
  Operation,
  StepForm,
  StepType,
  StepValidation,
} from '../types/cleaning';
import type { Column, Dataset } from '../types/dataset';

type Parameters = Record<string, unknown>;

type State = {
  drafts: Record<string, CleaningStep[]>;
  form: StepForm | null;
  preview: CleaningPreview | null;
  previewStatus: 'idle' | 'updating' | 'error';
  previewError: string;
  panel: 'open' | 'collapsed';
  validation: StepValidation[];
  /** From validate: `stepColumns[i]` is what step i sees; the last entry follows every step. */
  stepColumns: Column[][];
  applyJobId: string | null;
  /** Last apply job that ended; its acknowledgement may arrive after its final event. */
  finishedJobId: string | null;
  add: (fileId: string, type: StepType, parameters: Parameters) => void;
  update: (fileId: string, id: string, parameters: Parameters, type?: StepType) => void;
  toggle: (fileId: string, id: string) => void;
  move: (fileId: string, id: string, offset: -1 | 1) => void;
  duplicate: (fileId: string, id: string) => void;
  remove: (fileId: string, id: string) => void;
  clear: (fileId: string) => void;
  openForm: (type: StepType, editingId?: string | null, position?: StepForm['position']) => void;
  closeForm: () => void;
  setPreview: (preview: CleaningPreview | null) => void;
  setPreviewStatus: (status: State['previewStatus'], error?: string) => void;
  setPanel: (panel: State['panel']) => void;
  setValidation: (validation: StepValidation[], stepColumns?: Column[][]) => void;
  setApplyJobId: (jobId: string | null) => void;
  finishApply: (jobId: string) => void;
};

let sequence = 0;
const nextId = () => `step-${++sequence}`;

export const useCleaningStore = create<State>((set) => {
  function change(fileId: string, edit: (steps: CleaningStep[]) => CleaningStep[]) {
    set((state) => ({
      drafts: { ...state.drafts, [fileId]: edit(state.drafts[fileId] ?? []) },
    }));
  }
  return {
    drafts: {},
    form: null,
    preview: null,
    previewStatus: 'idle',
    previewError: '',
    panel: 'open',
    validation: [],
    stepColumns: [],
    applyJobId: null,
    finishedJobId: null,
    add: (fileId, type, parameters) => {
      change(fileId, (steps) => [...steps, { id: nextId(), type, parameters, enabled: true }]);
      set({ panel: 'open' });
    },
    update: (fileId, id, parameters, type) =>
      change(fileId, (steps) =>
        steps.map((step) =>
          step.id === id ? { ...step, parameters, type: type ?? step.type } : step,
        ),
      ),
    toggle: (fileId, id) =>
      change(fileId, (steps) =>
        steps.map((step) => (step.id === id ? { ...step, enabled: !step.enabled } : step)),
      ),
    move: (fileId, id, offset) =>
      change(fileId, (steps) => {
        const from = steps.findIndex((step) => step.id === id);
        const to = from + offset;
        if (from < 0 || to < 0 || to >= steps.length) return steps;
        const moved = [...steps];
        [moved[from], moved[to]] = [moved[to], moved[from]];
        return moved;
      }),
    duplicate: (fileId, id) =>
      change(fileId, (steps) =>
        steps.flatMap((step) => (step.id === id ? [step, { ...step, id: nextId() }] : [step])),
      ),
    remove: (fileId, id) => change(fileId, (steps) => steps.filter((step) => step.id !== id)),
    clear: (fileId) =>
      set((state) => {
        const { [fileId]: _removed, ...drafts } = state.drafts;
        return {
          drafts,
          preview: null,
          previewStatus: 'idle',
          previewError: '',
          validation: [],
          stepColumns: [],
        };
      }),
    openForm: (type, editingId = null, position) => set({ form: { type, editingId, position } }),
    closeForm: () => set({ form: null }),
    setPreview: (preview) => set({ preview, previewStatus: 'idle', previewError: '' }),
    setPreviewStatus: (previewStatus, previewError = '') => set({ previewStatus, previewError }),
    setPanel: (panel) => set({ panel }),
    setValidation: (validation, stepColumns = []) => set({ validation, stepColumns }),
    setApplyJobId: (jobId) =>
      set((state) => ({ applyJobId: jobId === state.finishedJobId ? null : jobId })),
    finishApply: (jobId) => set({ applyJobId: null, finishedJobId: jobId }),
  };
});

/** Drafts are keyed by open file so switching tabs keeps each file's steps. */
export function draftKey(state: { activeFileId: string | null; dataset: Dataset | null }) {
  return state.activeFileId ?? state.dataset?.dataset_id ?? '';
}

export function toOperations(steps: CleaningStep[]): Operation[] {
  return steps.map((step, order) => ({
    type: step.type,
    parameters: step.parameters,
    enabled: step.enabled,
    order,
    operation_id: step.id,
  }));
}
