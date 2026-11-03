import { useState } from 'react';

const plural = (count: number) => `${count} ${count === 1 ? 'step' : 'steps'}`;

export function CleanFooter({
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
    <footer className="clean-footer">
      <div className="clean-footer-text">
        <strong>{plural(stepCount)}</strong>
        <span>Changes apply to a new version of the data. The original file stays unchanged.</span>
      </div>
      <div className="clean-footer-actions">
        <button
          type="button"
          className="quiet-button"
          disabled={!stepCount || running}
          onClick={() => setConfirming(true)}
        >
          Cancel
        </button>
        {running ? (
          <button type="button" onClick={onStop}>
            Stop
          </button>
        ) : (
          <button type="button" disabled={!canApply} onClick={onApply}>
            Apply {plural(enabledCount)}
          </button>
        )}
      </div>
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
                className="quiet-button"
                autoFocus
                onClick={() => setConfirming(false)}
              >
                Keep steps
              </button>
            </div>
          </section>
        </div>
      )}
    </footer>
  );
}
