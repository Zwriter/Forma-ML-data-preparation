import { useCallback, useEffect, useState } from 'react';
import { listen } from '@tauri-apps/api/event';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { open } from '@tauri-apps/plugin-dialog';
import { WorkflowActions } from './features/workspace/WorkflowActions';
import { WorkspaceChrome } from './features/workspace/WorkspaceChrome';
import { SaveConfirmDialog } from './features/workspace/SaveConfirmDialog';
import { WorkspaceTitlebar } from './features/workspace/WorkspaceTitlebar';
import { WorkspaceContent } from './features/workspace/WorkspaceContent';
import { NotificationPopup } from './components/NotificationPopup';
import { useDraggablePopups } from './hooks/useDraggablePopups';
import { useWorkspaceHistory } from './features/workspace/useWorkspaceHistory';
import { useDatasetExplorer } from './features/explorer/useDatasetExplorer';
import { useOpenFileTabs } from './features/workspace/useOpenFileTabs';
import { useDatasetStore } from './stores/datasetStore';
import { useWorkspaceStore } from './stores/workspaceStore';
import {
  getTauriRuntimeError,
  isDemoRuntime,
  isTauriRuntime,
  runtimeMessage,
} from './services/tauriRuntime';
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
  useDraggablePopups();
  const { dataset, preview, openDataset, page, projectColumns } = useDatasetExplorer();
  const busy = useWorkspaceStore((state) => state.busy);
  const history = useWorkspaceStore((state) => state.history);
  const sourceDataset = useDatasetStore((state) => state.sourceDataset);
  const sourcePreview = useDatasetStore((state) => state.sourcePreview);
  const selectedColumns = useDatasetStore((state) => state.selectedColumns);
  const setError = useWorkspaceStore((state) => state.setError);
  const [saveDialogMode, setSaveDialogMode] = useState<'close' | 'overwrite' | null>(null);
  const closeWindow = useCallback(async () => {
    const window = getDesktopWindow();
    if (!window) {
      setError(getTauriRuntimeError().message);
      return;
    }
    try {
      await window.destroy();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not close the window.');
    }
  }, [setError]);
  const fileTabs = useOpenFileTabs(setSaveDialogMode, closeWindow);
  const requestClose = useCallback(() => {
    if (!fileTabs.requestCloseWindow()) void closeWindow();
  }, [closeWindow, fileTabs.requestCloseWindow]);
  const openOverwriteDialog = useCallback(() => setSaveDialogMode('overwrite'), []);
  const { save, undo, redo } = useWorkspaceHistory({ onOverwriteRequired: openOverwriteDialog });

  const [activeTab, setActiveTab] = useState('Data');
  const [showColumnSelector, setShowColumnSelector] = useState(false);
  const [operationDialog, setOperationDialog] = useState<
    'filter' | 'sort' | 'group_by' | 'pivot' | 'unpivot' | null
  >(null);
  useEffect(() => {
    const window = getDesktopWindow();
    if (!window) return;
    let unlisten: (() => void) | undefined;
    void window
      .onCloseRequested((event) => {
        if (fileTabs.requestCloseWindow()) event.preventDefault();
      })
      .then((stop) => {
        unlisten = stop;
      });
    return () => unlisten?.();
  }, [fileTabs.requestCloseWindow]);

  function saveFromDialog(forceOverwrite: boolean) {
    void save(forceOverwrite);
  }

  useEffect(() => {
    if (isDemoRuntime()) {
      void openDataset('sample.csv');
      return;
    }
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
  }, [openDataset, setError]);

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
      <NotificationPopup />
      <WorkspaceTitlebar
        files={fileTabs.files}
        activeFileId={fileTabs.activeFileId}
        busy={busy}
        isDirty={history?.is_dirty ?? false}
        onSelectFile={fileTabs.activate}
        onCloseFile={fileTabs.requestCloseFile}
        onClose={requestClose}
      />

      <WorkspaceChrome
        activeTab={activeTab}
        onTabChange={(tab) => {
          setActiveTab(tab);
          if (tab !== 'Data') {
            setShowColumnSelector(false);
            setOperationDialog(null);
          }
        }}
        onReload={() => page(preview?.offset ?? 0)}
        onSelectColumns={() => {
          setShowColumnSelector(true);
        }}
        onFilter={() => setOperationDialog('filter')}
        onSort={() => setOperationDialog('sort')}
        onGroup={() => setOperationDialog('group_by')}
        onPivot={() => setOperationDialog('pivot')}
        onUnpivot={() => setOperationDialog('unpivot')}
        hasDataset={Boolean(dataset)}
        onSave={() => {
          void save();
        }}
        onUndo={() => void undo()}
        onRedo={() => void redo()}
        canUndo={history?.can_undo ?? false}
        canRedo={history?.can_redo ?? false}
      />

      <div className="workspace-body">
        <WorkspaceContent
          activeTab={activeTab}
          dataset={dataset}
          preview={preview}
          sourceDataset={sourceDataset}
          sourcePreview={sourcePreview}
          selectedColumns={selectedColumns}
          busy={busy}
          showColumnSelector={showColumnSelector}
          onShowColumnSelector={setShowColumnSelector}
          onBack={() => setActiveTab('Data')}
          onBrowse={() => void browse()}
          onOpenDataset={async (path) => {
            const opened = await openDataset(path);
            if (opened) setActiveTab('Data');
            return opened;
          }}
          onPage={page}
          onProjectColumns={(columns) => void projectColumns(columns)}
        />
        <WorkflowActions
          activeTab={activeTab}
          onSaveComplete={fileTabs.onSaveComplete}
          operationDialog={operationDialog}
          onCloseOperationDialog={() => setOperationDialog(null)}
        />
      </div>
      {saveDialogMode && (
        <SaveConfirmDialog
          mode={saveDialogMode}
          onSave={saveFromDialog}
          onDiscard={fileTabs.discardClose}
          onCancel={fileTabs.cancelClose}
        />
      )}
    </div>
  );
}
