import { useDatasetStore } from '../../stores/datasetStore';
import { useProfileStore } from '../../stores/profileStore';
import { useProfileJob } from './useProfileJob';
import '../../styles/profile.css';

/** The Profile tab: layout regions from specs/005-data-profile/contracts/ui.md. */
export function ProfileDashboard() {
  const historyId = useDatasetStore((state) => state.history?.history_id);
  const entry = useProfileStore((state) => (historyId ? state.entries[historyId] : undefined));
  const { run, cancel } = useProfileJob();
  const running = entry?.status === 'running';
  const profile = entry?.profile;

  return (
    <section className="card workflow-card profile-dashboard" id="profile">
      <header className="profile-header" role="region" aria-label="Data profile">
        <div>
          <h2>Data profile</h2>
          <p className="profile-subtitle">
            Understand the structure, quality and distribution of your data.
          </p>
        </div>
        {running && (
          <div className="profile-progress">
            <progress aria-label="Profiling progress" max={1} value={entry.progress ?? 0} />
            <span>{entry.message || 'Profiling…'}</span>
            <button type="button" onClick={() => void cancel()}>
              Cancel
            </button>
          </div>
        )}
      </header>
      {entry?.status === 'failed' && (
        <p className="profile-error" role="alert">
          {entry.error?.message ?? 'Profiling failed.'}{' '}
          <button type="button" onClick={() => void run()}>
            Try again
          </button>
        </p>
      )}
      {!profile && !running && entry?.status !== 'failed' && (
        <div className="profile-empty">
          <p>No profile yet for this dataset.</p>
          <button type="button" onClick={() => void run()}>
            Profile dataset
          </button>
        </div>
      )}
      {profile && (
        <>
          <section className="profile-summary" aria-label="Dataset summary" />
          <div className="profile-panels">
            <section className="profile-panel" aria-label="Data quality" tabIndex={-1} />
            <section
              className="profile-panel"
              aria-label="Missing values by column"
              tabIndex={-1}
            />
            <section className="profile-panel" aria-label="Distribution" tabIndex={-1} />
            <section className="profile-panel" aria-label="Categories" tabIndex={-1} />
          </div>
          <section className="profile-columns" aria-label="Columns" tabIndex={-1} />
        </>
      )}
    </section>
  );
}
