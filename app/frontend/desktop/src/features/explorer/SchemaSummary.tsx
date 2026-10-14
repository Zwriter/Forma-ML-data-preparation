import type { Dataset } from '../../types/dataset';

export function SchemaSummary({ dataset }: { dataset: Dataset }) {
  return (
    <section className="card">
      <h2>Dataset overview</h2>
      <p>{dataset.source_path}</p>
      <div className="stats">
        <span>
          <b>{dataset.rows ?? 'Unknown'}</b> rows
        </span>
        <span>
          <b>{dataset.columns}</b> columns
        </span>
        <span>
          <b>{dataset.format.toUpperCase()}</b> format
        </span>
      </div>
      <div className="schema">
        {dataset.schema.map((column) => (
          <span key={column.name}>
            {column.name}
            <small>{column.type}</small>
          </span>
        ))}
      </div>
    </section>
  );
}
