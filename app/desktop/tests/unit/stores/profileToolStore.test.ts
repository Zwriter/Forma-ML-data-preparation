import { afterEach, describe, expect, it } from 'vitest';
import {
  AUTO_REFRESH_KEY,
  initialToolState,
  readAutoRefresh,
  useProfileToolStore,
} from '../../../src/stores/profileToolStore';

const store = () => useProfileToolStore.getState();

describe('profileToolStore', () => {
  afterEach(() => {
    useProfileToolStore.setState(initialToolState());
    window.localStorage.clear();
  });

  it('opens one tool at a time and closes back to the dashboard', () => {
    expect(store().tool).toBe('dashboard');
    store().open('patterns');
    expect(store().tool).toBe('patterns');
    store().open('duplicates');
    expect(store().tool).toBe('duplicates');
    store().close();
    expect(store().tool).toBe('dashboard');
  });

  it('keeps inputs per tool for the session', () => {
    store().setInput('distribution', 'bins', 50);
    store().setInput('distribution', 'column', 'tenure');
    store().setInput('duplicates', 'columns', ['email']);
    expect(store().inputs.distribution).toEqual({ bins: 50, column: 'tenure' });
    expect(store().inputs.duplicates).toEqual({ columns: ['email'] });
  });

  it('tracks a tool request from start through progress to its result', () => {
    store().start('patterns', 'key-1', 'v1', 'request:patterns');
    store().rename('request:patterns', 'job-1');
    store().progress('job-1', 0.5, 'Correlating');
    expect(store().results.patterns).toMatchObject({
      status: 'running',
      jobId: 'job-1',
      requestKey: 'key-1',
      dataVersion: 'v1',
      progress: 0.5,
      message: 'Correlating',
    });

    store().complete('job-1', { strongest: [] });
    expect(store().results.patterns).toMatchObject({
      status: 'ready',
      jobId: null,
      result: { strongest: [] },
      error: null,
    });
  });

  it('keeps the previous result while a newer request runs, and on cancel', () => {
    store().start('anomalies', 'k1', 'v1', 'job-1');
    store().complete('job-1', { columns: ['spend'] });
    store().start('anomalies', 'k2', 'v2', 'job-2');
    expect(store().results.anomalies?.result).toEqual({ columns: ['spend'] });
    store().cancel('job-2');
    expect(store().results.anomalies).toMatchObject({ status: 'ready', jobId: null });
  });

  it('records failures and ignores events for jobs it does not know', () => {
    store().start('rows', 'k1', 'v1', 'job-1');
    store().complete('other', { nope: true });
    store().fail('job-1', { code: 'INTERNAL_ERROR', message: 'Broke' });
    expect(store().results.rows).toMatchObject({
      status: 'failed',
      error: { message: 'Broke' },
      result: null,
    });
  });

  it('hides dismissed suggestions only for the data version they were dismissed on', () => {
    store().dismiss('v1', 'fill_missing:amount');
    store().dismiss('v1', 'drop_constant:flat');
    expect(store().dismissed).toEqual({ v1: ['fill_missing:amount', 'drop_constant:flat'] });
    expect(store().dismissed.v2).toBeUndefined();
  });

  it('remembers Refresh automatically across sessions, off by default', () => {
    expect(readAutoRefresh()).toBe(false);
    store().setAutoRefresh(true);
    expect(store().autoRefresh).toBe(true);
    expect(window.localStorage.getItem(AUTO_REFRESH_KEY)).toBe('true');
    expect(readAutoRefresh()).toBe(true);
  });

  it('starts over when the tools are shown for another dataset', () => {
    store().showFor('dataset-1');
    store().open('patterns');
    store().showFor('dataset-1');
    expect(store().tool).toBe('patterns');
    store().showFor('dataset-2');
    expect(store()).toMatchObject({ tool: 'dashboard', datasetId: 'dataset-2' });
  });

  it('resets the tool, inputs, results and dismissals but keeps the preference', () => {
    store().setAutoRefresh(true);
    store().open('patterns');
    store().setInput('rows', 'offset', 100);
    store().start('patterns', 'k', 'v1', 'job-1');
    store().dismiss('v1', 'x');
    store().reset();
    expect(store()).toMatchObject({
      tool: 'dashboard',
      inputs: {},
      results: {},
      dismissed: {},
      autoRefresh: true,
    });
  });
});
