import { Icon } from '../../components/Icon';
import { formatUpdated } from './profileFormat';

type Props = {
  computedAt: string | null;
  running: boolean;
  progress: number | null;
  message: string | null;
  /** The data changed since this profile was computed. */
  stale?: boolean;
  onRefresh: () => void;
  onCancel: () => void;
};

export function ProfileHeader({
  computedAt,
  running,
  progress,
  message,
  stale = false,
  onRefresh,
  onCancel,
}: Props) {
  return (
    <header className="profile-header" role="region" aria-label="Data profile">
      <div>
        <h2>Data profile</h2>
        <p className="profile-subtitle">
          Understand the structure, quality and distribution of your data.
        </p>
      </div>
      <div className="profile-actions">
        {running ? (
          <div className="profile-progress">
            <progress aria-label="Profiling progress" max={1} value={progress ?? 0} />
            <span>{message || 'Profiling…'}</span>
            <button type="button" onClick={onCancel}>
              Cancel
            </button>
          </div>
        ) : (
          computedAt && (
            <span className="profile-updated">
              Last updated <time dateTime={computedAt}>{formatUpdated(computedAt)}</time>
            </span>
          )
        )}
        {stale && !running && (
          <span className="profile-stale" role="status">
            Out of date
          </span>
        )}
        <button
          type="button"
          className="profile-icon-button"
          aria-label="Refresh profile"
          title="Refresh profile"
          disabled={running}
          onClick={onRefresh}
        >
          <Icon name="reload" />
        </button>
        {/* Wired in US6 (report generation). */}
        <button type="button" disabled title="Profile the dataset first">
          Generate report
        </button>
      </div>
    </header>
  );
}
