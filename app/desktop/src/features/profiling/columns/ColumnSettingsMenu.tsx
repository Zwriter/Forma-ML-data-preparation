import { Icon } from '../../../components/Icon';
import { MenuButton } from '../../cleaning/MenuButton';
import { OPTIONAL_COLUMNS, type OptionalColumn } from '../../../stores/profileStore';

const LABELS: Record<OptionalColumn, string> = {
  type: 'Type',
  completeness: 'Completeness',
  unique: 'Unique values',
  quality: 'Quality',
  missing: 'Missing',
  examples: 'Examples',
};

export function ColumnSettingsMenu({
  hidden,
  onToggle,
}: {
  hidden: OptionalColumn[];
  onToggle: (column: OptionalColumn) => void;
}) {
  return (
    <MenuButton
      className="profile-settings"
      label={<Icon name="settings" />}
      ariaLabel="Table settings"
      title="Table settings"
      menuLabel="Visible columns"
      items={OPTIONAL_COLUMNS.map((column) => ({
        label: LABELS[column],
        checked: !hidden.includes(column),
        onSelect: () => onToggle(column),
      }))}
    />
  );
}
