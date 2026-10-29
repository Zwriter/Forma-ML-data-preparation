import { afterEach, describe, expect, it, vi } from 'vitest';
import { useWorkspaceStore } from '../../../src/stores/workspaceStore';
import type { HistoryMetadata } from '../../../src/types/dataset';

const history: HistoryMetadata = {
  history_id: 'history-1',
  dataset_id: 'dataset-1',
  current_index: 1,
  saved_index: 0,
  is_dirty: true,
  can_undo: true,
  can_redo: false,
};

describe('workspace history state', () => {
  afterEach(() => {
    useWorkspaceStore.setState({
      busy: false,
      error: null,
      history: null,
      saveStatus: 'idle',
      commands: {},
    });
  });

  it('tracks dirty state and history availability', () => {
    useWorkspaceStore.getState().setHistory(history);
    expect(useWorkspaceStore.getState().saveStatus).toBe('dirty');
    expect(useWorkspaceStore.getState().history?.can_undo).toBe(true);
    expect(useWorkspaceStore.getState().history?.can_redo).toBe(false);
  });

  it('dispatches workspace commands through registered handlers', async () => {
    const save = vi.fn().mockResolvedValue(undefined);
    const undo = vi.fn().mockResolvedValue(undefined);
    const redo = vi.fn().mockResolvedValue(undefined);
    useWorkspaceStore.getState().setCommands({ save, undo, redo });

    await useWorkspaceStore.getState().save();
    await useWorkspaceStore.getState().undo();
    await useWorkspaceStore.getState().redo();

    expect(save).toHaveBeenCalledOnce();
    expect(undo).toHaveBeenCalledOnce();
    expect(redo).toHaveBeenCalledOnce();
  });
});
