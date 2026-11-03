import type { Preview } from '../../types/dataset';

/** Row range, page size, and previous/next controls under the worksheet. */
export function TablePager({
  preview,
  onPage,
}: {
  preview: Preview | null;
  onPage: (offset: number, limit?: number) => void;
}) {
  const offset = preview?.offset ?? 0;
  const limit = preview?.limit ?? 100;
  return (
    <div className="table-footer">
      <span>
        {preview?.total_count === 0
          ? '0 rows'
          : `Rows ${offset + 1}–${offset + (preview?.records.length ?? 0)} of ${preview?.total_count ?? 'unknown'}`}
      </span>
      <div className="pagination-controls">
        <label htmlFor="rows-per-page">Rows per page</label>
        <select
          id="rows-per-page"
          value={limit}
          aria-label="Rows per page (10 to 500)"
          onChange={(event) => onPage(0, Number(event.target.value))}
        >
          <option value="10">10</option>
          <option value="25">25</option>
          <option value="50">50</option>
          <option value="100">100</option>
          <option value="250">250</option>
          <option value="500">500</option>
        </select>
        <button
          onClick={() => onPage(Math.max(0, offset - limit))}
          disabled={!offset}
          aria-label="Previous page"
        >
          <span className="sr-only">Previous</span>‹
        </button>
        <span className="page-number">{Math.floor(offset / limit) + 1}</span>
        <button
          onClick={() => onPage(offset + limit)}
          disabled={
            !preview ||
            preview.records.length < preview.limit ||
            (!!preview.total_count && offset + preview.records.length >= preview.total_count)
          }
          aria-label="Next page"
        >
          <span className="sr-only">Next</span>›
        </button>
      </div>
    </div>
  );
}
