import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import {
  PROFILE_TOOL_COMMANDS,
  closeProfileTool,
  profileCommand,
} from '../../../src/features/profiling/profileRibbon';
import { ProfileDashboard } from '../../../src/features/profiling/ProfileDashboard';
import { useDatasetStore } from '../../../src/stores/datasetStore';
import { useProfileStore } from '../../../src/stores/profileStore';
import { initialToolState, useProfileToolStore } from '../../../src/stores/profileToolStore';
import { demoProfile } from '../../../src/services/demoProfile';

const request = vi.hoisted(() => vi.fn());
vi.mock('../../../src/services/ipcClient', () => ({ request }));

const tool = () => useProfileToolStore.getState().tool;

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
  request.mockResolvedValue({ job_id: 'job-1', state: 'pending' });
  return render(
    <>
      <section aria-label="Profile toolbar">
        <button type="button" className="ribbon-action" aria-label="Patterns">
          Patterns
        </button>
      </section>
      <ProfileDashboard />
    </>,
  );
}

describe('Profile ribbon commands', () => {
  afterEach(() => {
    cleanup();
    request.mockReset();
    useProfileStore.setState({ entries: {} });
    useProfileToolStore.setState(initialToolState());
    useDatasetStore.setState({ dataset: null, history: null });
  });

  it('maps every Profile command except Refresh to its tool', () => {
    expect(PROFILE_TOOL_COMMANDS).toEqual({
      'Column details': 'column_details',
      'Data quality': 'data_quality',
      Distribution: 'distribution',
      Duplicates: 'duplicates',
      Patterns: 'patterns',
      Anomalies: 'anomalies',
      Recommendations: 'recommendations',
      Creations: 'creations',
    });
  });

  it('Refresh profiles the dataset again and is never pressed', async () => {
    renderReady();
    const refresh = profileCommand('Refresh', 'dashboard')!;
    expect(refresh.active).toBeUndefined();
    await act(async () => refresh.onClick());
    expect(request).toHaveBeenCalledWith('dataset.profile', { dataset_id: 'dataset-1' });
  });

  it('a tool command opens its tool in place of the dashboard and shows as pressed', () => {
    renderReady();
    expect(profileCommand('Patterns', tool())!.active).toBe(false);

    act(() => profileCommand('Patterns', tool())!.onClick());

    expect(tool()).toBe('patterns');
    expect(profileCommand('Patterns', tool())!.active).toBe(true);
    expect(screen.getByRole('region', { name: 'Patterns' })).not.toBeNull();
    expect(screen.queryByRole('list', { name: 'Dataset summary' })).toBeNull();
  });

  it('the pressed command, Back to dashboard, and Escape close the tool and focus the command', () => {
    renderReady();
    const ribbonButton = screen.getByRole('button', { name: 'Patterns' });

    act(() => profileCommand('Patterns', tool())!.onClick(ribbonButton));
    act(() => profileCommand('Patterns', tool())!.onClick(ribbonButton));
    expect(tool()).toBe('dashboard');
    expect(document.activeElement).toBe(ribbonButton);

    act(() => profileCommand('Patterns', tool())!.onClick());
    ribbonButton.blur();
    fireEvent.click(screen.getByRole('button', { name: 'Back to dashboard' }));
    expect(tool()).toBe('dashboard');
    expect(screen.getByRole('list', { name: 'Dataset summary' })).not.toBeNull();
    expect(document.activeElement).toBe(ribbonButton);

    act(() => profileCommand('Patterns', tool())!.onClick());
    ribbonButton.blur();
    fireEvent.keyDown(document.body, { key: 'Escape' });
    expect(tool()).toBe('dashboard');
    expect(document.activeElement).toBe(ribbonButton);
  });

  it('closing when no tool is open does nothing', () => {
    renderReady();
    closeProfileTool();
    expect(tool()).toBe('dashboard');
  });

  it('opening another dataset returns to the dashboard', () => {
    renderReady();
    act(() => profileCommand('Patterns', tool())!.onClick());
    act(() =>
      useDatasetStore.setState((state) => ({
        dataset: { ...state.dataset!, dataset_id: 'dataset-2' },
      })),
    );
    expect(tool()).toBe('dashboard');
  });

  it('other labels are not Profile commands', () => {
    expect(profileCommand('Save', 'dashboard')).toBeUndefined();
  });
});
