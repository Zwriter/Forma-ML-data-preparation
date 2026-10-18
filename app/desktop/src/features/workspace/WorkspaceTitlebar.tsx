import { useEffect, useState } from 'react';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { Icon } from '../../components/Icon';
import { isTauriRuntime } from '../../services/tauriRuntime';
import type { OpenFileTab } from '../../stores/datasetStore';

function desktopWindow() {
  if (!isTauriRuntime()) return undefined;
  try {
    return getCurrentWindow();
  } catch {
    return undefined;
  }
}

export function WorkspaceTitlebar({
  files,
  activeFileId,
  busy,
  isDirty,
  onSelectFile,
  onCloseFile,
  onClose,
}: {
  files: OpenFileTab[];
  activeFileId: string | null;
  busy: boolean;
  isDirty: boolean;
  onSelectFile: (id: string) => void;
  onCloseFile: (id: string) => void;
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
      <nav className="opened-file-tabs" aria-label="Open files" role="tablist">
        {files.map((file) => {
          const name = file.dataset.source_path.split(/[\\/]/).pop() ?? file.dataset.source_path;
          const dirty = file.history?.is_dirty ?? false;
          return (
            <div
              className={`opened-file-tab${activeFileId === file.id ? ' active' : ''}`}
              key={file.id}
            >
              <button
                type="button"
                role="tab"
                aria-selected={activeFileId === file.id}
                className={`opened-file-name${activeFileId === file.id ? ' active' : ''}`}
                onClick={() => onSelectFile(file.id)}
                title={file.dataset.source_path}
              >
                {name}
              </button>
              <button
                type="button"
                className={`opened-file-close${dirty ? ' unsaved' : ''}`}
                aria-label={`Close ${name}`}
                title={dirty ? `${name} has unsaved changes` : `Close ${name}`}
                onClick={() => onCloseFile(file.id)}
              >
                {dirty && <span className="unsaved-file-dot" aria-hidden="true" />}
                <span className="close-file-x" aria-hidden="true">
                  ×
                </span>
              </button>
            </div>
          );
        })}
      </nav>
      <span className="file-status">
        <i aria-hidden="true" />
        {busy
          ? 'Processing locally'
          : isDirty
            ? 'Unsaved changes'
            : files.length
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
