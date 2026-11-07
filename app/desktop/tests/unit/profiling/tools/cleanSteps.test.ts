import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { addCleanSteps, hasCleanSteps } from '../../../../src/features/profiling/tools/cleanSteps';
import { useCleaningStore } from '../../../../src/stores/cleaningStore';
import { useDatasetStore } from '../../../../src/stores/datasetStore';
import { useWorkspaceStore } from '../../../../src/stores/workspaceStore';

const drafts = () => useCleaningStore.getState().drafts['file-1'] ?? [];
const removeDuplicates = [{ type: 'drop_duplicates', parameters: { columns: ['email'] } }];

describe('addCleanSteps', () => {
  beforeEach(() => useDatasetStore.setState({ activeFileId: 'file-1' } as never));
  afterEach(() => {
    useCleaningStore.setState({ drafts: {} });
    useWorkspaceStore.setState({ notification: null });
  });

  it('adds the steps to the open file and confirms with Undo', () => {
    addCleanSteps(removeDuplicates, 'Remove duplicate rows');

    expect(drafts()).toMatchObject([
      { type: 'drop_duplicates', parameters: { columns: ['email'] }, enabled: true },
    ]);
    const notice = useWorkspaceStore.getState().notification!;
    expect(notice.message).toBe('Added "Remove duplicate rows" to Clean steps.');
    expect(notice.action?.label).toBe('Undo');

    notice.action!.run();
    expect(drafts()).toEqual([]);
  });

  it('adds several steps in order and Undo removes only those', () => {
    useCleaningStore.getState().add('file-1', 'fill_null', { column: 'a', strategy: 'mode' });
    addCleanSteps(
      [
        { type: 'convert_type', parameters: { column: 'b', target_type: 'float' } },
        { type: 'fill_null', parameters: { column: 'b', strategy: 'median' } },
      ],
      'Fill missing values in b',
    );
    expect(drafts().map((step) => step.type)).toEqual(['fill_null', 'convert_type', 'fill_null']);

    useWorkspaceStore.getState().notification!.action!.run();
    expect(drafts().map((step) => step.parameters.column)).toEqual(['a']);
  });

  it('knows when the same steps are already in the Clean steps', () => {
    expect(hasCleanSteps(drafts(), removeDuplicates)).toBe(false);
    addCleanSteps(removeDuplicates, 'Remove duplicate rows');
    expect(hasCleanSteps(drafts(), removeDuplicates)).toBe(true);
    expect(
      hasCleanSteps(drafts(), [{ type: 'drop_duplicates', parameters: { columns: null } }]),
    ).toBe(false);
  });
});
