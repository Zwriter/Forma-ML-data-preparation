import { useEffect, useRef, useState } from 'react';
import type { ColumnProfile } from '../../types/profile';
import { HorizontalBars } from './charts/HorizontalBars';

const TOP = 10;

export function MissingValuesPanel({
  columns,
  rowCount,
}: {
  columns: ColumnProfile[];
  rowCount: number;
}) {
  const [showAll, setShowAll] = useState(false);
  const trigger = useRef<HTMLButtonElement>(null);
  const dialog = useRef<HTMLDivElement>(null);
  const missing = columns
    .filter((column) => column.missing_count > 0)
    .sort((a, b) => b.missing_count - a.missing_count || a.position - b.position)
    .map((column) => ({ label: column.name, count: column.missing_count }));

  useEffect(() => {
    if (showAll) dialog.current?.focus();
  }, [showAll]);

  function close() {
    setShowAll(false);
    trigger.current?.focus();
  }

  return (
    <section className="profile-panel" aria-label="Missing values by column" tabIndex={-1}>
      <div className="profile-panel-heading">
        <h3>Missing values by column</h3>
        {missing.length > TOP && (
          <button
            ref={trigger}
            type="button"
            className="btn btn-link"
            onClick={() => setShowAll(true)}
          >
            Show all ({missing.length})
          </button>
        )}
      </div>
      {missing.length ? (
        <HorizontalBars label="Missing values" items={missing.slice(0, TOP)} total={rowCount} />
      ) : (
        <p className="profile-panel-note">No missing values</p>
      )}
      {showAll && (
        // A popup, so the full list never makes the dashboard itself scroll.
        <div
          ref={dialog}
          className="profile-popup"
          role="dialog"
          aria-label="All missing values"
          tabIndex={-1}
          onKeyDown={(event) => event.key === 'Escape' && close()}
        >
          <div className="profile-panel-heading">
            <h3>All missing values</h3>
            <button type="button" className="btn btn-link" onClick={close}>
              Close
            </button>
          </div>
          <HorizontalBars label="All missing values" items={missing} total={rowCount} />
        </div>
      )}
    </section>
  );
}
