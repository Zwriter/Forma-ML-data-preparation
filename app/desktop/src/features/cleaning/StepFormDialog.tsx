import { useEffect, useRef, useState } from 'react';
import { DragGrip } from '../../components/DragGrip';
import { popupStyle } from '../workspace/popupPositions';
import type { StepForm, StepType } from '../../types/cleaning';
import type { Column } from '../../types/dataset';
import { FieldError } from './forms/formControls';
import type { Parameters, Submission } from './forms/formControls';
import { structureForms } from './forms/structureForms';
import { valueForms } from './forms/valueForms';
import { stepCatalog } from './stepCatalog';
import '../../styles/step-form.css';

const stepForms = { ...valueForms, ...structureForms } satisfies Record<StepType, unknown>;

export function StepFormDialog({
  form,
  columns,
  parameters,
  onSave,
  onClose,
}: {
  form: StepForm;
  columns: Column[];
  parameters: Parameters;
  onSave: (parameters: Parameters, type: StepType) => void;
  onClose: () => void;
}) {
  const [type, setType] = useState(form.type);
  const [draft, setDraft] = useState(parameters);
  const [error, setError] = useState<{ error: string; field?: string } | null>(null);
  const body = useRef<HTMLFormElement>(null);
  const definition = stepForms[type];
  const { title } = stepCatalog[type];

  useEffect(() => {
    body.current?.querySelector<HTMLElement>('select, input, button')?.focus();
  }, []);

  function save() {
    const result: Submission = definition.submit(draft, columns);
    if (!('error' in result)) return onSave(result.parameters, type);
    setError(result);
    // The form's own lookup by name: no selector escaping, works in every runtime.
    const field = result.field && body.current?.elements.namedItem(result.field);
    if (field instanceof HTMLElement) field.focus();
  }

  /** Leaving a text field checks it, showing only that field's own error. */
  function checkField(field: string) {
    const result: Submission = definition.submit(draft, columns);
    if ('error' in result && result.field === field) setError(result);
  }

  return (
    // Same popup as the Data tab's operation dialogs: non-modal, draggable, beside the ribbon.
    <div className="dialog-backdrop data-operation-backdrop" role="presentation">
      <form
        ref={body}
        className="data-operation-dialog step-form-dialog"
        style={popupStyle(form.position)}
        role="dialog"
        aria-labelledby="step-form-title"
        aria-describedby={error && !error.field ? 'step-form-error' : undefined}
        onKeyDown={(event) => {
          if (event.key === 'Escape') onClose();
        }}
        onBlur={(event) => {
          if (event.target instanceof HTMLInputElement && event.target.name)
            checkField(event.target.name);
        }}
        onSubmit={(event) => {
          event.preventDefault();
          save();
        }}
      >
        <header>
          <DragGrip />
          <h2 id="step-form-title">{title}</h2>
        </header>
        <definition.Form
          parameters={draft}
          columns={columns}
          type={type}
          errorFor={(field) => (error?.field === field ? error.error : '')}
          onTypeChange={(next) => {
            setType(next);
            setError(null);
          }}
          onChange={(next) => {
            setDraft(next);
            setError(null);
          }}
        />
        <FieldError id="step-form-error" message={error && !error.field ? error.error : ''} />
        <footer className="dialog-actions">
          <button type="button" className="quiet-button" onClick={onClose}>
            Cancel
          </button>
          <button type="submit">{form.editingId ? 'Save step' : 'Add step'}</button>
        </footer>
      </form>
    </div>
  );
}
