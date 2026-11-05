import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { request } from '../../services/ipcClient';
import { draftKey, useCleaningStore } from '../../stores/cleaningStore';
import { useDatasetStore } from '../../stores/datasetStore';
import { useWorkspaceStore } from '../../stores/workspaceStore';
import type { CleaningStep, WorksheetMarkers } from '../../types/cleaning';
import type { Preview } from '../../types/dataset';
import { DraftActions } from './DraftActions';
import { StepFormDialog } from './StepFormDialog';
import { StepsPanel } from './StepsPanel';
import { stepCatalog } from './stepCatalog';
import { toWorksheet } from './previewMarkers';
import { useCleaningJob } from './useCleaningJob';
import { useLivePreview } from './useLivePreview';
import '../../styles/cleaning.css';

const noSteps: CleaningStep[] = [];
const message = (cause: unknown) => (cause instanceof Error ? cause.message : 'Unknown error.');

export function CleanTab({
  worksheet,
}: {
  worksheet: (page: Preview | null, markers?: WorksheetMarkers) => ReactNode;
}) {
  const { dataset, validate, apply } = useCleaningJob();
  const page = useDatasetStore((state) => state.preview);
  const fileId = useDatasetStore(draftKey);
  const steps = useCleaningStore((state) => state.drafts[fileId] ?? noSteps);
  const form = useCleaningStore((state) => state.form);
  const validation = useCleaningStore((state) => state.validation);
  const stepColumns = useCleaningStore((state) => state.stepColumns);
  const applyJobId = useCleaningStore((state) => state.applyJobId);
  const live = useCleaningStore((state) => state.preview);
  const previewStatus = useCleaningStore((state) => state.previewStatus);
  const previewError = useCleaningStore((state) => state.previewError);
  const cleaning = useCleaningStore.getState();
  const setWorkspaceBusy = useWorkspaceStore((state) => state.setBusy);
  const setWorkspaceError = useWorkspaceStore((state) => state.setError);
  const [starting, setStarting] = useState(false);
  const { setValidation } = cleaning;
  useLivePreview(steps);

  // Revalidate on every draft change and whenever undo/redo swaps the current dataset.
  useEffect(() => {
    let current = true;
    if (!steps.length) setValidation([]);
    else
      validate(steps)
        .then((result) => current && setValidation(result?.steps ?? [], result?.columns))
        .catch(() => current && setValidation([]));
    return () => {
      current = false;
    };
  }, [steps, validate, setValidation]);

  if (!dataset) return null;
  const enabled = steps.filter((step) => step.enabled);
  const invalid = validation.some((item) => !item.valid);
  const editing = steps.find((step) => step.id === form?.editingId);
  // A form offers the columns that exist at its step; a new step goes after all of them.
  const formColumns =
    stepColumns[editing ? steps.indexOf(editing) : steps.length] ??
    stepColumns.at(-1) ??
    dataset.schema;
  const shown = live ? toWorksheet(dataset.dataset_id, live) : null;

  async function runApply() {
    setStarting(true);
    setWorkspaceBusy(true);
    try {
      const acknowledgement = await apply(steps);
      if (acknowledgement) cleaning.setApplyJobId(acknowledgement.job_id);
    } catch (cause) {
      setWorkspaceBusy(false);
      setWorkspaceError(`Cleaning failed: ${message(cause)}`);
    } finally {
      setStarting(false);
    }
  }

  async function stop() {
    if (!applyJobId) return;
    try {
      await request('job.cancel', { job_id: applyJobId });
    } catch (cause) {
      setWorkspaceError(`Stop failed: ${message(cause)}`);
    }
  }

  return (
    <>
      <div className="clean-stage" id="clean">
        {worksheet(shown?.page ?? page, shown?.markers)}
        <StepsPanel
          steps={steps}
          validation={validation}
          disabled={Boolean(applyJobId)}
          onAdd={(type) => cleaning.openForm(type)}
        >
          {previewStatus === 'error' ? (
            <p className="step-error" role="alert">
              {previewError}
            </p>
          ) : (
            <p className="clean-status" role="status">
              {previewStatus === 'updating' ? 'Updating preview…' : ''}
            </p>
          )}
          <DraftActions
            stepCount={steps.length}
            enabledCount={enabled.length}
            running={Boolean(applyJobId)}
            canApply={enabled.length > 0 && !invalid && !starting}
            onApply={() => void runApply()}
            onStop={() => void stop()}
            onDiscard={() => cleaning.clear(fileId)}
          />
        </StepsPanel>
      </div>
      {form && (
        <StepFormDialog
          // A new form (another command or step) starts from its own parameters.
          key={`${form.type}:${form.editingId}`}
          form={form}
          columns={formColumns}
          parameters={editing?.parameters ?? stepCatalog[form.type].defaults(formColumns)}
          onClose={cleaning.closeForm}
          onSave={(parameters, type) => {
            if (editing) cleaning.update(fileId, editing.id, parameters, type);
            else cleaning.add(fileId, type, parameters);
            cleaning.closeForm();
          }}
        />
      )}
    </>
  );
}
