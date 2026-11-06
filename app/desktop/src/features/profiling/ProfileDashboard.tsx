import { useEffect } from 'react';
import { useDatasetStore } from '../../stores/datasetStore';
import { isStale, useProfileStore } from '../../stores/profileStore';
import type { ColumnProfile } from '../../types/profile';
import { CategoryPanel } from './CategoryPanel';
import { DistributionPanel } from './DistributionPanel';
import { MissingValuesPanel } from './MissingValuesPanel';
import { ProfileHeader } from './ProfileHeader';
import { QualityPanel } from './QualityPanel';
import { SummaryCards } from './SummaryCards';
import { ColumnsSection } from './columns/ColumnsSection';
import { useProfileExports } from './useProfileExports';
import { useProfileJob } from './useProfileJob';
import '../../styles/profile.css';
import '../../styles/profile-charts.css';
import '../../styles/profile-table.css';
import '../../styles/profile-responsive.css';

/** Shows a column in the chart that fits it and moves focus to that chart. */
function showDistribution(historyId: string, column: ColumnProfile) {
  const chart = column.numeric ? 'distribution' : 'category';
  useProfileStore.getState().pickChartColumn(historyId, chart, column.name);
  // Focus after React re-renders the panel with its new title.
  requestAnimationFrame(() => document.getElementById(`profile-${chart}-panel`)?.focus());
}

/** The Profile tab: layout regions from specs/005-data-profile/contracts/ui.md. */
export function ProfileDashboard({ onTabChange }: { onTabChange?: (tab: string) => void }) {
  const historyId = useDatasetStore((state) => state.history?.history_id);
  const dataVersion = useDatasetStore((state) => state.history?.data_version);
  const entry = useProfileStore((state) => (historyId ? state.entries[historyId] : undefined));
  const { run, cancel } = useProfileJob();
  const { exportInvalid, cancelExport, exporting } = useProfileExports();
  const running = entry?.status === 'running';
  const profile = entry?.profile;
  const stale = isStale(entry, dataVersion);
  const exportHint = stale
    ? 'Refresh the profile first'
    : profile?.quality.invalid_cells
      ? null
      : 'No invalid values';

  // Profile automatically only on the first visit; after a cancel or failure the user decides.
  const neverRun = historyId !== undefined && entry === undefined;
  // Re-read the store: StrictMode runs effects twice and `run` registers the entry at once.
  // `run` is recreated each render; depending on it would re-trigger the effect.
  useEffect(() => {
    if (historyId && neverRun && !useProfileStore.getState().entries[historyId]) void run();
  }, [neverRun]);

  return (
    <section className="card workflow-card profile-dashboard" id="profile">
      <ProfileHeader
        computedAt={profile?.computed_at ?? null}
        running={running}
        progress={entry?.progress ?? null}
        message={entry?.message ?? null}
        onRefresh={() => void run()}
        onCancel={() => void cancel()}
      />
      {entry?.status === 'failed' && (
        <p className="profile-error" role="alert">
          {entry.error?.message ?? 'Profiling failed.'}{' '}
          <button type="button" onClick={() => void run()}>
            Try again
          </button>
        </p>
      )}
      {!profile && entry?.status === 'idle' && (
        <div className="profile-empty">
          <p>No profile yet for this dataset.</p>
          <button type="button" onClick={() => void run()}>
            Profile dataset
          </button>
        </div>
      )}
      {profile && historyId && (
        <>
          <SummaryCards profile={profile} />
          <div className="profile-panels">
            <QualityPanel
              quality={profile.quality}
              exportHint={exportHint}
              exporting={exporting}
              onExport={() => void exportInvalid(null)}
              onCancelExport={() => void cancelExport()}
            />
            <MissingValuesPanel columns={profile.columns} rowCount={profile.row_count} />
            <DistributionPanel historyId={historyId} columns={profile.columns} />
            <CategoryPanel historyId={historyId} columns={profile.columns} />
          </div>
          <ColumnsSection
            profile={profile}
            onTabChange={onTabChange}
            onShowDistribution={(column) => showDistribution(historyId, column)}
            onExportInvalid={
              stale || exporting ? undefined : (column) => void exportInvalid(column.name)
            }
          />
        </>
      )}
    </section>
  );
}
