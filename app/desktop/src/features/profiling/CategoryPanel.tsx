import type { ColumnProfile } from '../../types/profile';
import { VerticalBars } from './charts/VerticalBars';
import { useChartColumn } from './charts/useChartColumn';

/** Value labels above bars only fit when there are few of them. */
const LABELLED_BARS = 4;

export function CategoryPanel({
  historyId,
  columns,
}: {
  historyId: string;
  columns: ColumnProfile[];
}) {
  const eligible = columns.filter((column) => column.categories);
  const { column, pick } = useChartColumn(
    historyId,
    'category',
    eligible,
    (item) => item.unique_count >= 2 && item.unique_count <= 50,
  );
  const summary = column?.categories;
  const items = summary
    ? [
        ...summary.top.map((item) => ({ label: item.value, count: item.count })),
        ...(summary.other_count > 0 ? [{ label: 'Other', count: summary.other_count }] : []),
      ]
    : [];

  return (
    <section
      id="profile-category-panel"
      className="profile-panel"
      aria-label={column ? `${column.name} (categorical)` : 'Categories'}
      tabIndex={-1}
    >
      <div className="profile-panel-heading">
        <h3>{column ? `${column.name} (categorical)` : 'Categories'}</h3>
        {column && (
          <select
            aria-label="Categorical column"
            value={column.name}
            onChange={(event) => pick(event.target.value)}
          >
            {eligible.map((item) => (
              <option key={item.name}>{item.name}</option>
            ))}
          </select>
        )}
      </div>
      {column ? (
        <VerticalBars
          label={`${column.name} values`}
          items={items}
          total={items.reduce((sum, item) => sum + item.count, 0)}
          showValues={items.length <= LABELLED_BARS}
          yLabel="Count"
        />
      ) : (
        <p className="profile-panel-note">No text or yes/no columns to chart.</p>
      )}
    </section>
  );
}
