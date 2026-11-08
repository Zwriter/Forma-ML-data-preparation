import { useProfileToolStore, type ProfileTool } from '../../stores/profileToolStore';
import { runProfile } from './useProfileJob';

/** Profile ribbon labels that open a tool in the Profile content area (FR-029). */
export const PROFILE_TOOL_COMMANDS: Record<string, Exclude<ProfileTool, 'dashboard'>> = {
  'Column details': 'column_details',
  'Data quality': 'data_quality',
  Distribution: 'distribution',
  Duplicates: 'duplicates',
  Patterns: 'patterns',
  Anomalies: 'anomalies',
  Recommendations: 'recommendations',
  Creations: 'creations',
};

/** The ribbon label (and tool title) for each tool. */
export const TOOL_TITLES = Object.fromEntries(
  Object.entries(PROFILE_TOOL_COMMANDS).map(([label, tool]) => [tool, label]),
) as Record<Exclude<ProfileTool, 'dashboard'>, string>;

const ribbonButton = (label: string) =>
  document.querySelector<HTMLElement>(`button.ribbon-action[aria-label="${label}"]`);

/** Returns to the dashboard and puts focus back on the command that opened the tool. */
export function closeProfileTool() {
  const { tool, close } = useProfileToolStore.getState();
  if (tool === 'dashboard') return;
  close();
  ribbonButton(TOOL_TITLES[tool])?.focus();
}

/** What a Profile ribbon label does; `undefined` for labels that are not Profile commands. */
export function profileCommand(label: string, openTool: ProfileTool) {
  if (label === 'Refresh') return { onClick: () => runProfile() };
  const tool = PROFILE_TOOL_COMMANDS[label];
  if (!tool) return undefined;
  return {
    active: openTool === tool,
    onClick: () =>
      openTool === tool ? closeProfileTool() : useProfileToolStore.getState().open(tool),
  };
}
