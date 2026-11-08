import { useProfileToolStore } from '../../../stores/profileToolStore';
import type { ColumnDetail } from '../../../types/profileTools';
import { HistogramChart } from '../charts/HistogramChart';
import { HorizontalBars } from '../charts/HorizontalBars';
import { TYPES } from '../columns/ColumnTable';
import { formatCount, formatCountWithPercent, formatPercent, formatValue } from '../profileFormat';
import { ToolView } from './ToolView';
import { useLatestProfile, useTool } from './useTool';

function statistics(detail: ColumnDetail, rows: number): [string, string][] {
  const { column, quartiles, text_length: length } = detail;
  const list: [string, string][] = [
    ['Type', TYPES[column.detected_type][1]],
    ['Missing', formatCountWithPercent(column.missing_count, rows)],
    ['Invalid', formatCountWithPercent(column.invalid_count, rows)],
    ['Unique values', formatCount(column.unique_count)],
    ['Completeness', formatPercent(column.completeness)],
  ];
  if (quartiles)
    list.push(
      ['Q1', formatValue(quartiles.q1)],
      ['Median', formatValue(quartiles.median)],
      ['Q3', formatValue(quartiles.q3)],
    );
  if (length)
    list.push(
      ['Shortest', `${formatCount(length.min)} characters`],
      ['Longest', `${formatCount(length.max)} characters`],
      ['Average length', `${formatValue(length.mean)} characters`],
    );
  return list;
}

function Values({ detail, rows }: { detail: ColumnDetail; rows: number }) {
  const { column } = detail;
  if (column.numeric)
    return <HistogramChart label={`${column.name} distribution`} bins={column.numeric.histogram} />;
  if (!column.categories) return <p className="profile-panel-note">No values to chart</p>;
  const present = rows - column.missing_count - column.invalid_count;
  return (
    <HorizontalBars
      label={`Top values of ${column.name}`}
      items={column.categories.top.map((item) => ({ label: item.value, count: item.count }))}
      total={present}
    />
  );
}

function Detail({ detail, rows }: { detail: ColumnDetail; rows: number }) {
  return (
    <div className="tool-split">
      <section className="tool-panel" aria-label="Column statistics">
        <h3>{detail.column.name}</h3>
        <ul className="tool-stats" aria-label="Statistics">
          {statistics(detail, rows).map(([name, value]) => (
            <li key={name}>
              <span>{name}</span>
              <strong>{value}</strong>
            </li>
          ))}
        </ul>
        <h3>Invalid values</h3>
        {detail.invalid_values.length ? (
          <ul className="tool-list" aria-label="Invalid values">
            {detail.invalid_values.map((item) => (
              <li key={item.value}>
                <code>{item.value}</code> <span>{formatCount(item.count)}×</span>{' '}
                <span className="tool-muted">{item.reason}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="profile-panel-note">No invalid values</p>
        )}
      </section>
      <section className="tool-panel tool-scroll" aria-label={`Values of ${detail.column.name}`}>
        <Values detail={detail} rows={rows} />
      </section>
    </div>
  );
}

/** Column details (FR-037): every figure for one column, with Previous and Next. */
export function ColumnDetailsTool() {
  const chosen = useProfileToolStore((state) => state.inputs.column_details?.column);
  const profile = useLatestProfile();
  const columns = profile?.columns ?? [];
  const index = Math.max(
    0,
    columns.findIndex((column) => column.name === chosen),
  );
  const name = columns[index]?.name;
  const { result, view } = useTool<ColumnDetail>(
    'column_detail',
    'profile.column_detail',
    name ? { column: name } : null,
  );
  const pick = (next: string) =>
    useProfileToolStore.getState().setInput('column_details', 'column', next);

  const toolbar = (
    <>
      <select aria-label="Column" value={name} onChange={(event) => pick(event.target.value)}>
        {columns.map((column) => (
          <option key={column.name}>{column.name}</option>
        ))}
      </select>
      <button type="button" disabled={index <= 0} onClick={() => pick(columns[index - 1].name)}>
        Previous column
      </button>
      <button
        type="button"
        disabled={index >= columns.length - 1}
        onClick={() => pick(columns[index + 1].name)}
      >
        Next column
      </button>
    </>
  );

  return (
    <ToolView title="Column details" {...view} toolbar={toolbar}>
      {result && profile && <Detail detail={result} rows={profile.row_count} />}
    </ToolView>
  );
}
