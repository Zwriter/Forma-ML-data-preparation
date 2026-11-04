import type { ReactNode } from 'react';
import { useCleaningStore } from '../../stores/cleaningStore';
import type { CleaningStep, StepType, StepValidation } from '../../types/cleaning';
import { MenuButton } from './MenuButton';
import { stepCatalog } from './stepCatalog';
import { StepList } from './StepList';

export function StepsPanel({
  steps,
  validation,
  disabled,
  onAdd,
  children,
}: {
  steps: CleaningStep[];
  validation: StepValidation[];
  disabled: boolean;
  onAdd: (type: StepType) => void;
  /** Status and Cancel/Apply, kept at the bottom of the panel. */
  children?: ReactNode;
}) {
  const panel = useCleaningStore((state) => state.panel);
  const setPanel = useCleaningStore((state) => state.setPanel);
  if (!steps.length) return null;

  if (panel === 'collapsed')
    return (
      <button
        type="button"
        className="steps-panel-tab"
        aria-expanded={false}
        aria-label={`Show ${steps.length} cleaning steps`}
        onClick={() => setPanel('open')}
      >
        {steps.length} {steps.length === 1 ? 'step' : 'steps'}
      </button>
    );

  return (
    <aside className="steps-panel" id="steps-panel" aria-label="Cleaning steps">
      <header className="steps-panel-header">
        <h2>Cleaning steps ({steps.length})</h2>
        <MenuButton
          label="Add step"
          menuLabel="Step types"
          disabled={disabled}
          items={(Object.keys(stepCatalog) as StepType[]).map((type) => ({
            label: stepCatalog[type].title,
            icon: stepCatalog[type].icon,
            onSelect: () => onAdd(type),
          }))}
        />
        <button
          type="button"
          className="quiet-button steps-panel-collapse"
          aria-label="Collapse steps panel"
          aria-expanded={true}
          aria-controls="steps-panel"
          onClick={() => setPanel('collapsed')}
        >
          ›
        </button>
      </header>
      <StepList steps={steps} validation={validation} />
      <footer className="steps-panel-footer">{children}</footer>
    </aside>
  );
}
