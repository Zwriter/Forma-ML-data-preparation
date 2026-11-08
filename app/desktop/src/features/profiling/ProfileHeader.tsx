import { Icon } from '../../components/Icon';
import { formatUpdated } from './profileFormat';

type Props = {
  computedAt: string | null;
  running: boolean;
  progress: number | null;
  message: string | null;
  /** The data changed since this profile was computed. */
  stale?: boolean;
  /** Why a report cannot be generated now, or null when it can. */
  reportHint?: string | null;
  onRefresh: () => void;
  onCancel: () => void;
  onReport?: () => void;
  autoRefresh?: boolean;
  onAutoRefresh?: (on: boolean) => void;
};

export function ProfileHeader({
  computedAt,
  running,
  progress,
  message,
  stale = false,
  reportHint = 'Profile the dataset first',
  onRefresh,
  onCancel,
  onReport,
  autoRefresh = false,
  onAutoRefresh,
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
            <button type="button" className="btn btn-secondary btn-sm" onClick={onCancel}>
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
          className="btn btn-icon"
          aria-label="Refresh profile"
          title="Refresh profile"
          disabled={running}
          onClick={onRefresh}
        >
          <Icon name="reload" />
        </button>
        <label className="profile-switch">
          <input
            type="checkbox"
            role="switch"
            checked={autoRefresh}
            onChange={(event) => onAutoRefresh?.(event.target.checked)}
          />
          Refresh automatically
        </label>
        <button
          type="button"
          className="btn btn-primary"
          disabled={reportHint !== null}
          title={reportHint ?? 'Save this profile as an HTML file you can share'}
          onClick={onReport}
        >
          Generate report
        </button>
      </div>
    </header>
  );
}
