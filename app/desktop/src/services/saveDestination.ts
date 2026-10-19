export function buildSaveCopyDestination(
  sourcePath: string,
  format: 'csv' | 'parquet',
  date = new Date(),
): string {
  const separatorIndex = Math.max(sourcePath.lastIndexOf('/'), sourcePath.lastIndexOf('\\'));
  const directory = sourcePath.slice(0, separatorIndex + 1);
  const fileName = sourcePath.slice(separatorIndex + 1);
  const baseName = fileName.replace(/\.[^.]+$/, '') || 'dataset';
  const dateLabel = [date.getFullYear(), date.getMonth() + 1, date.getDate()]
    .map((part, index) => String(part).padStart(index === 0 ? 4 : 2, '0'))
    .join('-');

  return `${directory}${baseName}-copy-${dateLabel}.${format}`;
}
