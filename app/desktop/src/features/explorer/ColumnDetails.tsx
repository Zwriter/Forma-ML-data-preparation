import { useMemo, useState } from 'react';
import type { Column } from '../../types/dataset';

type DetailTab = 'Overview' | 'Quality' | 'Values' | 'Unique';
type Props = {
  column?: Column;
  records: Record<string, unknown>[];
  onClose: () => void;
};

export function ColumnDetails({ column, records, onClose }: Props) {
  const [tab, setTab] = useState<DetailTab>('Overview');
  const summary = useMemo(() => {
    if (!column) return null;
    const values = records.map((record) => record[column.name]);
    const present = values.filter((value) => value !== null && value !== undefined);
    const isNumeric = /int|float|double|decimal|number/i.test(column.type);
    const numeric = isNumeric
      ? present
          .map((value) => (typeof value === 'number' ? value : Number(value)))
          .filter(Number.isFinite)
      : [];
    const sorted = [...numeric].sort((left, right) => left - right);
    const frequencies = new Map<string, number>();
    present.forEach((value) => {
      const key = String(value);
      frequencies.set(key, (frequencies.get(key) ?? 0) + 1);
    });
    const mean = numeric.length
      ? numeric.reduce((total, value) => total + value, 0) / numeric.length
      : null;
    const variance =
      mean === null
        ? null
        : numeric.reduce((total, value) => total + (value - mean) ** 2, 0) / numeric.length;
    const buckets = Array.from({ length: 12 }, () => 0);
    if (numeric.length) {
      const min = sorted[0];
      const range = sorted[sorted.length - 1] - min || 1;
      numeric.forEach((value) => {
        const index = Math.min(11, Math.floor(((value - min) / range) * 12));
        buckets[index] += 1;
      });
    }
    return {
      missing: values.length - present.length,
      distinct: frequencies.size,
      common: [...frequencies.entries()].sort((left, right) => right[1] - left[1]).slice(0, 8),
      unique: [...frequencies.entries()].filter(([, count]) => count === 1).slice(0, 8),
      minimum: sorted[0],
      maximum: sorted.at(-1),
      mean,
      median: sorted.length
        ? (sorted[Math.floor((sorted.length - 1) / 2)] +
            sorted[Math.ceil((sorted.length - 1) / 2)]) /
          2
        : null,
      deviation: variance === null ? null : Math.sqrt(variance),
      buckets,
    };
  }, [column, records]);

  if (!column || !summary) {
    return (
      <aside className="inspector empty-inspector">
        <h2>Column details</h2>
        <p>Select a column to inspect values from the current preview.</p>
      </aside>
    );
  }

  const format = (value: number | undefined | null) =>
    value === undefined || value === null ? '—' : new Intl.NumberFormat().format(value);
  const maximumBucket = Math.max(1, ...summary.buckets);

  return (
    <aside className="inspector" aria-label="Column details">
      <div className="inspector-heading">
        <div>
          <h2>Column details</h2>
          <h3>{column.name}</h3>
          <p className="column-kind">{column.type}</p>
        </div>
        <button
          type="button"
          className="quiet-button"
          aria-label="Close column details"
          onClick={onClose}
        >
          ×
        </button>
      </div>
      <div className="inspector-tabs" role="tablist" aria-label="Column detail views">
        {(['Overview', 'Quality', 'Values', 'Unique'] as const).map((item) => (
          <button
            key={item}
            type="button"
            role="tab"
            aria-selected={tab === item}
            className={tab === item ? 'active' : ''}
            onClick={() => setTab(item)}
          >
            {item}
          </button>
        ))}
      </div>
      <p className="sample-note">Based on {records.length} preview rows</p>
      {tab === 'Overview' && (
        <>
          <section className="inspector-card quality-summary">
            <Metric
              label="Missing values"
              value={`${summary.missing} (${records.length ? Math.round((summary.missing / records.length) * 100) : 0}%)`}
            />
            <Metric
              label="Valid values"
              value={`${records.length - summary.missing} (${records.length ? Math.round(((records.length - summary.missing) / records.length) * 100) : 0}%)`}
            />
            <Metric label="Data type" value={column.type} />
            <Metric label="Distinct values" value={format(summary.distinct)} />
          </section>
          {summary.mean !== null && (
            <section className="inspector-card">
              <h4>Distribution</h4>
              <div
                className="histogram"
                role="img"
                aria-label={`Numeric distribution for ${column.name}`}
              >
                {summary.buckets.map((count, index) => (
                  <span
                    key={index}
                    style={{ height: `${Math.max(3, (count / maximumBucket) * 100)}%` }}
                  />
                ))}
              </div>
              <div className="range-labels">
                <span>{format(summary.minimum)}</span>
                <span>{format(summary.maximum)}</span>
              </div>
            </section>
          )}
          <section className="inspector-card">
            <h4>Summary statistics</h4>
            <Metric label="Minimum" value={format(summary.minimum)} />
            <Metric label="Maximum" value={format(summary.maximum)} />
            <Metric label="Mean" value={format(summary.mean)} />
            <Metric label="Median" value={format(summary.median)} />
            <Metric label="Std. deviation" value={format(summary.deviation)} />
          </section>
        </>
      )}
      {tab === 'Quality' && (
        <section className="inspector-card">
          <h4>Data quality</h4>
          <Metric label="Missing values" value={format(summary.missing)} />
          <Metric label="Valid values" value={format(records.length - summary.missing)} />
          <Metric label="Nullability" value={column.nullable ? 'Nullable' : 'Required'} />
        </section>
      )}
      {tab === 'Values' && <ValueList title="Most common values" values={summary.common} />}
      {tab === 'Unique' && <ValueList title="Values seen once" values={summary.unique} />}
    </aside>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="metric">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function ValueList({ title, values }: { title: string; values: [string, number][] }) {
  return (
    <section className="inspector-card">
      <h4>{title}</h4>
      {values.length ? (
        values.map(([value, count]) => (
          <div className="metric" key={value}>
            <span>{value}</span>
            <strong>{count}</strong>
          </div>
        ))
      ) : (
        <p>No values in this preview.</p>
      )}
    </section>
  );
}
