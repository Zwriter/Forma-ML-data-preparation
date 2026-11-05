import type { Preview } from '../../types/dataset';
import { DEFAULT_PAGE_SIZE, pageSizeOptions } from '../../services/pageSize';
import { useSettingsStore } from '../../stores/settingsStore';

/** Row range, page size, and previous/next controls under the worksheet. */
export function TablePager({
  preview,
  onPage,
}: {
  preview: Preview | null;
  onPage: (offset: number, limit?: number) => void;
}) {
  const offset = preview?.offset ?? 0;
  const limit = preview?.limit ?? DEFAULT_PAGE_SIZE;
  const settingSize = useSettingsStore((state) => state.pageSize);
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
          onChange={(event) => onPage(0, Number(event.target.value))}
        >
          {pageSizeOptions(limit, settingSize).map((size) => (
            <option key={size} value={size}>
              {size}
            </option>
          ))}
        </select>
        <button
          onClick={() => onPage(Math.max(0, offset - limit))}
          disabled={!offset}
          aria-label="Previous page"
          title="Previous page"
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
          title="Next page"
        >
          <span className="sr-only">Next</span>›
        </button>
      </div>
    </div>
  );
}
