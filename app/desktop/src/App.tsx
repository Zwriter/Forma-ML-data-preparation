import { useEffect, useState } from 'react';
import { listen } from '@tauri-apps/api/event';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { open } from '@tauri-apps/plugin-dialog';
import { Icon } from './components/Icon';
import { ColumnDetails } from './features/explorer/ColumnDetails';
import { DatasetPreview } from './features/explorer/DatasetPreview';
import { BeforeAfterComparison } from './features/cleaning/BeforeAfterComparison';
import { WorkflowActions } from './features/workspace/WorkflowActions';
import { WorkspaceChrome } from './features/workspace/WorkspaceChrome';
import { useDatasetExplorer } from './features/explorer/useDatasetExplorer';
import { useDatasetStore } from './stores/datasetStore';
import { useWorkspaceStore } from './stores/workspaceStore';
import { getTauriRuntimeError, isTauriRuntime, runtimeMessage } from './services/tauriRuntime';
import './styles/globals.css';
import './styles/workspace.css';
import './styles/workspace-content.css';
import './styles/explorer.css';
import './styles/inspector.css';

function getDesktopWindow() {
  if (!isTauriRuntime()) return undefined;
  try {
    return getCurrentWindow();
  } catch {
    return undefined;
  }
}

type RecentFile = { path: string; name: string; lastOpened: number; favorite: boolean };
const RECENT_FILES_KEY = 'forma.recent-files';

function readRecentFiles(): RecentFile[] {
  try {
    const saved: unknown = JSON.parse(window.localStorage.getItem(RECENT_FILES_KEY) ?? '[]');
    if (!Array.isArray(saved)) return [];
    return saved
      .filter(
        (item): item is Omit<RecentFile, 'favorite'> & { favorite?: boolean } =>
          typeof item?.path === 'string' &&
          typeof item?.name === 'string' &&
          typeof item?.lastOpened === 'number',
      )
      .map((item) => ({ ...item, favorite: item.favorite === true }));
  } catch {
    return [];
  }
}

