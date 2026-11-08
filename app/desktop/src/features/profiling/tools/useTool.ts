import { useDatasetStore } from '../../../stores/datasetStore';
import { useProfileStore } from '../../../stores/profileStore';
import type { ToolKey } from '../../../stores/profileToolStore';
import type { Profile } from '../../../types/profile';
import { closeProfileTool } from '../profileRibbon';
import { runProfile } from '../useProfileJob';
import { useToolJob } from './useToolJob';

/** The open dataset's latest profile, current or not. */
export function useLatestProfile(): Profile | undefined {
  const historyId = useDatasetStore((state) => state.history?.history_id);
  return useProfileStore((state) =>
    historyId ? (state.entries[historyId]?.profile ?? undefined) : undefined,
  );
}

/** Runs a tool and returns its result plus everything `ToolView` needs. */
export function useTool<T>(key: ToolKey, method: string, params: Record<string, unknown> | null) {
  const job = useToolJob(key, method, params);
  const profile = useLatestProfile();
  const result = (job.entry?.result ?? undefined) as T | undefined;
  return {
    result,
    profile,
    view: {
      entry: job.entry,
      stale: job.stale,
      hasProfile: Boolean(profile),
      onBack: closeProfileTool,
      onCancel: () => void job.cancel(),
      onRetry: () => void job.retry(),
      onProfile: () => void runProfile(),
    },
  };
}
