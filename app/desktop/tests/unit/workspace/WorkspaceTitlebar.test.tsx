import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { WorkspaceTitlebar } from '../../../src/features/workspace/WorkspaceTitlebar';
import type { OpenFileTab } from '../../../src/stores/datasetStore';

const files: OpenFileTab[] = [
  {
    id: 'one',
    dataset: {
      dataset_id: 'one',
      source_path: 'one.csv',
      format: 'csv',
      schema: [],
      columns: 0,
      rows: 0,
      state: 'open',
    },
    preview: {
      dataset_id: 'one',
      columns: [],
      records: [],
      offset: 0,
      limit: 100,
      total_count: 0,
    },
    sourceDataset: {
      dataset_id: 'one',
      source_path: 'one.csv',
      format: 'csv',
      schema: [],
      columns: 0,
      rows: 0,
      state: 'open',
    },
    sourcePreview: {
      dataset_id: 'one',
      columns: [],
      records: [],
      offset: 0,
      limit: 100,
      total_count: 0,
    },
    history: {
      history_id: 'one-history',
      dataset_id: 'one',
      current_index: 1,
      saved_index: 0,
      is_dirty: true,
      can_undo: true,
      can_redo: false,
    },
    selectedColumns: [],
  },
];

describe('workspace file tabs', () => {
  it('shows unsaved state and supports selecting and closing a file', () => {
    const onSelectFile = vi.fn();
    const onCloseFile = vi.fn();
    render(
      <WorkspaceTitlebar
        files={files}
        activeFileId="one"
        busy={false}
        isDirty
        onSelectFile={onSelectFile}
        onCloseFile={onCloseFile}
        onClose={vi.fn()}
      />,
    );

    expect(screen.getByRole('tab', { name: 'one.csv' }).getAttribute('aria-selected')).toBe('true');
    expect(screen.getByTitle('one.csv has unsaved changes')).toBeTruthy();
    fireEvent.click(screen.getByRole('tab', { name: 'one.csv' }));
    fireEvent.click(screen.getByRole('button', { name: 'Close one.csv' }));

    expect(onSelectFile).toHaveBeenCalledWith('one');
    expect(onCloseFile).toHaveBeenCalledWith('one');
  });
});
