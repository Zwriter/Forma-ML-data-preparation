type Props = {
  mode: 'close' | 'overwrite';
  destination?: string | null;
  onSave: (forceOverwrite: boolean) => void;
  onDiscard: () => void;
  onCancel: () => void;
};

export function SaveConfirmDialog({ mode, destination, onSave, onDiscard, onCancel }: Props) {
  const closing = mode === 'close';
  const replacingCopy = mode === 'overwrite' && Boolean(destination);
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
          {closing
            ? 'Save changes before closing?'
            : replacingCopy
              ? 'Replace destination file?'
              : 'Replace source file?'}
        </h2>
        <p id="save-confirm-description">
          {closing
            ? 'You have unsaved changes. Save them, discard them, or keep working.'
            : destination
              ? `Saving will replace the file at ${destination}.`
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
