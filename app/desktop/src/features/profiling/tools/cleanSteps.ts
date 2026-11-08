import { draftKey, useCleaningStore } from '../../../stores/cleaningStore';
import { useDatasetStore } from '../../../stores/datasetStore';
import { useWorkspaceStore } from '../../../stores/workspaceStore';
import type { CleaningStep, StepType } from '../../../types/cleaning';

export type ProposedStep = { type: string; parameters: Record<string, unknown> };

const sameStep = (step: CleaningStep, proposed: ProposedStep) =>
  step.type === proposed.type &&
  JSON.stringify(step.parameters) === JSON.stringify(proposed.parameters);

/** True when every proposed step is already in the Clean steps. */
export const hasCleanSteps = (steps: CleaningStep[], proposed: ProposedStep[]) =>
  proposed.every((item) => steps.some((step) => sameStep(step, item)));

/** Adds steps to the open file's Clean steps without leaving the Profile tab, and
 *  confirms with a notice whose Undo removes exactly those steps. */
export function addCleanSteps(proposed: ProposedStep[], title: string) {
  const fileId = draftKey(useDatasetStore.getState());
  const cleaning = useCleaningStore.getState();
  const before = new Set((cleaning.drafts[fileId] ?? []).map((step) => step.id));
  for (const step of proposed) cleaning.add(fileId, step.type as StepType, step.parameters);
  const added = (useCleaningStore.getState().drafts[fileId] ?? [])
    .filter((step) => !before.has(step.id))
    .map((step) => step.id);
  useWorkspaceStore.getState().notify(`Added "${title}" to Clean steps.`, {
    label: 'Undo',
    run: () => {
      for (const id of added) useCleaningStore.getState().remove(fileId, id);
    },
  });
}
