import { create } from 'zustand';
type State = { busy: boolean; error: string | null; setBusy: (busy: boolean) => void; setError: (error: string | null) => void };
export const useWorkspaceStore = create<State>((set) => ({ busy: false, error: null, setBusy: (busy) => set({ busy }), setError: (error) => set({ error }) }));
