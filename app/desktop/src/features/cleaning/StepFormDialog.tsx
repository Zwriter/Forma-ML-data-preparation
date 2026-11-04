import { useEffect, useRef, useState } from 'react';
import type { StepForm, StepType } from '../../types/cleaning';
import type { Column } from '../../types/dataset';
import { FieldError } from './forms/formControls';
import type { Parameters } from './forms/formControls';
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
  const [error, setError] = useState('');
  const body = useRef<HTMLFormElement>(null);
  const definition = stepForms[type];
  const { title } = stepCatalog[type];

  useEffect(() => {
    body.current?.querySelector<HTMLElement>('select, input, button')?.focus();
  }, []);

  function save() {
    const result = definition.submit(draft, columns);
    if ('error' in result) setError(result.error);
    else onSave(result.parameters, type);
  }

  return (
    <div className="dialog-backdrop" role="presentation">
      <section
        className="confirm-dialog card step-form-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="step-form-title"
        onKeyDown={(event) => {
          if (event.key === 'Escape') onClose();
        }}
      >
        <h2 id="step-form-title">{title}</h2>
        <form
          ref={body}
          aria-describedby={error ? 'step-form-error' : undefined}
          onSubmit={(event) => {
            event.preventDefault();
            save();
          }}
        >
          <definition.Form
            parameters={draft}
            columns={columns}
            type={type}
            onTypeChange={(next) => {
              setType(next);
              setError('');
            }}
            onChange={(next) => {
              setDraft(next);
              setError('');
            }}
          />
          <FieldError id="step-form-error" message={error} />
          <div className="dialog-actions">
            <button type="submit">{form.editingId ? 'Save step' : 'Add step'}</button>
            <button type="button" className="quiet-button" onClick={onClose}>
              Cancel
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
