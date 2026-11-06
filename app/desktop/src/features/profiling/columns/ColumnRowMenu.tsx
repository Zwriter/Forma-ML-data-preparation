import { MenuButton, type MenuItem } from '../../cleaning/MenuButton';
import type { ColumnProfile } from '../../../types/profile';

type Handler = (column: ColumnProfile) => void;

/** Row actions; distribution and export items appear once their stories provide handlers. */
export function ColumnRowMenu({
  column,
  onClean,
  onCopy,
  onShowDistribution,
  onExportInvalid,
}: {
  column: ColumnProfile;
  onClean: Handler;
  onCopy: Handler;
  onShowDistribution?: Handler;
  onExportInvalid?: Handler;
}) {
  const optional = (label: string, handler?: Handler): MenuItem[] =>
    handler ? [{ label, onSelect: () => handler(column) }] : [];
  return (
    <MenuButton
      className="profile-row-menu"
      label="…"
      ariaLabel={`Actions for ${column.name}`}
      menuLabel={`${column.name} actions`}
      items={[
        ...optional('Show distribution', onShowDistribution),
        { label: 'Clean this column', onSelect: () => onClean(column) },
        ...optional('Export invalid rows', onExportInvalid),
        { label: 'Copy column name', onSelect: () => onCopy(column) },
      ]}
    />
  );
}