export default function App() {
  const { dataset, preview, openDataset, page } = useDatasetExplorer();
  const busy = useWorkspaceStore((state) => state.busy);
  const error = useWorkspaceStore((state) => state.error);
  const sourceDataset = useDatasetStore((state) => state.sourceDataset);
  const sourcePreview = useDatasetStore((state) => state.sourcePreview);
  const setError = useWorkspaceStore((state) => state.setError);
  const [activeTab, setActiveTab] = useState('Data');
  const [filePage, setFilePage] = useState<'import' | 'settings' | 'settings-about'>('import');
  const [recentFiles, setRecentFiles] = useState<RecentFile[]>(readRecentFiles);
  const [recentFilter, setRecentFilter] = useState<'recent' | 'favorites'>('recent');
  const [recentSearch, setRecentSearch] = useState('');
  const [selectedColumn, setSelectedColumn] = useState<string | null>(null);
  const [showColumnDetails, setShowColumnDetails] = useState(false);
  const [isMaximized, setIsMaximized] = useState(false);
  const column = dataset?.schema.find((item) => item.name === selectedColumn);
  const fileName = dataset?.source_path.split(/[\\/]/).pop() ?? '';
  const title = fileName.replace(/\.[^.]+$/, '').replace(/[_-]+/g, ' ') || 'Dataset';

  useEffect(() => {
    if (!dataset) return;
    const sourcePath = dataset.source_path;
    const recentFile = {
      path: sourcePath,
      name: sourcePath.split(/[\\/]/).pop() || sourcePath,
      lastOpened: Date.now(),
    };
    setRecentFiles((current) => {
      const previous = current.find((file) => file.path === sourcePath);
      return [
        { ...recentFile, favorite: previous?.favorite ?? false },
        ...current.filter((file) => file.path !== sourcePath),
      ].slice(0, 10);
    });
  }, [dataset?.source_path, dataset?.dataset_id]);

  const visibleRecentFiles = recentFiles.filter((file) => {
    if (recentFilter === 'favorites' && !file.favorite) return false;
    const query = recentSearch.trim().toLowerCase();
    return (
      !query || file.name.toLowerCase().includes(query) || file.path.toLowerCase().includes(query)
    );
  });

  function toggleFavorite(path: string) {
    setRecentFiles((files) =>
      files.map((file) => (file.path === path ? { ...file, favorite: !file.favorite } : file)),
    );
  }

  useEffect(() => {
    try {
      window.localStorage.setItem(RECENT_FILES_KEY, JSON.stringify(recentFiles));
    } catch {
      // Recent files remain available for this session if browser storage is disabled.
    }
  }, [recentFiles]);

  useEffect(() => {
    const window = getDesktopWindow();
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
      .then((stopListening) => {
        if (active) unlisten = stopListening;
        else stopListening();
      });
    return () => {
      active = false;
      unlisten?.();
    };
  }, []);

  useEffect(() => {
    if (!isTauriRuntime()) {
      setError(runtimeMessage);
      return;
    }
    let stop: (() => void) | undefined;
    listen<string>('engine-crashed', (event) => setError(event.payload))
      .then((unlisten) => {
        stop = unlisten;
      })
      .catch((cause: unknown) => {
        setError(cause instanceof Error ? cause.message : getTauriRuntimeError().message);
      });
    return () => stop?.();
  }, [setError]);

  async function browse() {
    if (!isTauriRuntime()) {
      setError(runtimeMessage);
      return;
    }
    try {
      const selected = await open({
        multiple: false,
        filters: [{ name: 'Datasets', extensions: ['csv', 'parquet'] }],
      });
      if (typeof selected === 'string' && (await openDataset(selected))) setActiveTab('Data');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : getTauriRuntimeError().message);
    }
  }

  return (
    <div className="app-shell" id="workspace-top">
      <header
        className="app-titlebar"
        onMouseDown={(event) => {
          if (event.button !== 0 || (event.target as HTMLElement).closest('a, button')) return;
          void getDesktopWindow()?.startDragging();
        }}
        onDoubleClick={(event) => {
          if ((event.target as HTMLElement).closest('a, button')) return;
          void getDesktopWindow()?.toggleMaximize();
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
          {busy ? 'Processing locally' : dataset ? 'Local file — Ready' : 'Local workspace'}
        </span>
        <div className="window-controls">
          <button
            type="button"
            aria-label="Minimize window"
            title="Minimize"
            onClick={() => {
              void getDesktopWindow()?.minimize();
            }}
          >
            <span aria-hidden="true">−</span>
          </button>
          <button
            type="button"
            aria-label={isMaximized ? 'Restore window' : 'Maximize window'}
            title={isMaximized ? 'Restore' : 'Maximize'}
            onClick={() => {
              void getDesktopWindow()?.toggleMaximize();
            }}
          >
            <span aria-hidden="true">{isMaximized ? '❐' : '□'}</span>
          </button>
          <button
            type="button"
            aria-label="Close window"
            title="Close"
            onClick={() => {
              void getDesktopWindow()?.close();
            }}
          >
            <span aria-hidden="true">×</span>
          </button>
        </div>
      </header>

      <WorkspaceChrome
        activeTab={activeTab}
        onTabChange={(tab) => {
          setActiveTab(tab);
          if (tab === 'File') setFilePage('import');
          if (tab !== 'Data') setShowColumnDetails(false);
        }}
        onReload={() => page(preview?.offset ?? 0)}
        onSelectColumns={() => {
          setSelectedColumn(dataset?.schema[0]?.name ?? null);
          setShowColumnDetails(true);
        }}
        hasDataset={Boolean(dataset)}
      />

      <div className="workspace-body">
        <main
          className={`work-area${activeTab === 'Data' && dataset ? ' worksheet-work-area' : ''}`}
        >
          {error && activeTab !== 'File' && (
            <p role="alert" className="error-banner">
              {error}
            </p>
          )}
          {activeTab === 'File' && (
            <section className="file-backstage" id="file">
              <nav className="file-navigation" aria-label="File menu">
                <button
                  className="file-back"
                  type="button"
                  aria-label="Back to workspace"
                  onClick={() => setActiveTab('Data')}
                >
                  <Icon name="back" />
                </button>
                <button
                  className={filePage === 'import' ? 'selected' : ''}
                  type="button"
                  onClick={() => setFilePage('import')}
                >
                  <Icon name="open" />
                  Import
                </button>
                <div className="file-nav-bottom">
                  <button
                    className={filePage.startsWith('settings') ? 'selected' : ''}
                    type="button"
                    onClick={() => setFilePage('settings')}
                  >
                    <Icon name="settings" />
                    Settings
                  </button>
                </div>
              </nav>
              <div className="file-content">
                {error && (
                  <p role="alert" className="error-banner">
                    {error}
                  </p>
                )}
                {filePage === 'import' && (
                  <>
                    <h1>Forma</h1>
                    <div className="recent-files-tools">
                      <div className="recent-file-filters" role="group" aria-label="Filter files">
                        <button
                          type="button"
                          className={recentFilter === 'recent' ? 'active' : ''}
                          aria-pressed={recentFilter === 'recent'}
                          onClick={() => setRecentFilter('recent')}
                        >
                          Recent
                        </button>
                        <button
                          type="button"
                          className={recentFilter === 'favorites' ? 'active' : ''}
                          aria-pressed={recentFilter === 'favorites'}
                          onClick={() => setRecentFilter('favorites')}
                        >
                          Favorites
                        </button>
                      </div>
                      <div className="recent-file-actions">
                        <input
                          type="search"
                          aria-label="Search recent files"
                          placeholder="Search files"
                          value={recentSearch}
                          onChange={(event) => setRecentSearch(event.target.value)}
                        />
                        <button
                          type="button"
                          className="file-primary-action"
                          disabled={busy}
                          onClick={() => void browse()}
                        >
                          <Icon name="open" />
                          Import file
                        </button>
                      </div>
                    </div>
                    {visibleRecentFiles.length ? (
                      <ul className="recent-files-list">
                        {visibleRecentFiles.map((file) => (
                          <li key={file.path}>
                            <button
                              type="button"
                              className="recent-file-open"
                              onClick={async () => {
                                if (await openDataset(file.path)) setActiveTab('Data');
                              }}
                            >
                              <Icon name="open" />
                              <span className="recent-file-name">{file.name}</span>
                              <span className="recent-file-path">{file.path}</span>
                              <time dateTime={new Date(file.lastOpened).toISOString()}>
                                {new Date(file.lastOpened).toLocaleDateString()}
                              </time>
                            </button>
                            <button
                              type="button"
                              className={`favorite-toggle${file.favorite ? ' is-favorite' : ''}`}
                              aria-label={
                                file.favorite
                                  ? `Remove ${file.name} from favorites`
                                  : `Add ${file.name} to favorites`
                              }
                              aria-pressed={file.favorite}
                              onClick={() => toggleFavorite(file.path)}
                            >
                              {file.favorite ? '★' : '☆'}
                            </button>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="recent-files-empty">
                        {recentFilter === 'favorites'
                          ? 'No favorites yet. Add files with the star button.'
                          : recentSearch.trim()
                            ? 'No files match your search.'
                            : 'No recently opened files.'}
                      </p>
                    )}
                  </>
                )}
                {filePage === 'settings' && (
                  <section className="card settings-card" id="settings">
                    <h1>Settings</h1>
                    <p>Forma processes datasets locally on this device.</p>
                    <label className="check">
                      <input
                        type="checkbox"
                        checked={showColumnDetails}
                        onChange={(event) => setShowColumnDetails(event.target.checked)}
                      />
                      Show column details
                    </label>
                    <button
                      type="button"
                      className="about-settings-link"
                      onClick={() => setFilePage('settings-about')}
                    >
                      About Forma
                    </button>
                  </section>
                )}
                {filePage === 'settings-about' && (
                  <section className="card settings-card">
                    <button
                      type="button"
                      className="quiet-button"
                      onClick={() => setFilePage('settings')}
                    >
                      Back to Settings
                    </button>
                    <h1>About Forma</h1>
                    <p>Forma is a local data workspace for exploring and transforming datasets.</p>
                  </section>
                )}
              </div>
            </section>
          )}
          {activeTab !== 'File' && !dataset ? (
            <section className="welcome-panel">
              <p className="eyebrow">LOCAL DATA WORKSPACE</p>
              <h1>Start with a dataset</h1>
              <p>Open a CSV or Parquet file to explore its schema and records.</p>
              <button type="button" disabled={busy} onClick={() => void browse()}>
                {busy ? 'Importing…' : 'Import file'}
              </button>
            </section>
          ) : activeTab !== 'File' && dataset ? (
            <>
              <div className="dataset-heading">
                <div>
                  <h1>{title}</h1>
                  <p className="breadcrumb">
                    Local <span>›</span> Datasets <span>›</span> {fileName}
                  </p>
                </div>
              </div>
              {activeTab === 'Data' ? (
                <div className="spreadsheet-stage">
                  <DatasetPreview
                    dataset={dataset}
                    preview={preview}
                    selectedColumn={column?.name ?? null}
                    onSelectColumn={(name) => {
                      setSelectedColumn(name);
                      setShowColumnDetails(true);
                    }}
                    onPage={page}
                  />
                  {showColumnDetails && column && (
                    <div className="column-details-popover">
                      <ColumnDetails
                        column={column}
                        records={preview?.records ?? []}
                        onClose={() => setShowColumnDetails(false)}
                      />
                    </div>
                  )}
                </div>
              ) : (
                <>
                  <WorkflowActions activeTab={activeTab} />
                  {activeTab === 'Clean' && sourceDataset && (
                    <section className="card source-comparison">
                      <h2>Source comparison</h2>
                      <p>Original dataset: {sourceDataset.source_path}</p>
                      <BeforeAfterComparison
                        before={sourcePreview?.records ?? []}
                        after={preview?.records ?? []}
                      />
                    </section>
                  )}
                </>
              )}
            </>
          ) : null}
        </main>
      </div>
    </div>
  );
}
