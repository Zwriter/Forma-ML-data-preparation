import { useState } from 'react';
import { Icon } from '../../components/Icon';
import type { IconName } from '../../components/Icon';
import { topTabs } from './navigation';
import { commandIcons, ribbonCommands } from './ribbonCommands';

type Props = {
  activeTab: string;
  onTabChange: (tab: string) => void;
  onReload: () => void;
  onSelectColumns: (anchor: HTMLButtonElement) => void;
  onFilter: (anchor: HTMLButtonElement) => void;
  onSort: (anchor: HTMLButtonElement) => void;
  onGroup: (anchor: HTMLButtonElement) => void;
  onPivot: (anchor: HTMLButtonElement) => void;
  onUnpivot: (anchor: HTMLButtonElement) => void;
  hasDataset: boolean;
  onSave: () => void;
  onUndo: () => void;
  onRedo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  operationDialog?: 'filter' | 'sort' | 'group_by' | 'pivot' | 'unpivot' | null;
  showColumnSelector?: boolean;
};

type Tool = {
  label: string;
  icon: IconName;
  href?: string;
  onClick?: (anchor: HTMLButtonElement) => void;
  disabled?: boolean;
  active?: boolean;
};

export function WorkspaceChrome({
  activeTab,
  onTabChange,
  onReload,
  onSelectColumns,
  onFilter,
  onSort,
  onGroup,
  onPivot,
  onUnpivot,
  hasDataset,
  onSave,
  onUndo,
  onRedo,
  canUndo,
  canRedo,
  operationDialog = null,
  showColumnSelector = false,
}: Props) {
  const [showDbPanel, setShowDbPanel] = useState(false);
  const [connectionMessage, setConnectionMessage] = useState('');
  const groups = ribbonCommands[activeTab] ?? [];

  function toolFor(label: string): Tool {
    if (label === 'Save')
      return { label, icon: commandIcons[label], onClick: onSave, disabled: !hasDataset };
    if (label === 'Undo')
      return { label, icon: commandIcons[label], onClick: onUndo, disabled: !canUndo };
    if (label === 'Redo')
      return { label, icon: commandIcons[label], onClick: onRedo, disabled: !canRedo };
    if (label === 'Export')
      return { label, icon: commandIcons[label], href: '#export', disabled: !hasDataset };
    if (label === 'Refresh')
      return { label, icon: commandIcons[label], onClick: onReload, disabled: !hasDataset };
    if (label === 'Select columns' || label === 'Column details')
      return {
        label,
        icon: commandIcons[label],
        onClick: onSelectColumns,
        disabled: !hasDataset,
        active: label === 'Select columns' && showColumnSelector,
      };
    if (label === 'Filter row')
      return {
        label,
        icon: commandIcons[label],
        onClick: onFilter,
        disabled: !hasDataset,
        active: operationDialog === 'filter',
      };
    if (label === 'Sort')
      return {
        label,
        icon: commandIcons[label],
        onClick: onSort,
        disabled: !hasDataset,
        active: operationDialog === 'sort',
      };
    if (label === 'Group by')
      return {
        label,
        icon: commandIcons[label],
        onClick: onGroup,
        disabled: !hasDataset,
        active: operationDialog === 'group_by',
      };
    if (label === 'Pivot')
      return {
        label,
        icon: commandIcons[label],
        onClick: onPivot,
        disabled: !hasDataset,
        active: operationDialog === 'pivot',
      };
    if (label === 'Unpivot')
      return {
        label,
        icon: commandIcons[label],
        onClick: onUnpivot,
        disabled: !hasDataset,
        active: operationDialog === 'unpivot',
      };
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
  const className = `ribbon-action${action.disabled ? ' unavailable' : ''}${action.active ? ' active' : ''}`;
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
      aria-pressed={action.active}
      disabled={action.disabled}
      onClick={(event) => action.onClick?.(event.currentTarget)}
    >
      <Icon name={action.icon} />
      <span>{action.label}</span>
    </button>
  );
}
