import { create } from 'zustand';
type State = {
  destination: string;
  overwrite: boolean;
  setDestination: (destination: string) => void;
  setOverwrite: (overwrite: boolean) => void;
};
export const useExportStore = create<State>((set) => ({
  destination: '',
  overwrite: false,
  setDestination: (destination) => set({ destination }),
  setOverwrite: (overwrite) => set({ overwrite }),
}));
