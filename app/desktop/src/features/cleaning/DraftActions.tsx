import { useState } from 'react';

const plural = (count: number) => `${count} ${count === 1 ? 'step' : 'steps'}`;

/** Cancel and Apply for the draft, shown at the bottom of the steps panel. */
export function DraftActions({
  stepCount,
  enabledCount,
  running,
  canApply,
  onApply,
  onStop,
  onDiscard,
}: {
  stepCount: number;
  enabledCount: number;
  running: boolean;
  canApply: boolean;
  onApply: () => void;
  onStop: () => void;
  onDiscard: () => void;
}) {
  const [confirming, setConfirming] = useState(false);
  return (
    <div className="draft-actions">
      <button
        type="button"
        className="btn btn-ghost"
        disabled={!stepCount || running}
        onClick={() => setConfirming(true)}
      >
        Cancel
      </button>
      {running ? (
        <button className="btn btn-secondary" type="button" onClick={onStop}>
          Stop
        </button>
      ) : (
        <button className="btn btn-primary" type="button" disabled={!canApply} onClick={onApply}>
          Apply {plural(enabledCount)}
        </button>
      )}
      {running && (
        <span className="sr-only" role="status">
          Applying cleaning steps
        </span>
      )}
      {confirming && (
        <div className="dialog-backdrop" role="presentation">
          <section
            className="confirm-dialog card"
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="discard-steps-title"
            onKeyDown={(event) => {
              if (event.key === 'Escape') setConfirming(false);
            }}
          >
            <h2 id="discard-steps-title">Discard {plural(stepCount)}?</h2>
            <p>The dataset stays unchanged.</p>
            <div className="dialog-actions">
              <button
                className="btn btn-danger"
                type="button"
                onClick={() => {
                  setConfirming(false);
                  onDiscard();
                }}
              >
                Discard steps
              </button>
              <button
                type="button"
                className="btn btn-secondary"
                autoFocus
                onClick={() => setConfirming(false)}
              >
                Keep steps
              </button>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
