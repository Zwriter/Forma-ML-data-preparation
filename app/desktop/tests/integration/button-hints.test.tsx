import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import App from '../../src/App';
import { useDatasetStore } from '../../src/stores/datasetStore';
import { useWorkspaceStore } from '../../src/stores/workspaceStore';
import { draftKey, useCleaningStore } from '../../src/stores/cleaningStore';

const invoke = vi.hoisted(() => vi.fn());
vi.mock('@tauri-apps/api/core', () => ({ invoke: (...args: unknown[]) => invoke(...args) }));
vi.mock('@tauri-apps/plugin-dialog', () => ({ open: vi.fn(), save: vi.fn() }));
vi.mock('@tauri-apps/api/event', () => ({ listen: vi.fn(async () => () => undefined) }));

const schema = [
  { name: 'city', type: 'String', nullable: true },
  { name: 'n', type: 'Int64', nullable: true },
];
const dataset = {
  dataset_id: 'd1',
  source_path: 'people.csv',
  format: 'csv' as const,
  columns: 2,
  rows: 1,
  state: 'open',
  schema,
};
const page = {
  dataset_id: 'd1',
  columns: schema,
  records: [{ city: 'Oslo', n: null }],
  offset: 0,
  limit: 1000,
  total_count: 1,
};

function engine(method: string, params: Record<string, any>) {
  if (method === 'cleaning.validate')
    return {
      valid: true,
      steps: params.operations.map((_: unknown, index: number) => ({ index, valid: true })),
    };
  if (method === 'cleaning.preview')
    return {
      columns: schema.map((column) => ({ ...column, origin: column.name })),
      rows: [{ values: { city: 'Oslo', n: 0 }, removed: false }],
      changed_cells: [{ row: 0, column: 'n', before: null }],
      offset: 0,
      limit: 1000,
      total_count: 1,
      summary: {
        rows_before: 1,
        rows_after: 1,
        rows_removed: 0,
        values_changed: 1,
        columns_added: [],
        columns_removed: [],
        columns_renamed: [],
      },
    };
  return {};
}

/** Buttons whose only visible content is a symbol or icon: these need a hover hint. */
function unhinted() {
  return [...document.querySelectorAll('button')]
    .filter((button) => {
      const copy = button.cloneNode(true) as HTMLElement;
      copy.querySelectorAll('.sr-only, [aria-hidden="true"], svg').forEach((node) => node.remove());
      return !/\p{L}/u.test(copy.textContent ?? '') && !button.title.trim();
    })
    .map((button) => button.getAttribute('aria-label') ?? button.outerHTML.slice(0, 80));
}

describe('hover hints on icon-only buttons', () => {
  afterEach(() => {
    cleanup();
    invoke.mockReset();
    useDatasetStore.setState({ dataset: null, preview: null, history: null, openFiles: [] });
    useWorkspaceStore.setState({ busy: false, error: null, notification: null, commands: {} });
    useCleaningStore.setState({ drafts: {}, form: null, preview: null });
  });

  it('gives every icon-only button a title on the Data and Clean tabs', async () => {
    invoke.mockImplementation(async (_command: string, args: { request: any }) => ({
      id: args.request.id,
      status: 'success',
      result: engine(args.request.method, args.request.params),
      error: null,
    }));
    useDatasetStore.getState().setSource(dataset, page);
    useDatasetStore.getState().setHistory({
      history_id: 'h',
      dataset_id: 'd1',
      current_index: 0,
      saved_index: 0,
      is_dirty: false,
      can_undo: false,
      can_redo: false,
    });
    render(<App />);
    useWorkspaceStore.getState().setError('Something failed');

    // Data tab: title bar, ribbon, worksheet, pager, column details, sort dialog, notice.
    fireEvent.contextMenu(screen.getByRole('button', { name: /Show details for city/ }));
    await screen.findByRole('button', { name: 'Close column details' });
    expect(unhinted()).toEqual([]);
    fireEvent.click(screen.getByRole('button', { name: 'Sort' }));
    fireEvent.click(await screen.findByText('Add sort key'));
    expect(unhinted()).toEqual([]);

    // Clean tab with a draft step and the steps panel open.
    fireEvent.click(screen.getByRole('link', { name: 'Clean' }));
    await act(async () => {
      const key = draftKey(useDatasetStore.getState());
      useCleaningStore.getState().add(key, 'fill_null', {
        column: 'n',
        strategy: 'constant',
        value: 0,
      });
    });
    await screen.findByRole('complementary', { name: 'Cleaning steps' });
    expect(unhinted()).toEqual([]);
  });
});
