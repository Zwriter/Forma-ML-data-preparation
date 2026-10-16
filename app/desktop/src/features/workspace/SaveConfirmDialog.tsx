type Props = {
  mode: 'close' | 'overwrite';
  onSave: (forceOverwrite: boolean) => void;
  onDiscard: () => void;
  onCancel: () => void;
};

export function SaveConfirmDialog({ mode, onSave, onDiscard, onCancel }: Props) {
  const closing = mode === 'close';
  return (
    <div className="dialog-backdrop" role="presentation">
      <section
        className="confirm-dialog card"
        role="dialog"
        aria-modal="true"
        aria-labelledby="save-confirm-title"
        aria-describedby="save-confirm-description"
      >
        <h2 id="save-confirm-title">
          {closing ? 'Save changes before closing?' : 'Replace source file?'}
        </h2>
        <p id="save-confirm-description">
          {closing
            ? 'You have unsaved changes. Save them, discard them, or keep working.'
            : 'Saving will replace the file at its current location.'}
        </p>
        <div className="dialog-actions">
          <button type="button" onClick={() => onSave(mode === 'overwrite')}>
            {closing ? 'Save' : 'Replace file'}
          </button>
          {closing && (
            <button type="button" className="quiet-button" onClick={onDiscard}>
              Discard changes
            </button>
          )}
          <button type="button" className="quiet-button" onClick={onCancel}>
            Cancel
          </button>
        </div>
      </section>
    </div>
  );
}
