import { useProfileStore, type ChartKind } from '../../../stores/profileStore';
import type { ColumnProfile } from '../../../types/profile';

/** The column a chart shows: the session pick if still eligible, else the default. */
export function useChartColumn(
  historyId: string,
  chart: ChartKind,
  eligible: ColumnProfile[],
  preferred: (column: ColumnProfile) => boolean,
) {
  const picked = useProfileStore((state) => state.chartColumns[historyId]?.[chart]);
  const pick = useProfileStore((state) => state.pickChartColumn);
  const column =
    eligible.find((item) => item.name === picked) ?? eligible.find(preferred) ?? eligible[0];
  return { column, pick: (name: string) => pick(historyId, chart, name) };
}
