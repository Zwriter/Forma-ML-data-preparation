import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { profileRibbonActions } from '../../../src/features/profiling/profileRibbon';
import { ProfileDashboard } from '../../../src/features/profiling/ProfileDashboard';
import { useDatasetStore } from '../../../src/stores/datasetStore';
import { useProfileStore } from '../../../src/stores/profileStore';
import { demoProfile } from '../../../src/services/demoProfile';

const request = vi.hoisted(() => vi.fn());
vi.mock('../../../src/services/ipcClient', () => ({ request }));

describe('profileRibbonActions', () => {
  afterEach(() => {
    cleanup();
    request.mockReset();
    useProfileStore.setState({ entries: {} });
    useDatasetStore.setState({ dataset: null, history: null });
  });

  function renderReady() {
    useDatasetStore.setState({
      dataset: {
        dataset_id: 'dataset-1',
        source_path: 'a.csv',
        format: 'csv',
        columns: 21,
        rows: 7043,
        state: 'open',
        schema: [],
      },
      history: {
        history_id: 'history-1',
        dataset_id: 'dataset-1',
        current_index: 0,
        saved_index: 0,
        is_dirty: false,
        can_undo: false,
        can_redo: false,
        data_version: 'demo-v1',
      },
    });
    useProfileStore.setState({
      entries: {
        'history-1': {
          profile: { ...demoProfile, history_id: 'history-1' },
          status: 'ready',
          jobId: null,
          progress: null,
          message: null,
          error: null,
        },
      },
    });
    render(<ProfileDashboard />);
  }

  it('covers exactly the Overview and Quality commands', () => {
    expect(Object.keys(profileRibbonActions).sort()).toEqual(
      ['Column details', 'Data quality', 'Distribution', 'Duplicates', 'Refresh'].sort(),
    );
  });

  it('Refresh profiles the dataset again', async () => {
    renderReady();
    request.mockResolvedValue({ job_id: 'profile-2', state: 'pending' });
    await profileRibbonActions.Refresh();
    expect(request).toHaveBeenCalledWith('dataset.profile', { dataset_id: 'dataset-1' });
  });

  it.each([
    ['Column details', 'Columns'],
    ['Data quality', 'Data quality'],
    ['Distribution', 'Distribution of SeniorCitizen'],
  ])('%s moves focus to the %s region', (command, region) => {
    renderReady();
    profileRibbonActions[command]();
    expect(document.activeElement).toBe(screen.getByRole('region', { name: region }));
  });

  it('Duplicates moves focus to the Duplicate rows card', () => {
    renderReady();
    profileRibbonActions.Duplicates();
    expect(document.activeElement?.getAttribute('aria-label')).toBe(
      'Duplicate rows: 14, needs attention',
    );
  });
});
