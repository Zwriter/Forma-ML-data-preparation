import { useState } from 'react';
import type { Operation } from '../../types/transformation';
import { useTransformationStore } from '../../stores/transformationStore';
import { TransformationValidation } from './TransformationValidation';
const TYPES = [
  'drop_duplicates',
  'drop_null_rows',
  'fill_null',
  'rename_columns',
  'drop_columns',
  'convert_type',
  'filter_rows',
];
const SAMPLE: Record<string, string> = {
  fill_null: '{"column":"","strategy":"constant","value":""}',
  drop_duplicates: '{}',
  drop_null_rows: '{}',
  rename_columns: '{"mapping":{}}',
  drop_columns: '{"columns":[]}',
  convert_type: '{"column":"","to":"float"}',
  filter_rows: '{"expression":""}',
};

export function TransformationBuilder({
  onPreview,
  onApply,
}: {
  onPreview: (operation: Operation) => void;
  onApply: (operations: Operation[]) => void;
}) {
  const [type, setType] = useState(TYPES[0]);
  const [parameters, setParameters] = useState('{}');
  const operations = useTransformationStore((state) => state.operations);
  const add = useTransformationStore((state) => state.add);
  const toggle = useTransformationStore((state) => state.toggle);
  const remove = useTransformationStore((state) => state.remove);
  const [error, setError] = useState('');
  function addOperation() {
    try {
      const parsed: unknown = JSON.parse(parameters);
      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed))
        throw new Error('Parameters must be a JSON object.');
      add({
        type,
        parameters: parsed as Record<string, unknown>,
        enabled: true,
        order: operations.length,
      });
      setError('');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Invalid parameters.');
    }
  }
  return (
    <section className="card" aria-labelledby="transform-title">
      <h2 id="transform-title">Transformation builder</h2>
      <label htmlFor="operation-type">Operation</label>
      <select
        id="operation-type"
        value={type}
        onChange={(event) => {
          setType(event.target.value);
          setParameters(SAMPLE[event.target.value]);
        }}
      >
        {TYPES.map((item) => (
          <option key={item} value={item}>
            {item.replaceAll('_', ' ')}
          </option>
        ))}
      </select>
      <label htmlFor="operation-parameters">Parameters (JSON)</label>
      <textarea
        id="operation-parameters"
        rows={4}
        value={parameters}
        onChange={(event) => setParameters(event.target.value)}
      />
      <div className="row">
        <button onClick={addOperation}>Add operation</button>
        <button
          disabled={!operations.some((item) => item.enabled)}
          onClick={() => {
            const first = operations.find((item) => item.enabled);
            if (first) onPreview(first);
          }}
        >
          Preview first enabled
        </button>
        <button disabled={!operations.length} onClick={() => onApply(operations)}>
          Apply operations
        </button>
      </div>
      <TransformationValidation error={error} />
      <ol>
        {operations.map((operation, index) => (
          <li key={index}>
            <label className="check">
              <input type="checkbox" checked={operation.enabled} onChange={() => toggle(index)} />
              {index + 1}. {operation.type.replaceAll('_', ' ')}
            </label>
            <button aria-label={`Remove operation ${index + 1}`} onClick={() => remove(index)}>
              Remove
            </button>
          </li>
        ))}
      </ol>
    </section>
  );
}
