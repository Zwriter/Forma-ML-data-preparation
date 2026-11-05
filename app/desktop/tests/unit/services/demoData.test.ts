import { beforeEach, describe, expect, it, vi } from 'vitest';
import { parseCsv, requestDemo, setDemoFile } from '../../../src/services/demoData';

function createIndexedDbMock(): IDBFactory {
  const files = new Map<string, string>();
  let opened = false;
  const database = {
    createObjectStore: vi.fn(),
    close: vi.fn(),
    transaction: () => {
      const transaction: Record<string, unknown> = { error: null };
      transaction.objectStore = () => ({
        put: (value: string, key: string) => {
          files.set(key, value);
          queueMicrotask(() => (transaction.oncomplete as (() => void) | null)?.());
        },
        get: (key: string) => {
          const request: Record<string, unknown> = { result: undefined, error: null };
          queueMicrotask(() => {
            request.result = files.get(key);
            (request.onsuccess as (() => void) | null)?.();
          });
          return request;
        },
      });
      return transaction;
    },
  };
  return {
    open: () => {
      const request: Record<string, unknown> = { result: database, error: null };
      queueMicrotask(() => {
        if (!opened) {
          opened = true;
          (request.onupgradeneeded as (() => void) | null)?.();
        }
        (request.onsuccess as (() => void) | null)?.();
      });
      return request;
    },
  } as unknown as IDBFactory;
}

beforeEach(() => {
  Object.defineProperty(globalThis, 'indexedDB', {
    configurable: true,
    value: createIndexedDbMock(),
  });
});

describe('browser demo CSV', () => {
  it('infers columns and preserves quoted commas and escaped quotes', () => {
    const parsed = parseCsv('name,amount\n"Notebook, ruled",12\n"A ""special"" pen",');

    expect(parsed.dataset.format).toBe('csv');
    expect(parsed.dataset.rows).toBe(2);
    expect(parsed.dataset.schema).toEqual([
      { name: 'name', type: 'String', nullable: false },
      { name: 'amount', type: 'Float64', nullable: true },
    ]);
    expect(parsed.records).toEqual([
      { name: 'Notebook, ruled', amount: '12' },
      { name: 'A "special" pen', amount: '' },
    ]);
  });

  it('opens the selected CSV instead of returning the default sample', async () => {
    const datasetId = await setDemoFile('city,population\nOslo,709000', 'cities.csv');

    const dataset = await requestDemo<{ source_path: string; rows: number }>('dataset.open', {
      path: datasetId,
    });
    const preview = await requestDemo<{ records: Record<string, string>[] }>('dataset.preview', {
      dataset_id: dataset.dataset_id,
    });

    expect(dataset).toMatchObject({ dataset_id: datasetId, source_path: 'cities.csv', rows: 1 });
    expect(preview.records).toEqual([{ city: 'Oslo', population: '709000' }]);
  });

  it('keeps multiple selected CSVs available for their own tabs', async () => {
    const firstId = await setDemoFile('city\nOslo', 'places.csv');
    const secondId = await setDemoFile('city\nTokyo', 'places.csv');

    const first = await requestDemo<{ dataset_id: string }>('dataset.open', { path: firstId });
    const second = await requestDemo<{ dataset_id: string }>('dataset.open', { path: secondId });
    const firstPreview = await requestDemo<{ records: Record<string, string>[] }>(
      'dataset.preview',
      { dataset_id: first.dataset_id },
    );
    const secondPreview = await requestDemo<{ records: Record<string, string>[] }>(
      'dataset.preview',
      { dataset_id: second.dataset_id },
    );

    expect(first.dataset_id).not.toBe(second.dataset_id);
    expect(firstPreview.records).toEqual([{ city: 'Oslo' }]);
    expect(secondPreview.records).toEqual([{ city: 'Tokyo' }]);
  });

  it('reopens a selected CSV through its recent-file path', async () => {
    await setDemoFile('city\nOslo', 'places.csv');

    const reopened = await requestDemo<{ source_path: string; rows: number }>('dataset.open', {
      path: 'places.csv',
    });
    expect(reopened).toMatchObject({ source_path: 'places.csv', rows: 1 });
    expect(reopened.dataset_id).toMatch(/^demo-dataset-/);
  });

  it('restores a selected CSV from persistent storage after a reload', async () => {
    const { setDemoFile: persistFile } = await import('../../../src/services/demoData');
    await persistFile('city\nOslo', 'persisted-places.csv');

    vi.resetModules();
    const { requestDemo: requestAfterReload } = await import('../../../src/services/demoData');
    const reopened = await requestAfterReload<{ source_path: string; rows: number }>(
      'dataset.open',
      { path: 'persisted-places.csv' },
    );

    expect(reopened).toMatchObject({ source_path: 'persisted-places.csv', rows: 1 });
  });

  it('does not silently open the sample for an unselected path', async () => {
    await expect(requestDemo('dataset.open', { path: 'other.csv' })).rejects.toThrow(
      'Select the local CSV with Browse files',
    );
  });

  it('stubs cleaning validate and preview so the Clean tab works in demo mode', async () => {
    const datasetId = await setDemoFile('city,code\nOslo,N/A\nRome,IT', 'codes.csv');
    const operations = [
      {
        type: 'replace_values',
        parameters: { columns: ['code'], find: 'n/a', replace: null, match: 'whole' },
        enabled: true,
        order: 0,
        operation_id: 'step-1',
      },
    ];

    const validation = await requestDemo('cleaning.validate', {
      dataset_id: datasetId,
      operations,
    });
    const preview = await requestDemo<{
      rows: { values: Record<string, unknown>; removed: boolean }[];
      changed_cells: { row: number; column: string }[];
      columns: { name: string; origin: string | null }[];
      total_count: number;
    }>('cleaning.preview', { dataset_id: datasetId, operations, offset: 0, limit: 10 });

    expect(validation).toEqual({
      valid: true,
      steps: [{ index: 0, operation_id: 'step-1', valid: true }],
    });
    expect(preview.rows.map((row) => row.values.code)).toEqual([null, 'IT']);
    expect(preview.changed_cells).toEqual([{ row: 0, column: 'code', before: 'N/A' }]);
    expect(preview.columns.map((column) => column.origin)).toEqual(['city', 'code']);
    expect(preview.total_count).toBe(2);
  });

  it('answers profile requests with a finished fixture profile and a data version', async () => {
    const datasetId = await setDemoFile('city\nOslo', 'profile.csv');

    const ack = await requestDemo<{ state: string; result: { data_version: string } }>(
      'dataset.profile',
      { dataset_id: datasetId },
    );
    const history = await requestDemo<{ data_version: string }>('dataset.history', {
      dataset_id: datasetId,
    });

    expect(ack.state).toBe('completed');
    expect(ack.result.data_version).toBe(history.data_version);
  });
});
