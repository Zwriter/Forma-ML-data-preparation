import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  PROFILE_COLUMNS_KEY,
  readHiddenColumns,
  useProfileStore,
} from '../../../src/stores/profileStore';

describe('profile table preferences', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    window.localStorage.clear();
    useProfileStore.setState({ hiddenColumns: [] });
  });

  it('toggles a column and persists the choice', () => {
    useProfileStore.getState().toggleColumn('examples');
    expect(useProfileStore.getState().hiddenColumns).toEqual(['examples']);
    expect(JSON.parse(window.localStorage.getItem(PROFILE_COLUMNS_KEY)!)).toEqual(['examples']);

    useProfileStore.getState().toggleColumn('examples');
    expect(useProfileStore.getState().hiddenColumns).toEqual([]);
  });

  it('drops unknown values and survives unreadable storage', () => {
    window.localStorage.setItem(PROFILE_COLUMNS_KEY, '["type","bogus",3]');
    expect(readHiddenColumns()).toEqual(['type']);

    window.localStorage.setItem(PROFILE_COLUMNS_KEY, 'not json');
    expect(readHiddenColumns()).toEqual([]);

    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    expect(readHiddenColumns()).toEqual([]);
  });

  it('keeps working when storage cannot be written', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('full');
    });
    useProfileStore.getState().toggleColumn('missing');
    expect(useProfileStore.getState().hiddenColumns).toEqual(['missing']);
  });
});
