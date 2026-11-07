import { draftKey, useCleaningStore } from '../../../stores/cleaningStore';
import { useDatasetStore } from '../../../stores/datasetStore';
import { useProfileToolStore } from '../../../stores/profileToolStore';
import type { DuplicateGroups } from '../../../types/profileTools';
import { MenuButton } from '../../cleaning/MenuButton';
import { formatCount } from '../profileFormat';
import { addCleanSteps, hasCleanSteps } from './cleanSteps';
import { ToolView } from './ToolView';
import { useLatestProfile, useTool } from './useTool';

/** Turning one key column on or off; `null` means all columns, and at least one stays. */
export function toggleKey(keys: string[] | null, name: string, all: string[]) {
  const current = keys ?? all;
  const next = current.includes(name)
    ? current.filter((key) => key !== name)
    : all.filter((key) => key === name || current.includes(key));
  if (!next.length) return keys;
  return next.length === all.length ? null : next;
}

/** Duplicate finder (FR-040): duplicates for the chosen key columns. */
export function DuplicatesTool() {
  const keys = (useProfileToolStore((state) => state.inputs.duplicates?.columns) ?? null) as
    | string[]
    | null;
  const profile = useLatestProfile();
  const all = (profile?.columns ?? []).map((column) => column.name);
  const { result, view } = useTool<DuplicateGroups>(
    'duplicates',
    'profile.duplicates',
    profile ? { columns: keys } : null,
  );
  const drafts = useCleaningStore((state) => state.drafts[draftKey(useDatasetStore.getState())]);
  const step = [{ type: 'drop_duplicates', parameters: { columns: keys } }];
  const added = hasCleanSteps(drafts ?? [], step);
  const chosen = keys ?? all;

  const toolbar = (
    <>
      <MenuButton
        label={keys ? `Key columns (${keys.length})` : 'Key columns (all)'}
        ariaLabel="Key columns"
        menuLabel="Key columns"
        items={all.map((name) => ({
          label: name,
          checked: chosen.includes(name),
          onSelect: () =>
            useProfileToolStore
              .getState()
              .setInput('duplicates', 'columns', toggleKey(keys, name, all)),
        }))}
      />
      <span role="status">
        {result
          ? `${formatCount(result.duplicate_rows)} duplicate rows in ${formatCount(result.group_count)} groups`
          : ''}
      </span>
      <span className="tool-spacer" />
      <button
        type="button"
        disabled={added || !result?.duplicate_rows}
        onClick={() => addCleanSteps(step, 'Remove duplicate rows')}
      >
        {added ? 'Added' : 'Add step: Remove duplicates'}
      </button>
    </>
  );

  return (
    <ToolView title="Duplicates" {...view} toolbar={toolbar}>
      {result &&
        (result.group_count ? (
          <div className="tool-table-wrap">
            <table className="tool-table" aria-label="Duplicate groups">
              <thead>
                <tr>
                  {result.columns.map((name) => (
                    <th key={name} scope="col">
                      {name}
                    </th>
                  ))}
                  <th scope="col">Rows</th>
                </tr>
              </thead>
              <tbody>
                {result.groups.map((group, index) => (
                  <tr key={index}>
                    {group.values.map((value, cell) => (
                      <td key={cell}>{value ?? <span className="tool-muted">Missing</span>}</td>
                    ))}
                    <td>{formatCount(group.size)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="profile-panel-note">No duplicate rows for these columns</p>
        ))}
    </ToolView>
  );
}
