import { useState } from 'react';
import { TransformationBuilder } from '../cleaning/TransformationBuilder';
import { BeforeAfterComparison } from '../cleaning/BeforeAfterComparison';
import { ProfilePanel } from '../profiling/ProfilePanel';
import { ExportDialog } from '../export/ExportDialog';
import { useCleaningJob } from '../cleaning/useCleaningJob';
import { useProfileJob } from '../profiling/useProfileJob';
import { useExportJob } from '../export/useExportJob';
import { request } from '../../services/ipcClient';
import type { Operation } from '../../types/transformation';
import { useWorkspaceStore } from '../../stores/workspaceStore';
import { DataOperationDialog } from './DataOperationDialog';
import { applyDataOperation } from '../../services/dataOperationClient';
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
  const { dataset, apply } = useCleaningJob();
  const profile = useProfileJob();
  const exportDataset = useExportJob();
  const setWorkspaceError = useWorkspaceStore((state) => state.setError);
  const [comparison, setComparison] = useState<{
    before: Record<string, unknown>[];
    after: Record<string, unknown>[];
  } | null>(null);
  const [report, setReport] = useState<Record<string, unknown> | null>(null);
  const [busy, setBusy] = useState(false);
  const setStoreBusy = useWorkspaceStore((state) => state.setBusy);
  useWorkflowJobEvents(onSaveComplete, setReport);

  if (!dataset) return null;
  async function previewOperation(operation: Operation) {
    setBusy(true);
    try {
      const result = await requestPreview(operation);
      setComparison(result);
    } catch (error) {
      setWorkspaceError(error instanceof Error ? error.message : 'Preview failed.');
    } finally {
      setBusy(false);
    }
  }
  async function applyOperations(operations: Operation[]) {
    setBusy(true);
    try {
      await apply(operations);
    } catch (error) {
      setWorkspaceError(error instanceof Error ? error.message : 'Cleaning failed.');
    } finally {
      setBusy(false);
    }
  }
  async function requestPreview(operation: Operation) {
    if (!dataset) throw new Error('Open a dataset before previewing transformations.');
    return request<{ before: Record<string, unknown>[]; after: Record<string, unknown>[] }>(
      'cleaning.preview',
      { dataset_id: dataset.dataset_id, operation },
    );
  }
  async function runProfile() {
    setBusy(true);
    try {
      await profile();
    } catch (error) {
      setWorkspaceError(error instanceof Error ? error.message : 'Profile failed.');
    } finally {
      setBusy(false);
    }
  }
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
    if (!dataset) return;
    const rawLabel = operation.type.replaceAll('_', ' ');
    const label = rawLabel.charAt(0).toUpperCase() + rawLabel.slice(1);
    setBusy(true);
    setStoreBusy(true);
    try {
      await applyDataOperation(dataset.dataset_id, operation);
      onCloseOperationDialog?.();
    } catch (cause) {
      setStoreBusy(false);
      const detail = cause instanceof Error ? cause.message : 'Could not start this operation.';
      setWorkspaceError(`${label} failed: ${detail}`);
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      {activeTab === 'Profile' && (
        <section className="card workflow-card" id="profile">
          <h2>Data profile</h2>
          <button disabled={busy} onClick={() => void runProfile()}>
            Profile dataset
          </button>
          <ProfilePanel report={report} />
        </section>
      )}
      {activeTab === 'Clean' && (
        <>
          <TransformationBuilder
            onPreview={(operation) => void previewOperation(operation)}
            onApply={(operations) => void applyOperations(operations)}
          />
          {comparison && (
            <section className="card">
              <h2>Transformation preview</h2>
              <BeforeAfterComparison before={comparison.before} after={comparison.after} />
            </section>
          )}
        </>
      )}
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
