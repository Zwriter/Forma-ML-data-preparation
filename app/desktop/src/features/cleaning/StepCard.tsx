import { Icon } from '../../components/Icon';
import { draftKey, useCleaningStore } from '../../stores/cleaningStore';
import { useDatasetStore } from '../../stores/datasetStore';
import type { CleaningStep } from '../../types/cleaning';
import { MenuButton } from './MenuButton';
import type { MenuItem } from './MenuButton';
import { stepCatalog, summarizeStep } from './stepCatalog';

export function StepCard({
  step,
  position,
  last,
  error,
}: {
  step: CleaningStep;
  position: number;
  last: boolean;
  error?: string;
}) {
  const fileId = useDatasetStore(draftKey);
  const cleaning = useCleaningStore.getState();
  const definition = stepCatalog[step.type];
  const errorId = `${step.id}-error`;
  const actions: MenuItem[] = [
    { label: 'Edit', onSelect: () => cleaning.openForm(step.type, step.id) },
    ...(position > 1
      ? [{ label: 'Move up', onSelect: () => cleaning.move(fileId, step.id, -1) }]
      : []),
    ...(last ? [] : [{ label: 'Move down', onSelect: () => cleaning.move(fileId, step.id, 1) }]),
    { label: 'Duplicate', onSelect: () => cleaning.duplicate(fileId, step.id) },
    { label: 'Delete', onSelect: () => cleaning.remove(fileId, step.id) },
  ];
  return (
    <li
      className={`step-card${step.enabled ? '' : ' step-disabled'}${error ? ' step-invalid' : ''}`}
      aria-describedby={error ? errorId : undefined}
    >
      <span className="step-number" aria-label={`Step ${position}`}>
        {position}
      </span>
      <Icon name={definition.icon} />
      <div className="step-text">
        <strong>{definition.title}</strong>
        <span>{summarizeStep(step)}</span>
        {!step.enabled && <span className="step-state">Skipped</span>}
        {error && (
          <span className="step-error" id={errorId}>
            {error}
          </span>
        )}
      </div>
      <button
        type="button"
        role="switch"
        className="step-switch"
        aria-checked={step.enabled}
        aria-label={`Enable step ${position}`}
        title={step.enabled ? 'Turn this step off' : 'Turn this step on'}
        onClick={() => cleaning.toggle(fileId, step.id)}
      />
      <MenuButton
        className="step-menu"
        label="⋯"
        ariaLabel={`Actions for step ${position}`}
        title="Step actions"
        menuLabel={`Step ${position} actions`}
        items={actions}
      />
    </li>
  );
}
