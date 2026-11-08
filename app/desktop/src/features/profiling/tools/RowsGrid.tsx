import { forwardRef } from 'react';
import { Icon } from '../../../components/Icon';
import type { CellMark, RowsPage } from '../../../types/profileTools';

const MARK_TEXT: Record<CellMark, string> = {
  missing: 'Missing',
  invalid: 'Invalid',
  outlier: 'Outlier',
};

function Cell({ value, mark, reason }: { value: string | null; mark?: CellMark; reason?: string }) {
  if (!mark) return <td>{value ?? ''}</td>;
  // Problem cells can take focus, so Next/Previous problem can move between them.
  const description = reason ? { 'aria-description': reason } : {};
  return (
    <td className={`tool-cell-${mark}`} data-problem tabIndex={-1} title={reason} {...description}>
      {mark === 'missing' ? (
        'Missing'
      ) : (
        <>
          <Icon name="warning" />
          <span className="sr-only">{MARK_TEXT[mark]}: </span>
          {value}
        </>
      )}
    </td>
  );
}

/** A page of rows with their stored row numbers; problem cells are marked with text and
 *  an icon, never colour alone. Used by Data quality and Anomalies. */
export const RowsGrid = forwardRef<HTMLDivElement, { page: RowsPage; label: string }>(
  function RowsGrid({ page, label }, ref) {
    return (
      <div
        className="tool-table-wrap"
        ref={ref}
        tabIndex={0}
        role="region"
        aria-label={`${label}, scrollable`}
      >
        <table className="tool-table" aria-label={label}>
          <thead>
            <tr>
              <th scope="col">Row</th>
              {page.columns.map((name) => (
                <th key={name} scope="col">
                  {name}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {page.rows.map((row) => (
              <tr key={row.row}>
                <th scope="row">{row.row.toLocaleString('en-US')}</th>
                {page.columns.map((name, index) => (
                  <Cell
                    key={name}
                    value={row.values[index]}
                    mark={row.marks[name]}
                    reason={row.reasons[name]}
                  />
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  },
);
