import { runProfile } from './useProfileJob';

const focus = (id: string) => () => document.getElementById(id)?.focus();

/** What the Profile ribbon's Overview and Quality buttons do; Insights stay as they are. */
export const profileRibbonActions: Record<string, () => void | Promise<void>> = {
  Refresh: runProfile,
  'Column details': focus('profile-columns'),
  'Data quality': focus('profile-quality-panel'),
  Distribution: focus('profile-distribution-panel'),
  Duplicates: focus('profile-duplicates-card'),
};
