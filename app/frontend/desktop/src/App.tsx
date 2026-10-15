import { useEffect } from 'react';
import { listen } from '@tauri-apps/api/event';
import { open } from '@tauri-apps/plugin-dialog';
import { useDatasetExplorer } from './features/explorer/useDatasetExplorer';
import { DatasetSelector } from './features/explorer/DatasetSelector';
import { SchemaSummary } from './features/explorer/SchemaSummary';
import { DatasetPreview } from './features/explorer/DatasetPreview';
import { WorkflowActions } from './features/workspace/WorkflowActions';
import { BeforeAfterComparison } from './features/cleaning/BeforeAfterComparison';
import { useDatasetStore } from './stores/datasetStore';
import { useWorkspaceStore } from './stores/workspaceStore';
import { getTauriRuntimeError, isTauriRuntime, runtimeMessage } from './services/tauriRuntime';
import './styles/globals.css';

export default function App() {
  const { path, setPath, dataset, preview, openDataset, page } = useDatasetExplorer();
  const busy = useWorkspaceStore((state) => state.busy);
  const error = useWorkspaceStore((state) => state.error);
  const sourceDataset = useDatasetStore((state) => state.sourceDataset);
  const sourcePreview = useDatasetStore((state) => state.sourcePreview);
  const setError = useWorkspaceStore((state) => state.setError);
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
    <main className="workspace">
      <header>
        <div>
          <p className="eyebrow">LOCAL DATA WORKSPACE</p>
          <h1>Forma</h1>
        </div>
        <span className="local">● Processing on this device</span>
      </header>
      <DatasetSelector
        path={path}
        busy={busy}
        setPath={setPath}
        onBrowse={browse}
        onOpen={openDataset}
      />
      {error && (
        <p role="alert" className="error">
          {error}
        </p>
      )}
      {!dataset && (
        <section className="empty">
          <h2>Start with a dataset</h2>
          <p>Choose a local CSV or Parquet file to inspect schema and records.</p>
        </section>
      )}
      {dataset && (
        <>
          <SchemaSummary dataset={dataset} />
          <DatasetPreview preview={preview} onPage={page} />
          {sourceDataset && (
            <section className="card">
              <h2>Source comparison</h2>
              <p>Original dataset: {sourceDataset.source_path}</p>
              <BeforeAfterComparison
                before={sourcePreview?.records ?? []}
                after={preview?.records ?? []}
              />
            </section>
          )}
          <WorkflowActions />
        </>
      )}
    </main>
  );
}
