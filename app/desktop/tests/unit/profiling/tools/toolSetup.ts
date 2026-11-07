import type { Mock } from 'vitest';
import { cleanup } from '@testing-library/react';
import { demoProfile } from '../../../../src/services/demoProfile';
import { demoProfileTool } from '../../../../src/services/demoProfileTools';
import { useCleaningStore } from '../../../../src/stores/cleaningStore';
import { useDatasetStore } from '../../../../src/stores/datasetStore';
import { useProfileStore } from '../../../../src/stores/profileStore';
import {
  initialToolState,
  useProfileToolStore,
  type ProfileTool,
} from '../../../../src/stores/profileToolStore';
import { useWorkspaceStore } from '../../../../src/stores/workspaceStore';

/** Opens the demo dataset with a current profile; `request` answers like demo mode. */
export function openDemoTool(request: Mock, tool: ProfileTool) {
  request.mockImplementation(async (method: string, params: Record<string, unknown>) =>
    demoProfileTool(method, params),
  );
  useDatasetStore.setState({
    activeFileId: 'file-1',
    dataset: {
      dataset_id: 'demo',
      source_path: 'telco.csv',
      format: 'csv',
      columns: 21,
      rows: 7043,
      state: 'open',
      schema: [],
    },
    history: {
      history_id: demoProfile.history_id,
      dataset_id: 'demo',
      current_index: 0,
      saved_index: 0,
      is_dirty: false,
      can_undo: false,
      can_redo: false,
      data_version: demoProfile.data_version,
    },
  } as never);
  useProfileStore.setState({
    entries: {
      [demoProfile.history_id]: {
        profile: demoProfile,
        status: 'ready',
        jobId: null,
        progress: null,
        message: null,
        error: null,
      },
    },
  });
  useProfileToolStore.setState({ ...initialToolState(), datasetId: 'demo', tool });
}

export function resetTools(request: Mock) {
  cleanup();
  request.mockReset();
  useProfileStore.setState({ entries: {}, chartColumns: {} });
  useProfileToolStore.setState(initialToolState());
  useCleaningStore.setState({ drafts: {} });
  useWorkspaceStore.setState({ notification: null });
}

/** The parameters of the last request for `method`. */
export const lastParams = (request: Mock, method: string) =>
  request.mock.calls.filter(([name]) => name === method).at(-1)?.[1];
