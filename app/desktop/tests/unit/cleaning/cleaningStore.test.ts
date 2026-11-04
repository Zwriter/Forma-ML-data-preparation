import { beforeEach, describe, expect, it } from 'vitest';
import { toOperations, useCleaningStore } from '../../../src/stores/cleaningStore';

const preview = {
  columns: [],
  rows: [],
  changed_cells: [],
  offset: 0,
  limit: 100,
  total_count: 0,
  summary: {
    rows_before: 0,
    rows_after: 0,
    rows_removed: 0,
    values_changed: 0,
    columns_added: [],
    columns_removed: [],
    columns_renamed: [],
  },
};

function steps(fileId = 'file-1') {
  return useCleaningStore.getState().drafts[fileId] ?? [];
}

describe('cleaning store', () => {
  beforeEach(() => {
    useCleaningStore.setState({
      drafts: {},
      form: null,
      preview: null,
      previewStatus: 'idle',
      previewError: '',
      panel: 'open',
      validation: [],
      applyJobId: null,
    });
  });

  it('keeps a separate draft per file', () => {
    const store = useCleaningStore.getState();
    store.add('file-1', 'drop_duplicates', {});
    store.add('file-2', 'drop_null_rows', {});
    expect(steps('file-1').map((step) => step.type)).toEqual(['drop_duplicates']);
    expect(steps('file-2').map((step) => step.type)).toEqual(['drop_null_rows']);
    store.clear('file-1');
    expect(useCleaningStore.getState().drafts['file-1']).toBeUndefined();
    expect(steps('file-2')).toHaveLength(1);
  });

  it('adds enabled steps with unique ids and updates, toggles, and removes them', () => {
    const store = useCleaningStore.getState();
    store.add('file-1', 'fill_null', { column: 'x', strategy: 'median' });
    store.add('file-1', 'drop_duplicates', {});
    const [first, second] = steps();
    expect(first.id).not.toBe(second.id);
    expect(first.enabled).toBe(true);

    store.update('file-1', first.id, { column: 'y', strategy: 'mode' });
    store.toggle('file-1', second.id);
    expect(steps()[0].parameters).toEqual({ column: 'y', strategy: 'mode' });
    expect(steps()[1].enabled).toBe(false);
    store.update('file-1', first.id, { columns: ['x'] }, 'drop_columns');
    expect(steps()[0]).toMatchObject({ type: 'drop_columns', parameters: { columns: ['x'] } });

    store.remove('file-1', first.id);
    expect(steps().map((step) => step.id)).toEqual([second.id]);
  });

  it('moves steps within bounds and duplicates after the original', () => {
    const store = useCleaningStore.getState();
    store.add('file-1', 'drop_duplicates', {});
    store.add('file-1', 'drop_null_rows', {});
    const [a, b] = steps();
    store.move('file-1', b.id, -1);
    expect(steps().map((step) => step.id)).toEqual([b.id, a.id]);
    store.move('file-1', b.id, -1);
    expect(steps().map((step) => step.id)).toEqual([b.id, a.id]);

    store.duplicate('file-1', b.id);
    const copy = steps()[1];
    expect(copy.id).not.toBe(b.id);
    expect(copy).toMatchObject({ type: b.type, parameters: b.parameters });
    expect(steps()).toHaveLength(3);
  });

  it('opens and closes the step form', () => {
    useCleaningStore.getState().openForm('fill_null');
    expect(useCleaningStore.getState().form).toEqual({ type: 'fill_null', editingId: null });
    useCleaningStore.getState().openForm('fill_null', 'step-9');
    expect(useCleaningStore.getState().form).toEqual({ type: 'fill_null', editingId: 'step-9' });
    useCleaningStore.getState().closeForm();
    expect(useCleaningStore.getState().form).toBeNull();
  });

  it('tracks the live preview status and error', () => {
    const store = useCleaningStore.getState();
    store.setPreviewStatus('updating');
    expect(useCleaningStore.getState().previewStatus).toBe('updating');
    store.setPreviewStatus('error', 'Step 1: Select an existing column.');
    expect(useCleaningStore.getState()).toMatchObject({
      previewStatus: 'error',
      previewError: 'Step 1: Select an existing column.',
    });
    store.setPreview(preview);
    expect(useCleaningStore.getState()).toMatchObject({
      preview,
      previewStatus: 'idle',
      previewError: '',
    });
  });

  it('reopens a collapsed steps panel when a step is added', () => {
    useCleaningStore.getState().setPanel('collapsed');
    useCleaningStore.getState().add('file-1', 'drop_duplicates', {});
    expect(useCleaningStore.getState().panel).toBe('open');
  });

  it('clearing a draft resets its preview and validation', () => {
    const store = useCleaningStore.getState();
    store.add('file-1', 'drop_duplicates', {});
    store.setPreview(preview);
    store.setValidation([{ index: 0, valid: true }]);
    store.clear('file-1');
    expect(useCleaningStore.getState()).toMatchObject({ preview: null, validation: [] });
  });

  it('converts steps to engine operations in list order', () => {
    const store = useCleaningStore.getState();
    store.add('file-1', 'drop_duplicates', {});
    store.add('file-1', 'drop_null_rows', { columns: ['x'] });
    store.toggle('file-1', steps()[1].id);
    expect(toOperations(steps())).toEqual([
      {
        type: 'drop_duplicates',
        parameters: {},
        enabled: true,
        order: 0,
        operation_id: steps()[0].id,
      },
      {
        type: 'drop_null_rows',
        parameters: { columns: ['x'] },
        enabled: false,
        order: 1,
        operation_id: steps()[1].id,
      },
    ]);
  });
});
