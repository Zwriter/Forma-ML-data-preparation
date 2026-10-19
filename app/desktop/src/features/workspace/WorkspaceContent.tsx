import { useEffect, useState } from 'react';
import { ColumnDetails } from '../explorer/ColumnDetails';
import { ColumnSelector } from '../data-operations/ColumnSelector';
import { DatasetPreview } from '../explorer/DatasetPreview';
import { BeforeAfterComparison } from '../cleaning/BeforeAfterComparison';
import { FileBackstage } from './FileBackstage';
import type { Dataset, Preview } from '../../types/dataset';
import type { PopupPosition } from './popupPositions';

type Props = {
  activeTab: string;
  dataset: Dataset | null;
  preview: Preview | null;
  sourceDataset: Dataset | null;
  sourcePreview: Preview | null;
  selectedColumns: string[];
  busy: boolean;
  showColumnSelector: boolean;
  operationDialogOpen?: boolean;
  popupPosition: PopupPosition;
  onShowColumnSelector: (show: boolean) => void;
  onBack: () => void;
  onBrowse: () => void;
  onOpenDataset: (path: string) => Promise<boolean>;
  onPage: (offset: number) => void;
  onProjectColumns: (columns: string[]) => void;
};

export function WorkspaceContent({
  activeTab,
  dataset,
  preview,
  sourceDataset,
  sourcePreview,
  selectedColumns,
  busy,
  showColumnSelector,
  operationDialogOpen = false,
  popupPosition,
  onShowColumnSelector,
  onBack,
  onBrowse,
  onOpenDataset,
  onPage,
  onProjectColumns,
}: Props) {
  const [selectedColumn, setSelectedColumn] = useState<string | null>(null);
  const [showColumnDetails, setShowColumnDetails] = useState(false);
  const column = dataset?.schema.find((item) => item.name === selectedColumn);
  const fileName = dataset?.source_path.split(/[\\/]/).pop() ?? '';
  const title = fileName.replace(/\.[^.]+$/, '').replace(/[_-]+/g, ' ') || 'Dataset';

  useEffect(() => {
    if (activeTab !== 'Data' || showColumnSelector || operationDialogOpen) {
      setShowColumnDetails(false);
    }
    if (activeTab !== 'Data') {
      onShowColumnSelector(false);
    }
  }, [activeTab, showColumnSelector, operationDialogOpen, onShowColumnSelector]);

  return (
    <main className={`work-area${activeTab === 'Data' && dataset ? ' worksheet-work-area' : ''}`}>
      {activeTab === 'File' && (
        <FileBackstage
          dataset={dataset}
          busy={busy}
          showColumnDetails={showColumnDetails}
          onShowColumnDetails={setShowColumnDetails}
          onBack={onBack}
          onBrowse={onBrowse}
          onOpenDataset={onOpenDataset}
        />
      )}
      {activeTab !== 'File' && !dataset ? (
        <section className="welcome-panel">
          <p className="eyebrow">LOCAL DATA WORKSPACE</p>
          <h1>Start with a dataset</h1>
          <p>Open a CSV or Parquet file to explore its schema and records.</p>
          <button type="button" disabled={busy} onClick={onBrowse}>
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
                selectedColumns={selectedColumns}
                onOpenColumnSelector={() => onShowColumnSelector(true)}
                onSelectColumn={(name) => {
                  setSelectedColumn(name);
                }}
                onOpenColumnDetails={(name) => {
                  setSelectedColumn(name);
                  setShowColumnDetails(true);
                }}
                onPage={onPage}
              />
              {showColumnSelector && (
                <ColumnSelector
                  columns={dataset.schema}
                  selectedColumns={selectedColumns}
                  popupPosition={popupPosition}
                  onClose={() => onShowColumnSelector(false)}
                  onConfirm={(columns) => {
                    onShowColumnSelector(false);
                    onProjectColumns(columns);
                  }}
                />
              )}
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
          ) : activeTab === 'Clean' && sourceDataset ? (
            <section className="card source-comparison">
              <h2>Source comparison</h2>
              <p>Original dataset: {sourceDataset.source_path}</p>
              <BeforeAfterComparison
                before={sourcePreview?.records ?? []}
                after={preview?.records ?? []}
              />
            </section>
          ) : null}
        </>
      ) : null}
    </main>
  );
}
