import { useState } from 'react';
import { ProfileDashboard } from '../profiling/ProfileDashboard';
import { ExportDialog } from '../export/ExportDialog';
import { useCleaningJob } from '../cleaning/useCleaningJob';
import { useExportJob } from '../export/useExportJob';
import { useWorkspaceStore } from '../../stores/workspaceStore';
import { useDatasetStore } from '../../stores/datasetStore';
import { DataOperationDialog } from './DataOperationDialog';
import { useDataOperation } from './useDataOperation';
import type { DataOperation } from '../../types/dataOperations';
import type { PopupPosition } from './popupPositions';

import { useWorkflowJobEvents } from './useWorkflowJobEvents';

export function WorkflowActions({
  activeTab,
  onSaveComplete,
  operationDialog,
  onCloseOperationDialog,
  popupPosition,
}: {
  activeTab: string;
  onSaveComplete?: (success: boolean) => void;
  operationDialog?: 'filter' | 'sort' | 'group_by' | 'pivot' | 'unpivot' | null;
  onCloseOperationDialog?: () => void;
  popupPosition?: PopupPosition;
}) {
  const { dataset } = useCleaningJob();
  const exportDataset = useExportJob();
  const setWorkspaceError = useWorkspaceStore((state) => state.setError);
  const [busy, setBusy] = useState(false);
  const startDataOperation = useDataOperation();
  const activeSort = useDatasetStore((state) => state.preview?.view);
  useWorkflowJobEvents(onSaveComplete);

  if (!dataset) return null;
  async function runExport(destination: string, format: 'csv' | 'parquet', overwrite: boolean) {
    setBusy(true);
    try {
      await exportDataset(destination, format, overwrite);
    } catch (error) {
      setWorkspaceError(error instanceof Error ? error.message : 'Export failed.');
    } finally {
      setBusy(false);
    }
  }
  async function runDataOperation(operation: DataOperation) {
    setBusy(true);
    if (await startDataOperation(operation)) onCloseOperationDialog?.();
    setBusy(false);
  }
  return (
    <>
      {activeTab === 'Profile' && <ProfileDashboard />}
      {activeTab === 'Export' && (
        <ExportDialog
          busy={busy}
          onExport={(destination, format, overwrite) =>
            void runExport(destination, format, overwrite)
          }
        />
      )}
      {activeTab === 'Data' && (
        <DataOperationDialog
          kind={operationDialog ?? null}
          popupPosition={popupPosition}
          columns={dataset.schema}
          activeSort={activeSort}
          busy={busy}
          onApply={(operation) => void runDataOperation(operation)}
          onClose={() => onCloseOperationDialog?.()}
        />
      )}
      {activeTab === 'Pipelines' && (
        <section className="card workflow-card" id="pipelines">
          <h2>Pipelines</h2>
          <p>Pipeline management is not available yet.</p>
        </section>
      )}
    </>
  );
}
