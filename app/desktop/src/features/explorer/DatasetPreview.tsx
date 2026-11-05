import { useEffect, useLayoutEffect, useRef } from 'react';
import type { Dataset, Preview } from '../../types/dataset';
import type { WorksheetMarkers } from '../../types/cleaning';
import { useDatasetStore } from '../../stores/datasetStore';
import { Icon } from '../../components/Icon';
import { ColumnHeading } from './ColumnHeading';
import { SchemaSummary } from './SchemaSummary';
import { TablePager } from './TablePager';

type Props = {
  dataset: Dataset;
  preview: Preview | null;
  selectedColumn: string | null;
  onSelectColumn: (name: string) => void;
  onOpenColumnDetails: (name: string) => void;
  selectedColumns: string[];
  onOpenColumnSelector: () => void;
  onPage: (offset: number, limit?: number, search?: string) => void;
  /** Read-only change markers shown by the Clean tab's live preview. */
  markers?: WorksheetMarkers;
};

export function DatasetPreview({
  dataset,
  preview,
  selectedColumn,
  onSelectColumn,
  onOpenColumnDetails,
  selectedColumns,
  onOpenColumnSelector,
  onPage,
  markers,
}: Props) {
  const offset = preview?.offset ?? 0;
  const query = useDatasetStore((state) => state.search);
  const activeCell = useDatasetStore((state) => state.activeCell);
  const activeFileId = useDatasetStore((state) => state.activeFileId);
  const setView = useDatasetStore((state) => state.setView);
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const scrollTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const tableWrap = useRef<HTMLDivElement>(null);
  const records = preview?.records ?? [];
  const setActiveCell = (cell: { row: number; column: string }) => setView({ activeCell: cell });

  useEffect(
    () => () => {
      if (searchTimer.current) clearTimeout(searchTimer.current);
      if (scrollTimer.current) clearTimeout(scrollTimer.current);
    },
    [],
  );

  // Restore where this file's worksheet was left, in either tab.
  useLayoutEffect(() => {
    const { top, left } = useDatasetStore.getState().scroll;
    tableWrap.current?.scrollTo?.({ top, left });
  }, [activeFileId, records.length > 0]);

  const activeRowIndex = activeCell?.row ?? offset;
  const activeColumn = activeCell?.column ?? preview?.columns[0]?.name;
  const activeColumnIndex =
    preview?.columns.findIndex((column) => column.name === activeColumn) ?? -1;
  const activeAddress =
    activeColumnIndex >= 0 ? `${columnLetter(activeColumnIndex)}${activeRowIndex + 2}` : '';

  function columnLetter(index: number) {
    let value = index + 1;
    let label = '';
    while (value > 0) {
      value -= 1;
      label = String.fromCharCode(65 + (value % 26)) + label;
      value = Math.floor(value / 26);
    }
    return label;
  }

  function requestPage(offset: number, limit?: number) {
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = null;
    if (query.trim()) onPage(offset, limit, query);
    else if (limit === undefined) onPage(offset);
    else onPage(offset, limit);
  }

  return (
    <section className="data-card" id="dataset-table" aria-labelledby="preview-title">
      <h2 className="sr-only" id="preview-title">
        Record preview
      </h2>
      <div className="table-toolbar">
        <span className="spreadsheet-cell-address">{activeAddress || '—'}</span>
        <label className="search-box" htmlFor="preview-search">
          <span className="search-mark" aria-hidden="true">
            ⌕
          </span>
          <input
            id="preview-search"
            value={query}
            onChange={(event) => {
              const search = event.target.value;
              setView({ search });
              if (searchTimer.current) clearTimeout(searchTimer.current);
              searchTimer.current = setTimeout(
                () =>
                  search.trim()
                    ? onPage(0, preview?.limit ?? 100, search)
                    : onPage(0, preview?.limit ?? 100),
                250,
              );
            }}
            placeholder="Search preview rows or columns..."
          />
        </label>
        <span className="preview-selection">
          {`${selectedColumns.length} of ${dataset.columns} columns visible`}
        </span>
        <button type="button" className="toolbar-link" onClick={onOpenColumnSelector}>
          <Icon name="columns" /> Columns
        </button>
        <SchemaSummary dataset={dataset} visibleColumns={selectedColumns.length} />
      </div>
      {records.length ? (
        <div
          className="table-wrap"
          ref={tableWrap}
          onScroll={(event) => {
            const { scrollTop: top, scrollLeft: left } = event.currentTarget;
            if (scrollTimer.current) clearTimeout(scrollTimer.current);
            scrollTimer.current = setTimeout(() => setView({ scroll: { top, left } }), 150);
          }}
        >
          <table>
            <thead>
              <tr className="spreadsheet-column-letters">
                <th className="row-number-heading" aria-label="Select all cells" />
                {preview?.columns.map((column, index) => (
                  <th key={column.name}>{columnLetter(index)}</th>
                ))}
              </tr>
              <tr>
                <th className="row-number-heading" aria-label="Row number" />
                {preview?.columns.map((column) => (
                  <ColumnHeading
                    key={column.name}
                    column={column}
                    selected={selectedColumn === column.name}
                    note={markers?.columnNotes[column.name]}
                    view={preview.view}
                    onSelect={onSelectColumn}
                    onOpenDetails={onOpenColumnDetails}
                  />
                ))}
              </tr>
            </thead>
            <tbody>
              {records.map((record, index) => (
                <tr
                  key={`${offset}-${index}`}
                  className={markers?.removed.has(index) ? 'worksheet-removed' : undefined}
                >
                  <td className="row-number">{offset + index + 2}</td>
                  {preview?.columns.map((column, position) => (
                    <td
                      key={column.name}
                      role="gridcell"
                      className={`${selectedColumn === column.name ? 'selected-column' : ''}${activeRowIndex === offset + index && activeColumn === column.name ? ' active-cell' : ''}${markers?.changed.has(`${index}:${column.name}`) ? ' cell-changed' : ''}`}
                      tabIndex={0}
                      aria-selected={
                        activeRowIndex === offset + index && activeColumn === column.name
                      }
                      onFocus={() => setActiveCell({ row: offset + index, column: column.name })}
                      onClick={() => setActiveCell({ row: offset + index, column: column.name })}
                    >
                      {markers ? (
                        <MarkedValue
                          value={record[column.name]}
                          changed={markers.changed.has(`${index}:${column.name}`)}
                          before={markers.changed.get(`${index}:${column.name}`)}
                          removed={position === 0 && markers.removed.has(index)}
                        />
                      ) : (
                        String(record[column.name] ?? '—')
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="table-empty">
          {query
            ? 'No preview rows match this search.'
            : preview?.total_count === 0
              ? 'No rows match the active filter.'
              : 'This dataset has no records to preview.'}
        </p>
      )}
      <TablePager preview={preview} onPage={requestPage} />
    </section>
  );
}

function CellValue({ value }: { value: unknown }) {
  return value === null || value === undefined ? (
    <em className="cell-missing">missing</em>
  ) : (
    <>{String(value)}</>
  );
}

/** A changed cell reads "old → new"; the arrow is spoken as "changed to". */
function MarkedValue({
  value,
  changed,
  before,
  removed,
}: {
  value: unknown;
  changed: boolean;
  before: unknown;
  removed: boolean;
}) {
  return (
    <>
      {removed && <span className="cell-flag">Removed</span>}
      {changed ? (
        <>
          <span className="cell-before">
            <CellValue value={before} />
          </span>
          <span className="cell-arrow" aria-hidden="true">
            {' → '}
          </span>
          <span className="sr-only">changed to </span>
          <span className="cell-after">
            <CellValue value={value} />
          </span>
        </>
      ) : (
        <CellValue value={value} />
      )}
    </>
  );
}
