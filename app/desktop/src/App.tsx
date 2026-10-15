import { useEffect, useState } from 'react';
import { listen } from '@tauri-apps/api/event';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { open } from '@tauri-apps/plugin-dialog';
import { Icon } from './components/Icon';
import { ColumnDetails } from './features/explorer/ColumnDetails';
import { DatasetPreview } from './features/explorer/DatasetPreview';
import { DatasetSelector } from './features/explorer/DatasetSelector';
import { SchemaSummary } from './features/explorer/SchemaSummary';
import { BeforeAfterComparison } from './features/cleaning/BeforeAfterComparison';
import { WorkflowActions } from './features/workspace/WorkflowActions';
import { WorkspaceChrome, WorkspaceSidebar } from './features/workspace/WorkspaceChrome';
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

export default function App() {
  const { path, setPath, dataset, preview, openDataset, page } = useDatasetExplorer();
  const busy = useWorkspaceStore((state) => state.busy);
  const error = useWorkspaceStore((state) => state.error);
  const sourceDataset = useDatasetStore((state) => state.sourceDataset);
  const sourcePreview = useDatasetStore((state) => state.sourcePreview);
  const setError = useWorkspaceStore((state) => state.setError);
  const [showPathPicker, setShowPathPicker] = useState(false);
  const [activeTab, setActiveTab] = useState('Home');
  const [selectedColumn, setSelectedColumn] = useState<string | null>(null);
  const [showColumnDetails, setShowColumnDetails] = useState(true);
  const [isMaximized, setIsMaximized] = useState(false);
  const column = dataset?.schema.find((item) => item.name === selectedColumn) ?? dataset?.schema[0];
  const fileName = dataset?.source_path.split(/[\\/]/).pop() ?? '';
  const title = fileName.replace(/\.[^.]+$/, '').replace(/[_-]+/g, ' ') || 'Dataset';

  useEffect(() => {
    if (dataset) setShowPathPicker(false);
  }, [dataset]);

  useEffect(() => {
    const window = getDesktopWindow();
    if (!window) return;
    let active = true;
    let unlisten: (() => void) | undefined;
    void window.isMaximized().then((maximized) => {
      if (active) setIsMaximized(maximized);
    });
    void window.onResized(() => {
      void window.isMaximized().then((maximized) => {
        if (active) setIsMaximized(maximized);
      });
    }).then((stopListening) => {
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
      if (typeof selected === 'string') setPath(selected);
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
        onTabChange={setActiveTab}
        onOpen={() => setShowPathPicker(true)}
        onReload={() => page(preview?.offset ?? 0)}
        onSelectColumns={() => {
          setSelectedColumn(dataset?.schema[0]?.name ?? null);
          setShowColumnDetails(true);
        }}
        hasDataset={Boolean(dataset)}
      />

      <div className="workspace-body">
        <WorkspaceSidebar activeTab={activeTab} onTabChange={setActiveTab} />
        <main className="work-area">
          {error && (
            <p role="alert" className="error-banner">
              {error}
            </p>
          )}
          {activeTab === 'Settings' ? (
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
            </section>
          ) : !dataset ? (
            <section className="welcome-panel">
              <p className="eyebrow">LOCAL DATA WORKSPACE</p>
              <h1>Start with a dataset</h1>
              <p>Open a CSV or Parquet file to explore its schema and records.</p>
              <DatasetSelector
                path={path}
                busy={busy}
                setPath={setPath}
                onBrowse={browse}
                onOpen={openDataset}
              />
            </section>
          ) : (
            <>
              <div className="dataset-heading">
                <div>
                  <h1>{title}</h1>
                  <p className="breadcrumb">
                    Local <span>›</span> Datasets <span>›</span> {fileName}
                  </p>
                </div>
                <SchemaSummary dataset={dataset} />
              </div>
              {showPathPicker && (
                <div className="open-panel">
                  <DatasetSelector
                    path={path}
                    busy={busy}
                    setPath={setPath}
                    onBrowse={browse}
                    onOpen={openDataset}
                  />
                  <button
                    type="button"
                    className="quiet-button"
                    onClick={() => setShowPathPicker(false)}
                  >
                    Close
                  </button>
                </div>
              )}
              <div className="data-layout">
                <div className="data-primary">
                  <DatasetPreview
                    preview={preview}
                    selectedColumn={column?.name ?? null}
                    onSelectColumn={(name) => {
                      setSelectedColumn(name);
                      setShowColumnDetails(true);
                    }}
                    onPage={page}
                  />
                  {sourceDataset && (
                    <section className="card source-comparison">
                      <h2>Source comparison</h2>
                      <p>Original dataset: {sourceDataset.source_path}</p>
                      <BeforeAfterComparison
                        before={sourcePreview?.records ?? []}
                        after={preview?.records ?? []}
                      />
                    </section>
                  )}
                  <WorkflowActions />
                </div>
                {showColumnDetails && (
                  <ColumnDetails
                    column={column}
                    records={preview?.records ?? []}
                    onClose={() => setShowColumnDetails(false)}
                  />
                )}
              </div>
            </>
          )}
        </main>
      </div>
    </div>
  );
}
