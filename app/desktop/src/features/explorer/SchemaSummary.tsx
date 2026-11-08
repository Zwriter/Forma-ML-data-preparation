import type { Dataset } from '../../types/dataset';

/** Row count and file format chips beside the worksheet search. */
export function SchemaSummary({ dataset }: { dataset: Dataset }) {
  return (
    <section className="dataset-meta" aria-labelledby="dataset-overview-title">
      <h2 className="sr-only" id="dataset-overview-title">
        Dataset overview
      </h2>
      <span className="meta-chip">{dataset.rows?.toLocaleString() ?? 'Unknown'} rows</span>
      <span className="meta-chip">{dataset.format.toUpperCase()}</span>
    </section>
  );
}
