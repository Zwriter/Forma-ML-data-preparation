import type { StepForm } from '../../types/cleaning';
import { stepCatalog, summarizeStep } from './stepCatalog';

type Parameters = Record<string, unknown>;

// shortcut: saves the step's current or default settings as-is; type-specific forms land in Phase 4 (T017).
export function StepFormDialog({
  form,
  parameters,
  onSave,
  onClose,
}: {
  form: StepForm;
  parameters: Parameters;
  onSave: (parameters: Parameters) => void;
  onClose: () => void;
}) {
  const { title } = stepCatalog[form.type];
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
        <p>{summarizeStep({ id: 'draft', type: form.type, parameters, enabled: true })}</p>
        <div className="dialog-actions">
          <button type="button" autoFocus onClick={() => onSave(parameters)}>
            {form.editingId ? 'Save step' : 'Add step'}
          </button>
          <button type="button" className="quiet-button" onClick={onClose}>
            Cancel
          </button>
        </div>
      </section>
    </div>
  );
}
