import { useState } from 'react';
import { Icon } from '../../components/Icon';
import type { IconName } from '../../components/Icon';
import { topTabs } from './navigation';

type Props = {
  activeTab: string;
  onTabChange: (tab: string) => void;
  onReload: () => void;
  onSelectColumns: () => void;
  hasDataset: boolean;
};

type Tool = {
  label: string;
  icon: IconName;
  href?: string;
  onClick?: () => void;
  disabled?: boolean;
};
type RibbonGroup = { group: string; commands: string[] };

const ribbonCommands: Record<string, RibbonGroup[]> = {
  Data: [
    { group: 'File', commands: ['Save', 'Undo', 'Redo'] },
    { group: 'Table', commands: ['Select column', 'Filter row', 'Sort'] },
    { group: 'Reshape', commands: ['Group by', 'Pivot', 'Unpivot'] },
  ],
  Clean: [
    { group: 'Transform', commands: ['Convert', 'Replace', 'Fill'] },
    { group: 'Combine', commands: ['Split', 'Merge'] },
    { group: 'Columns and rows', commands: ['Remove', 'Rename'] },
  ],
  Profile: [
    { group: 'Overview', commands: ['Refresh', 'Column details'] },
    { group: 'Quality', commands: ['Data quality', 'Distribution', 'Duplicates'] },
    { group: 'Insights', commands: ['Creations', 'Patterns', 'Anomalies', 'Recommendations'] },
  ],
  Pipelines: [{ group: 'Pipeline', commands: ['Create pipeline', 'Run pipeline'] }],
  Export: [
    { group: 'Export', commands: ['Export'] },
    { group: 'Database', commands: ['Connect to DB', 'Test connection'] },
  ],
};

const commandIcons: Record<string, IconName> = {
  Save: 'save',
  Undo: 'undo',
  Redo: 'redo',
  'Select column': 'columns',
  'Filter row': 'filter',
  Sort: 'sort',
  'Group by': 'group',
  Pivot: 'pivot',
  Unpivot: 'unpivot',
  Convert: 'datatype',
  Replace: 'replace',
  Fill: 'fill',
  Split: 'split',
  Merge: 'merge',
  Remove: 'clean',
  Rename: 'columns',
  Refresh: 'reload',
  'Column details': 'columns',
  'Data quality': 'profile',
  Distribution: 'profile',
  Creations: 'profile',
  Patterns: 'profile',
  Anomalies: 'profile',
  Duplicates: 'profile',
  Recommendations: 'profile',
  'Create pipeline': 'pipeline',
  'Run pipeline': 'pipeline',
  Export: 'export',
  'Connect to DB': 'database',
  'Test connection': 'database',
};

export function WorkspaceChrome({
  activeTab,
  onTabChange,
  onReload,
  onSelectColumns,
  hasDataset,
}: Props) {
  const [showDbPanel, setShowDbPanel] = useState(false);
  const [connectionMessage, setConnectionMessage] = useState('');
  const groups = ribbonCommands[activeTab] ?? [];

  function toolFor(label: string): Tool {
    if (label === 'Save' || label === 'Export')
      return { label, icon: commandIcons[label], href: '#export', disabled: !hasDataset };
    if (label === 'Undo' || label === 'Redo')
      return { label, icon: commandIcons[label], disabled: true };
    if (label === 'Refresh')
      return { label, icon: commandIcons[label], onClick: onReload, disabled: !hasDataset };
    if (label === 'Select column' || label === 'Column details')
      return { label, icon: commandIcons[label], onClick: onSelectColumns, disabled: !hasDataset };
    if (label === 'Connect to DB')
      return {
        label,
        icon: commandIcons[label],
        onClick: () => {
          setShowDbPanel((value) => !value);
          setConnectionMessage('');
        },
      };
    if (label === 'Test connection')
      return {
        label,
        icon: commandIcons[label],
        onClick: () => {
          setShowDbPanel(true);
          setConnectionMessage('Connection testing is not available yet.');
        },
      };
    return {
      label,
      icon: commandIcons[label],
      href:
        activeTab === 'Pipelines' ? '#pipelines' : activeTab === 'Profile' ? '#profile' : '#clean',
      disabled: !hasDataset,
    };
  }

  if (activeTab === 'File') return null;
  return (
    <>
      <nav className="top-tabs" aria-label="Workspace sections">
        {topTabs.map((tab) =>
          tab.label === 'File' ? (
            <button
              key={tab.label}
              type="button"
              className={`file-tab${activeTab === 'File' ? ' active' : ''}`}
              onClick={() => onTabChange('File')}
            >
              File
            </button>
          ) : (
            <a
              key={tab.label}
              href={tab.href}
              className={activeTab === tab.label ? 'active' : ''}
              aria-current={activeTab === tab.label ? 'page' : undefined}
              onClick={(event) => {
                event.preventDefault();
                onTabChange(tab.label);
              }}
            >
              {tab.label}
            </a>
          ),
        )}
      </nav>
      <section className="ribbon" aria-label={`${activeTab} toolbar`}>
        {groups.map(({ group, commands }) => (
          <div className="ribbon-group" key={group}>
            {commands.map((label) => (
              <ToolButton key={label} action={toolFor(label)} onTabChange={onTabChange} />
            ))}
            <span className="group-caption">{group}</span>
          </div>
        ))}
      </section>
      {showDbPanel && activeTab === 'Export' && (
        <section className="db-connection-panel" aria-label="Database connection">
          <label>
            Connection string
            <input
              aria-label="Database connection string"
              placeholder="postgresql://user:password@host:5432/database"
            />
          </label>
          <button
            type="button"
            onClick={() => setConnectionMessage('Connection testing is not available yet.')}
          >
            Test connection
          </button>
          <button type="button" className="quiet-button" onClick={() => setShowDbPanel(false)}>
            Close
          </button>
          {connectionMessage && <span role="status">{connectionMessage}</span>}
        </section>
      )}
    </>
  );
}

function ToolButton({ action, onTabChange }: { action: Tool; onTabChange: (tab: string) => void }) {
  const className = `ribbon-action${action.disabled ? ' unavailable' : ''}`;
  if (action.href)
    return (
      <a
        className={className}
        href={action.disabled ? undefined : action.href}
        aria-disabled={action.disabled || undefined}
        onClick={(event) => {
          event.preventDefault();
          if (!action.disabled) onTabChange(action.href === '#export' ? 'Export' : 'Clean');
        }}
      >
        <Icon name={action.icon} />
        <span>{action.label}</span>
      </a>
    );
  return (
    <button
      type="button"
      className={className}
      aria-label={action.label}
      disabled={action.disabled}
      onClick={action.onClick}
    >
      <Icon name={action.icon} />
      <span>{action.label}</span>
    </button>
  );
}
