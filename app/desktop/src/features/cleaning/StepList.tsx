import type { CleaningStep, StepValidation } from '../../types/cleaning';
import { StepCard } from './StepCard';

export function StepList({
  steps,
  validation,
}: {
  steps: CleaningStep[];
  validation: StepValidation[];
}) {
  if (!steps.length)
    return (
      <p className="clean-empty">
        No cleaning steps yet. Choose Add step or a Clean ribbon command to start.
      </p>
    );
  return (
    <ol className="step-list" aria-label="Cleaning steps">
      {steps.map((step, index) => (
        <StepCard
          key={step.id}
          step={step}
          position={index + 1}
          error={validation.find((item) => item.operation_id === step.id && !item.valid)?.message}
        />
      ))}
    </ol>
  );
}
