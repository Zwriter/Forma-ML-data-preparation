import { create } from 'zustand';
import type { Operation } from '../types/transformation';
type State = { operations: Operation[]; add: (operation: Operation) => void; toggle: (index: number) => void; remove: (index: number) => void };
export const useTransformationStore = create<State>((set) => ({ operations: [],
  add: (operation) => set((state) => ({ operations: [...state.operations, operation] })),
  toggle: (index) => set((state) => ({ operations: state.operations.map((item, at) => at === index ? { ...item, enabled: !item.enabled } : item) })),
  remove: (index) => set((state) => ({ operations: state.operations.filter((_, at) => at !== index).map((item, order) => ({ ...item, order })) })),
}));
