import { useDatasetStore } from '../../../stores/datasetStore';
import { useProfileStore } from '../../../stores/profileStore';
import { useProfileToolStore } from '../../../stores/profileToolStore';
import type { DistributionDetail } from '../../../types/profileTools';
import { BoxPlot } from '../charts/BoxPlot';
import { HistogramChart } from '../charts/HistogramChart';
import { ToolView } from './ToolView';
import { useLatestProfile, useTool } from './useTool';

export const BAR_CHOICES = [10, 20, 30, 50] as const;

/** Distribution explorer (FR-039): bar count, log scale, and a box plot. */
export function DistributionTool() {
  const inputs = useProfileToolStore((state) => state.inputs.distribution) ?? {};
  const historyId = useDatasetStore((state) => state.history?.history_id);
  const dashboardPick = useProfileStore((state) =>
    historyId ? state.chartColumns[historyId]?.distribution : undefined,
  );
  const profile = useLatestProfile();
  const eligible = (profile?.columns ?? []).filter((column) => column.numeric);
  const wanted = (inputs.column as string | undefined) ?? dashboardPick;
  const column = eligible.find((item) => item.name === wanted) ?? eligible[0];
  const bins = (inputs.bins as number | undefined) ?? 30;
  const logScale = Boolean(inputs.logScale);
  const { result, view } = useTool<DistributionDetail>(
    'distribution',
    'profile.distribution',
    column ? { column: column.name, bins } : null,
  );
  const set = (key: string, value: unknown) =>
    useProfileToolStore.getState().setInput('distribution', key, value);

  const toolbar = column && (
    <>
      <select
        aria-label="Column"
        value={column.name}
        onChange={(event) => set('column', event.target.value)}
      >
        {eligible.map((item) => (
          <option key={item.name}>{item.name}</option>
        ))}
      </select>
      <fieldset className="tool-radios" role="radiogroup" aria-label="Bars">
        <legend>Bars</legend>
        {BAR_CHOICES.map((choice) => (
          <label key={choice}>
            <input
              type="radio"
              name="profile-bars"
              checked={bins === choice}
              onChange={() => set('bins', choice)}
            />
            {choice}
          </label>
        ))}
      </fieldset>
      <label className="profile-switch">
        <input
          type="checkbox"
          role="switch"
          checked={logScale}
          onChange={(event) => set('logScale', event.target.checked)}
        />
        Log scale
      </label>
    </>
  );

  return (
    <ToolView title="Distribution" {...view} toolbar={toolbar}>
      {!column ? (
        <p className="profile-panel-note">No number or date columns to chart</p>
      ) : (
        result && (
          <div className="tool-panel tool-distribution">
            <HistogramChart
              label={`${result.column} distribution`}
              bins={result.bins}
              scale={logScale ? 'log' : 'linear'}
            />
            {result.box && <BoxPlot box={result.box} />}
          </div>
        )
      )}
    </ToolView>
  );
}
