import { afterEach, describe, expect, it, vi } from 'vitest';
import { readViews, useViewMaskStore, VIEWS_KEY } from '../../../src/stores/viewMaskStore';
import type { SortKey } from '../../../src/types/dataOperations';

const CITY: SortKey[] = [{ column: 'city', direction: 'descending', nulls: 'last' }];

describe('viewMaskStore', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    window.localStorage.clear();
    useViewMaskStore.setState({ views: {} });
  });

  it('remembers a view per path and persists it', () => {
    useViewMaskStore.getState().remember(['C:\\data\\people.csv'], CITY);

    expect(useViewMaskStore.getState().viewFor('C:\\data\\people.csv')).toEqual(CITY);
    expect(JSON.parse(window.localStorage.getItem(VIEWS_KEY) ?? '{}')).toEqual({
      'C:/data/people.csv': CITY,
    });
  });

  it('treats forward and back slashes as the same path', () => {
    useViewMaskStore.getState().remember(['C:/data/people.csv'], CITY);

    expect(useViewMaskStore.getState().viewFor('C:\\data\\people.csv')).toEqual(CITY);
  });

  it('forgets a path when its view is cleared and returns stored order for unknown paths', () => {
    const store = useViewMaskStore.getState();
    store.remember(['a.csv', 'b.csv'], CITY);
    store.remember(['a.csv'], []);

    expect(useViewMaskStore.getState().viewFor('a.csv')).toEqual([]);
    expect(useViewMaskStore.getState().viewFor('b.csv')).toEqual(CITY);
    expect(Object.keys(JSON.parse(window.localStorage.getItem(VIEWS_KEY) ?? '{}'))).toEqual([
      'b.csv',
    ]);
  });

  it('reads saved views and ignores malformed storage', () => {
    window.localStorage.setItem(VIEWS_KEY, JSON.stringify({ 'a.csv': CITY, 'b.csv': 'bad' }));
    expect(readViews()).toEqual({ 'a.csv': CITY });

    window.localStorage.setItem(VIEWS_KEY, '{not json');
    expect(readViews()).toEqual({});
  });

  it('keeps the view for this session when storage fails', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('quota');
    });

    useViewMaskStore.getState().remember(['a.csv'], CITY);

    expect(useViewMaskStore.getState().viewFor('a.csv')).toEqual(CITY);
  });
});
