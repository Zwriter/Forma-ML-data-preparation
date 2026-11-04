import { useCleaningStore } from '../../stores/cleaningStore';
import type { StepForm, StepType } from '../../types/cleaning';
import { popupPositionFromAnchor } from '../workspace/popupPositions';

/** A Clean ribbon command toggles its step form, like the Data ribbon toggles its popups. */
export function stepCommand(label: string, stepType: StepType, form: StepForm | null) {
  // Remove covers every drop_* step, since its form switches between them.
  const active = Boolean(
    form && (form.type === stepType || (label === 'Remove' && form.type.startsWith('drop_'))),
  );
  return {
    active,
    onClick: (anchor: HTMLElement) => {
      const cleaning = useCleaningStore.getState();
      if (active) cleaning.closeForm();
      else cleaning.openForm(stepType, null, popupPositionFromAnchor(anchor));
    },
  };
}
