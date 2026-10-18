import type { Dataset } from '../../types/dataset';

export function SchemaSummary({
  dataset,
  visibleColumns,
}: {
  dataset: Dataset;
  visibleColumns: number;
}) {
  return (
    <section className="dataset-meta" aria-labelledby="dataset-overview-title">
      <h2 className="sr-only" id="dataset-overview-title">
        Dataset overview
      </h2>
      <span className="meta-chip">{dataset.rows?.toLocaleString() ?? 'Unknown'} rows</span>
      <span className="meta-chip">
        {visibleColumns} visible / {dataset.columns} columns
      </span>
      <span className="meta-chip">{dataset.format.toUpperCase()}</span>
    </section>
  );
}
