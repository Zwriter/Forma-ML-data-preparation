import { useCallback } from 'react';
import { applyDataOperation } from '../../services/dataOperationClient';
import { useDatasetStore } from '../../stores/datasetStore';
import { useWorkspaceStore } from '../../stores/workspaceStore';
import type { DataOperation } from '../../types/dataOperations';

/**
 * Start a Data operation job on the open dataset. The workspace stays busy until the job's
 * completion event arrives; a failure to start is shown as a workspace error.
 * Resolves true when the job started.
 */
export function useDataOperation() {
  const setBusy = useWorkspaceStore((state) => state.setBusy);
  const setError = useWorkspaceStore((state) => state.setError);
  return useCallback(
    async (operation: DataOperation) => {
      const dataset = useDatasetStore.getState().dataset;
      if (!dataset) return false;
      setBusy(true);
      try {
        await applyDataOperation(dataset.dataset_id, operation);
        return true;
      } catch (cause) {
        setBusy(false);
        const raw = operation.type.replaceAll('_', ' ');
        const label = raw.charAt(0).toUpperCase() + raw.slice(1);
        const detail = cause instanceof Error ? cause.message : 'Could not start this operation.';
        setError(`${label} failed: ${detail}`);
        return false;
      }
    },
    [setBusy, setError],
  );
}
