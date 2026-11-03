import { Icon } from '../../components/Icon';
import type { CleaningStep } from '../../types/cleaning';
import { stepCatalog, summarizeStep } from './stepCatalog';

export function StepCard({
  step,
  position,
  error,
}: {
  step: CleaningStep;
  position: number;
  error?: string;
}) {
  const definition = stepCatalog[step.type];
  const errorId = `${step.id}-error`;
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
    </li>
  );
}
