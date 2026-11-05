const counts = new Intl.NumberFormat('en-US');
const time = new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit' });
const dateTime = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: 'numeric',
  hour: 'numeric',
  minute: '2-digit',
});

export const formatCount = (value: number) => counts.format(value);

export const formatPercent = (share: number | null) =>
  share === null ? '—' : `${(share * 100).toFixed(1)}%`;

export const formatCountWithPercent = (count: number, total: number) =>
  `${formatCount(count)} (${formatPercent(total ? count / total : null)})`;

/** "Today 10:24 AM", "Yesterday 10:05 PM", or "Oct 30, 9:00 AM". */
export function formatUpdated(iso: string, now = new Date()): string {
  const updated = new Date(iso);
  const days = Math.round(
    (new Date(now).setHours(0, 0, 0, 0) - new Date(updated).setHours(0, 0, 0, 0)) / 86_400_000,
  );
  if (days === 0) return `Today ${time.format(updated)}`;
  if (days === 1) return `Yesterday ${time.format(updated)}`;
  return dateTime.format(updated);
}
