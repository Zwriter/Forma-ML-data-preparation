import { useMemo, useState } from 'react';
import type { Preview } from '../../types/dataset';
import { Icon } from '../../components/Icon';

type Props = {
  preview: Preview | null;
  selectedColumn: string | null;
  onSelectColumn: (name: string) => void;
  onPage: (offset: number) => void;
};

export function DatasetPreview({ preview, selectedColumn, onSelectColumn, onPage }: Props) {
  const offset = preview?.offset ?? 0;
  const [query, setQuery] = useState('');
  const records = useMemo(() => {
    if (!preview) return [];
    const normalized = query.trim().toLowerCase();
    return normalized
      ? preview.records.filter((record) =>
          preview.columns.some((column) =>
            `${column.name} ${String(record[column.name] ?? '')}`
              .toLowerCase()
              .includes(normalized),
          ),
        )
      : preview.records;
  }, [preview, query]);

  return (
    <section className="data-card" id="dataset-table" aria-labelledby="preview-title">
      <h2 className="sr-only" id="preview-title">
        Record preview
      </h2>
      <div className="table-toolbar">
        <label className="search-box" htmlFor="preview-search">
          <span className="search-mark" aria-hidden="true">
            ⌕
          </span>
          <input
            id="preview-search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search preview rows or columns..."
          />
        </label>
        <span className="preview-selection">
          {selectedColumn ? '1 column selected' : 'No column selected'}
        </span>
        <button
          type="button"
          className="toolbar-link"
          onClick={() => onSelectColumn(preview?.columns[0]?.name ?? '')}
        >
          <Icon name="columns" /> Columns
        </button>
      </div>
      {records.length ? (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th className="row-number-heading" aria-label="Row number" />
                {preview?.columns.map((column) => (
                  <th
                    key={column.name}
                    className={selectedColumn === column.name ? 'selected' : ''}
                  >
                    <button
                      type="button"
                      className="column-heading"
                      aria-label={`Show details for ${column.name}`}
                      aria-pressed={selectedColumn === column.name}
                      onClick={() => onSelectColumn(column.name)}
                    >
                      <strong>{column.name}</strong>
                      <small>
                        <span aria-hidden="true">
                          {column.type.toLowerCase().match(/int|float|double|decimal/) ? '#' : 'A'}
                        </span>{' '}
                        {column.type}
                      </small>
                    </button>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {records.map((record, index) => (
                <tr key={`${offset}-${index}`}>
                  <td className="row-number">{offset + index + 1}</td>
                  {preview?.columns.map((column) => (
                    <td
                      key={column.name}
                      className={selectedColumn === column.name ? 'selected' : ''}
                    >
                      {String(record[column.name] ?? '—')}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="table-empty">
          {query ? 'No preview rows match this search.' : 'This dataset has no records to preview.'}
        </p>
      )}
      <div className="table-footer">
        <span>
          Rows {offset + 1}–{offset + (preview?.records.length ?? 0)} of{' '}
          {preview?.total_count ?? 'unknown'}
        </span>
        <div className="pagination-controls">
          <label htmlFor="rows-per-page">Rows per page</label>
          <select id="rows-per-page" value="100" disabled aria-label="Rows per page">
            <option value="100">100</option>
          </select>
          <button
            onClick={() => onPage(Math.max(0, offset - 100))}
            disabled={!offset}
            aria-label="Previous page"
          >
            <span className="sr-only">Previous</span>‹
          </button>
          <span className="page-number">{Math.floor(offset / 100) + 1}</span>
          <button
            onClick={() => onPage(offset + 100)}
            disabled={
              !preview ||
              preview.records.length < 100 ||
              (!!preview.total_count && offset + preview.records.length >= preview.total_count)
            }
            aria-label="Next page"
          >
            <span className="sr-only">Next</span>›
          </button>
        </div>
      </div>
    </section>
  );
}
