import { useEffect, type ReactNode } from 'react';
import { Icon } from '../../../components/Icon';
import type { ToolEntry } from '../../../stores/profileToolStore';

type Props = {
  title: string;
  entry: ToolEntry | undefined;
  /** The shown result belongs to an older data version. */
  stale: boolean;
  hasProfile: boolean;
  onBack: () => void;
  onCancel: () => void;
  onRetry: () => void;
  onProfile: () => void;
  /** Inputs shown above the result whenever a profile exists (column pickers, paging). */
  toolbar?: ReactNode;
  children: ReactNode;
};

/** Escape closes the tool unless focus is in something that uses Escape itself. */
const ownsEscape = (target: EventTarget | null) =>
  target instanceof Element && Boolean(target.closest('[role="menu"], [role="dialog"]'));

function Body({ entry, hasProfile, onRetry, onProfile, children }: Props) {
  if (!hasProfile)
    return (
      <div className="profile-empty">
        <p>Profile the dataset first</p>
        <button className="btn btn-primary" type="button" onClick={onProfile}>
          Profile now
        </button>
      </div>
    );
  if (entry?.status === 'failed')
    return (
      <p className="profile-error" role="alert">
        {entry.error?.message ?? 'The tool could not run.'}{' '}
        <button className="btn btn-secondary" type="button" onClick={onRetry}>
          Try again
        </button>
      </p>
    );
  // No request yet (entry undefined) lets the tool show its own inputs or note.
  if (entry && (entry.result === null || entry.result === undefined))
    return entry.status === 'running' ? (
      <p className="profile-panel-note">Loading results…</p>
    ) : null;
  return <>{children}</>;
}

/** The frame every Profile ribbon tool is shown in, in place of the dashboard. */
export function ToolView(props: Props) {
  const { title, entry, stale, hasProfile, toolbar, onBack, onCancel } = props;
  const running = entry?.status === 'running';

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key !== 'Escape' || event.defaultPrevented || ownsEscape(event.target)) return;
      onBack();
    }
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [onBack]);

  return (
    <section className="profile-tool" role="region" aria-label={title}>
      <header className="profile-tool-header">
        <button type="button" className="btn btn-ghost btn-sm profile-tool-back" onClick={onBack}>
          <Icon name="back" />
          Back to dashboard
        </button>
        <h2>{title}</h2>
        {stale && !running && (
          <span className="profile-stale" role="status">
            Out of date
          </span>
        )}
        {running && (
          <div className="profile-progress">
            <progress aria-label="Tool progress" max={1} value={entry.progress ?? 0} />
            <span>{entry.message || 'Working…'}</span>
            <button className="btn btn-secondary" type="button" onClick={onCancel}>
              Cancel
            </button>
          </div>
        )}
      </header>
      <div className="profile-tool-body">
        {hasProfile && toolbar && <div className="profile-tool-toolbar">{toolbar}</div>}
        <Body {...props} />
      </div>
    </section>
  );
}
