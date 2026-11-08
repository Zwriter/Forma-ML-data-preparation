import { useProfileToolStore } from '../../../stores/profileToolStore';
import type { Anomalies, RowsPage } from '../../../types/profileTools';
import { formatCount, formatPercent, formatValue } from '../profileFormat';
import { PAGE_ROWS } from './DataQualityTool';
import { RowsGrid } from './RowsGrid';
import { ToolView } from './ToolView';
import { useLatestProfile, useTool } from './useTool';

/** Anomalies (FR-042): outliers per number or date column, and the rows that hold them. */
export function AnomaliesTool() {
  const column = useProfileToolStore((state) => state.inputs.anomalies?.column) as
    | string
    | undefined;
  const profile = useLatestProfile();
  const { result, view } = useTool<Anomalies>(
    'anomalies',
    'profile.anomalies',
    profile ? {} : null,
  );
  const rows = useTool<RowsPage>(
    'rows',
    'profile.rows',
    profile && column
      ? { filter: { kind: 'outliers', column }, offset: 0, limit: PAGE_ROWS }
      : null,
  );
  const rowsEntry = rows.view.entry;

  return (
    <ToolView title="Anomalies" {...view}>
      {result &&
        (result.columns.length ? (
          <div className="tool-table-wrap tool-table-fit">
            <table className="tool-table" aria-label="Outliers by column">
              <thead>
                <tr>
                  <th scope="col">Column</th>
                  <th scope="col">Outliers</th>
                  <th scope="col">Expected range</th>
                  <th scope="col">Furthest values</th>
                  <th scope="col">
                    <span className="sr-only">Rows</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {result.columns.map((item) => (
                  <tr key={item.column}>
                    <th scope="row">{item.column}</th>
                    <td>
                      {`${formatCount(item.count)} (${formatPercent(item.share)})`}
                      {item.note === 'no_spread' && (
                        <span className="tool-muted"> No spread: most values are equal</span>
                      )}
                    </td>
                    <td>{`${formatValue(item.low)} to ${formatValue(item.high)}`}</td>
                    <td>{item.extremes.join(', ')}</td>
                    <td>
                      <button
                        type="button"
                        className="btn btn-secondary btn-sm"
                        disabled={!item.count}
                        aria-pressed={column === item.column}
                        onClick={() =>
                          useProfileToolStore
                            .getState()
                            .setInput('anomalies', 'column', item.column)
                        }
                      >
                        Show rows for {item.column}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="profile-panel-note">No number or date columns</p>
        ))}
      {column && rowsEntry?.status === 'failed' && <p role="alert">{rowsEntry.error?.message}</p>}
      {column && rowsEntry?.status === 'running' && <p className="tool-muted">Loading rows…</p>}
      {/* The rows result is shared with Data quality, so show it only once this request is done. */}
      {column && rowsEntry?.status === 'ready' && rows.result && (
        <RowsGrid page={rows.result} label="Outlier rows" />
      )}
    </ToolView>
  );
}
