export function BeforeAfterComparison({
  before,
  after,
}: {
  before: Record<string, unknown>[];
  after: Record<string, unknown>[];
}) {
  return (
    <div className="compare">
      <div>
        <b>Before</b>
        <pre>{JSON.stringify(before.slice(0, 5), null, 2)}</pre>
      </div>
      <div>
        <b>After</b>
        <pre>{JSON.stringify(after.slice(0, 5), null, 2)}</pre>
      </div>
    </div>
  );
}
