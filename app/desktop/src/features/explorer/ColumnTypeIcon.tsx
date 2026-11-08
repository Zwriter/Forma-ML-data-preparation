type TypeKind = 'number' | 'date' | 'boolean' | 'text';

const paths: Record<TypeKind, string> = {
  number: 'M5 9h14M5 15h14M10 4 8 20M16 4l-2 16',
  date: 'M4 6h16v14H4zM4 10h16M8 3v4M16 3v4',
  boolean:
    'M3 12a5 5 0 0 1 5-5h8a5 5 0 0 1 0 10H8a5 5 0 0 1-5-5zM16 9.5a2.5 2.5 0 1 1 0 5 2.5 2.5 0 0 1 0-5z',
  text: 'M5 7V5h14v2M12 5v14M9 19h6',
};

/** Groups an engine dtype name into the four kinds the worksheet header shows. */
export function columnTypeKind(type: string): TypeKind {
  const name = type.toLowerCase();
  if (/int|float|double|decimal|number/.test(name)) return 'number';
  if (/date|time/.test(name)) return 'date';
  if (/bool/.test(name)) return 'boolean';
  return 'text';
}

/** Small type glyph for a column header; the dtype name is its tooltip. */
export function ColumnTypeIcon({ type }: { type: string }) {
  return (
    <svg className="column-type-icon" viewBox="0 0 24 24" aria-hidden="true">
      <title>{type}</title>
      <path d={paths[columnTypeKind(type)]} />
    </svg>
  );
}
