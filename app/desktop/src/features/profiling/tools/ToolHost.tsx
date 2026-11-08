import type { ComponentType } from 'react';
import { useProfileToolStore, type ProfileTool } from '../../../stores/profileToolStore';
import { AnomaliesTool } from './AnomaliesTool';
import { ColumnDetailsTool } from './ColumnDetailsTool';
import { CreationsTool } from './CreationsTool';
import { DataQualityTool } from './DataQualityTool';
import { DistributionTool } from './DistributionTool';
import { DuplicatesTool } from './DuplicatesTool';
import { PatternsTool } from './PatternsTool';
import { RecommendationsTool } from './RecommendationsTool';

type OpenTool = Exclude<ProfileTool, 'dashboard'>;

/** Tool components by tool. */
const TOOL_VIEWS: Record<OpenTool, ComponentType> = {
  column_details: ColumnDetailsTool,
  data_quality: DataQualityTool,
  distribution: DistributionTool,
  duplicates: DuplicatesTool,
  patterns: PatternsTool,
  anomalies: AnomaliesTool,
  recommendations: RecommendationsTool,
  creations: CreationsTool,
};

/** Loads the open Profile tool in place of the dashboard. */
export function ToolHost() {
  const tool = useProfileToolStore((state) => state.tool);
  if (tool === 'dashboard') return null;
  const View = TOOL_VIEWS[tool];
  return <View />;
}
