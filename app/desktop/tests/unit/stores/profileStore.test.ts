import { afterEach, describe, expect, it } from 'vitest';
import { isStale, useProfileStore } from '../../../src/stores/profileStore';
import { demoProfile } from '../../../src/services/demoProfile';

const H = demoProfile.history_id;
const store = () => useProfileStore.getState();

describe('profileStore', () => {
  afterEach(() => useProfileStore.setState({ entries: {} }));

  it('tracks a run from start through progress to a finished profile', () => {
    store().start(H, 'job-1');
    expect(store().entries[H]).toMatchObject({ status: 'running', jobId: 'job-1', progress: 0 });

    store().progress('job-1', 0.3, 'Computing column statistics');
    expect(store().entries[H]).toMatchObject({
      progress: 0.3,
      message: 'Computing column statistics',
    });

    store().complete('job-1', demoProfile);
    expect(store().entries[H]).toMatchObject({ status: 'ready', jobId: null, error: null });
    expect(store().entries[H].profile).toBe(demoProfile);
  });

  it('ignores events for jobs it did not start', () => {
    store().progress('other', 0.5, 'x');
    store().complete('other', demoProfile);
    expect(store().entries).toEqual({});
  });

  it('keeps the previous profile when a run fails or is cancelled', () => {
    store().start(H, 'job-1');
    store().complete('job-1', demoProfile);

    store().start(H, 'job-2');
    store().fail('job-2', { code: 'INTERNAL_ERROR', message: 'The operation failed.' });
    expect(store().entries[H]).toMatchObject({ status: 'failed', profile: demoProfile });

    store().start(H, 'job-3');
    store().cancel('job-3');
    expect(store().entries[H]).toMatchObject({ status: 'ready', profile: demoProfile });
  });

  it('returns to idle when the first run is cancelled', () => {
    store().start(H, 'job-1');
    store().cancel('job-1');
    expect(store().entries[H]).toMatchObject({ status: 'idle', profile: null });
  });

  it('derives staleness from the data version', () => {
    expect(isStale(undefined, 'demo-v1')).toBe(false);
    store().start(H, 'job-1');
    store().complete('job-1', demoProfile);
    const entry = store().entries[H];
    expect(isStale(entry, 'demo-v1')).toBe(false);
    expect(isStale(entry, 'demo-v2')).toBe(true);
  });
});
