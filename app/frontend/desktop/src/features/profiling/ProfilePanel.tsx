export function ProfilePanel({ report }: { report: Record<string, unknown> | null }) {
  if (!report) return null;
  return <section className="report" aria-label="Dataset profile"><h3>Profile report</h3><pre>{JSON.stringify(report, null, 2)}</pre></section>;
}
