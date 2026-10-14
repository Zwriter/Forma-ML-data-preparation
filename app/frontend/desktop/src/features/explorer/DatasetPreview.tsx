import type { Preview } from '../../types/dataset';

type Props = { preview: Preview | null; onPage: (offset: number) => void };
export function DatasetPreview({ preview, onPage }: Props) {
  const offset = preview?.offset ?? 0;
  return (
    <section className="card">
      <h2>Record preview</h2>
      {preview?.records.length ? (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                {preview.columns.map((column) => (
                  <th key={column.name}>{column.name}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {preview.records.map((record, index) => (
                <tr key={index}>
                  {preview.columns.map((column) => (
                    <td key={column.name}>{String(record[column.name] ?? '—')}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p>This dataset has no records to preview.</p>
      )}
      <div className="row pagination">
        <button onClick={() => onPage(Math.max(0, offset - 100))} disabled={!offset}>
          Previous
        </button>
        <span>
          Rows {offset + 1}–{offset + (preview?.records.length ?? 0)} of{' '}
          {preview?.total_count ?? 'unknown'}
        </span>
        <button
          onClick={() => onPage(offset + 100)}
          disabled={
            !preview ||
            preview.records.length < 100 ||
            (!!preview.total_count && offset + preview.records.length >= preview.total_count)
          }
        >
          Next
        </button>
      </div>
    </section>
  );
}
