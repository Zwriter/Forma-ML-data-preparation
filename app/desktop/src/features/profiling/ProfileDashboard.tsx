import { useEffect } from 'react';
import { useDatasetStore } from '../../stores/datasetStore';
import { useProfileStore } from '../../stores/profileStore';
import { ProfileHeader } from './ProfileHeader';
import { QualityPanel } from './QualityPanel';
import { SummaryCards } from './SummaryCards';
import { ColumnsSection } from './columns/ColumnsSection';
import { useProfileJob } from './useProfileJob';
import '../../styles/profile.css';
import '../../styles/profile-table.css';
import '../../styles/profile-responsive.css';

/** The Profile tab: layout regions from specs/005-data-profile/contracts/ui.md. */
export function ProfileDashboard({ onTabChange }: { onTabChange?: (tab: string) => void }) {
  const historyId = useDatasetStore((state) => state.history?.history_id);
  const entry = useProfileStore((state) => (historyId ? state.entries[historyId] : undefined));
  const { run, cancel } = useProfileJob();
  const running = entry?.status === 'running';
  const profile = entry?.profile;

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
      {profile && (
        <>
          <SummaryCards profile={profile} />
          <div className="profile-panels">
            <QualityPanel quality={profile.quality} />
            <section
              className="profile-panel"
              aria-label="Missing values by column"
              tabIndex={-1}
            />
            <section className="profile-panel" aria-label="Distribution" tabIndex={-1} />
            <section className="profile-panel" aria-label="Categories" tabIndex={-1} />
          </div>
          <ColumnsSection profile={profile} onTabChange={onTabChange} />
        </>
      )}
    </section>
  );
}
