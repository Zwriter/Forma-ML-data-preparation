import { useEffect, useState } from 'react';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { Icon } from '../../components/Icon';
import { isTauriRuntime } from '../../services/tauriRuntime';

function desktopWindow() {
  if (!isTauriRuntime()) return undefined;
  try {
    return getCurrentWindow();
  } catch {
    return undefined;
  }
}

export function WorkspaceTitlebar({
  fileName,
  busy,
  isDirty,
  onClose,
}: {
  fileName: string;
  busy: boolean;
  isDirty: boolean;
  onClose: () => void;
}) {
  const [isMaximized, setIsMaximized] = useState(false);

  useEffect(() => {
    const window = desktopWindow();
    if (!window) return;
    let active = true;
    let unlisten: (() => void) | undefined;
    void window.isMaximized().then((maximized) => {
      if (active) setIsMaximized(maximized);
    });
    void window
      .onResized(() => {
        void window.isMaximized().then((maximized) => {
          if (active) setIsMaximized(maximized);
        });
      })
      .then((stop) => {
        if (active) unlisten = stop;
        else stop();
      });
    return () => {
      active = false;
      unlisten?.();
    };
  }, []);

  return (
    <header
      className="app-titlebar"
      onMouseDown={(event) => {
        if (event.button !== 0 || (event.target as HTMLElement).closest('a, button')) return;
        void desktopWindow()?.startDragging();
      }}
      onDoubleClick={(event) => {
        if ((event.target as HTMLElement).closest('a, button')) return;
        void desktopWindow()?.toggleMaximize();
      }}
    >
      <a className="brand" href="#workspace-top" aria-label="Forma home">
        <Icon name="brand" />
        <span>Forma</span>
      </a>
      <span className="titlebar-divider" />
      <span className="active-file">{fileName || 'No dataset open'}</span>
      <span className="file-status">
        <i aria-hidden="true" />
        {busy
          ? 'Processing locally'
          : isDirty
            ? 'Unsaved changes'
            : fileName
              ? 'Saved'
              : 'Local workspace'}
      </span>
      <div className="window-controls">
        <button
          type="button"
          aria-label="Minimize window"
          title="Minimize"
          onClick={() => void desktopWindow()?.minimize()}
        >
          <span aria-hidden="true">−</span>
        </button>
        <button
          type="button"
          aria-label={isMaximized ? 'Restore window' : 'Maximize window'}
          title={isMaximized ? 'Restore' : 'Maximize'}
          onClick={() => void desktopWindow()?.toggleMaximize()}
        >
          <span aria-hidden="true">{isMaximized ? '❐' : '□'}</span>
        </button>
        <button type="button" aria-label="Close window" title="Close" onClick={onClose}>
          <span aria-hidden="true">×</span>
        </button>
      </div>
    </header>
  );
}
