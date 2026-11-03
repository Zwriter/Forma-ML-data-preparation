import { useEffect, useRef, useState } from 'react';
import type { StepForm } from '../../types/cleaning';
import type { Column } from '../../types/dataset';
import { FieldError } from './forms/formControls';
import type { Parameters } from './forms/formControls';
import { valueForms } from './forms/valueForms';
import { stepCatalog, summarizeStep } from './stepCatalog';

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
  onSave: (parameters: Parameters) => void;
  onClose: () => void;
}) {
  const [draft, setDraft] = useState(parameters);
  const [error, setError] = useState('');
  const body = useRef<HTMLFormElement>(null);
  const definition = valueForms[form.type];
  const { title } = stepCatalog[form.type];

  useEffect(() => {
    body.current?.querySelector<HTMLElement>('select, input, button')?.focus();
  }, []);

  function save() {
    // shortcut: structure steps save their defaults until their forms land in Phase 7 (T020).
    if (!definition) return onSave(draft);
    const result = definition.submit(draft, columns);
    if ('error' in result) setError(result.error);
    else onSave(result.parameters);
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
          {definition ? (
            <definition.Form
              parameters={draft}
              columns={columns}
              onChange={(next) => {
                setDraft(next);
                setError('');
              }}
            />
          ) : (
            <p>
              {summarizeStep({ id: 'draft', type: form.type, parameters: draft, enabled: true })}
            </p>
          )}
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
