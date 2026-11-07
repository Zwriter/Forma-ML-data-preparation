import type { ComponentType } from 'react';
import { useDatasetStore } from '../../../stores/datasetStore';
import { useProfileStore } from '../../../stores/profileStore';
import { useProfileToolStore, type ProfileTool } from '../../../stores/profileToolStore';
import { TOOL_TITLES, closeProfileTool } from '../profileRibbon';
import { runProfile } from '../useProfileJob';
import { AnomaliesTool } from './AnomaliesTool';
import { ColumnDetailsTool } from './ColumnDetailsTool';
import { DataQualityTool } from './DataQualityTool';
import { DistributionTool } from './DistributionTool';
import { DuplicatesTool } from './DuplicatesTool';
import { PatternsTool } from './PatternsTool';
import { ToolView } from './ToolView';

type OpenTool = Exclude<ProfileTool, 'dashboard'>;

/** Tool components by tool; each tool phase (US7–US9) adds its entry. */
const TOOL_VIEWS: Partial<Record<OpenTool, ComponentType>> = {
  column_details: ColumnDetailsTool,
  data_quality: DataQualityTool,
  distribution: DistributionTool,
  duplicates: DuplicatesTool,
  patterns: PatternsTool,
  anomalies: AnomaliesTool,
};

/** Shown until a tool's phase is built. */
function Placeholder({ tool }: { tool: OpenTool }) {
  const historyId = useDatasetStore((state) => state.history?.history_id);
  const hasProfile = useProfileStore((state) =>
    Boolean(historyId && state.entries[historyId]?.profile),
  );
  return (
    <ToolView
      title={TOOL_TITLES[tool]}
      entry={undefined}
      stale={false}
      hasProfile={hasProfile}
      onBack={closeProfileTool}
      onCancel={() => undefined}
      onRetry={() => undefined}
      onProfile={() => void runProfile()}
    >
      <p className="profile-panel-note">This tool is not available yet.</p>
    </ToolView>
  );
}

/** Loads the open Profile tool in place of the dashboard. */
export function ToolHost() {
  const tool = useProfileToolStore((state) => state.tool);
  if (tool === 'dashboard') return null;
  const View = TOOL_VIEWS[tool];
  return View ? <View /> : <Placeholder tool={tool} />;
}
