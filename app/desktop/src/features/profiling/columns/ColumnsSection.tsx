import { useState } from 'react';
import { useProfileToolStore } from '../../../stores/profileToolStore';
import { useDatasetStore } from '../../../stores/datasetStore';
import { useProfileStore } from '../../../stores/profileStore';
import { useWorkspaceStore } from '../../../stores/workspaceStore';
import type { ColumnProfile, Profile } from '../../../types/profile';
import { ColumnRowMenu } from './ColumnRowMenu';
import { ColumnSettingsMenu } from './ColumnSettingsMenu';
import { ColumnTable } from './ColumnTable';
import { ColumnTableToolbar } from './ColumnTableToolbar';
import {
  countLabel,
  filterColumns,
  sortColumns,
  type ColumnFilter,
  type ColumnSort,
} from './columnTableModel';

const ALL: ColumnFilter = { search: '', type: 'all', quality: 'all' };

export function ColumnsSection({
  profile,
  onTabChange,
  onShowDistribution,
  onExportInvalid,
}: {
  profile: Profile;
  onTabChange?: (tab: string) => void;
  onShowDistribution?: (column: ColumnProfile) => void;
  /** Undefined while the profile is out of date or an export is already running. */
  onExportInvalid?: (column: ColumnProfile) => void;
}) {
  const [filter, setFilter] = useState(ALL);
  const [sort, setSort] = useState<ColumnSort>({ key: 'position', direction: 'ascending' });
  const hidden = useProfileStore((state) => state.hiddenColumns);
  const toggleColumn = useProfileStore((state) => state.toggleColumn);
  const visible = sortColumns(filterColumns(profile.columns, filter), sort);

  function clean({ name }: ColumnProfile) {
    const { preview, setView } = useDatasetStore.getState();
    setView({ activeCell: { row: preview?.offset ?? 0, column: name } });
    onTabChange?.('Clean');
  }

  function showDetails({ name }: ColumnProfile) {
    const tools = useProfileToolStore.getState();
    tools.setInput('column_details', 'column', name);
    tools.open('column_details');
  }

  function copy({ name }: ColumnProfile) {
    const notify = useWorkspaceStore.getState().notify;
    navigator.clipboard
      .writeText(name)
      .then(() => notify(`Copied "${name}".`))
      .catch(() => notify('The column name could not be copied.'));
  }

  return (
    <section id="profile-columns" className="profile-columns" aria-label="Columns" tabIndex={-1}>
      <ColumnTableToolbar
        filter={filter}
        count={countLabel(visible.length, profile.columns.length)}
        onChange={setFilter}
        settings={<ColumnSettingsMenu hidden={hidden} onToggle={toggleColumn} />}
      />
      <ColumnTable
        columns={visible}
        rowCount={profile.row_count}
        sort={sort}
        hidden={hidden}
        onSort={setSort}
        onClearFilters={() => setFilter(ALL)}
        rowMenu={(column) => (
          <ColumnRowMenu
            column={column}
            onClean={clean}
            onCopy={copy}
            // Only columns with a histogram or top values have a chart to show.
            onShowDistribution={
              column.numeric || column.categories ? onShowDistribution : undefined
            }
            onExportInvalid={column.invalid_count > 0 ? onExportInvalid : undefined}
            onShowDetails={showDetails}
          />
        )}
      />
    </section>
  );
}
