import { Icon } from '../../components/Icon';
import type { IconName } from '../../components/Icon';
import { sidebarLinks, topTabs } from './navigation';

type Props = {
  activeTab: string;
  onTabChange: (tab: string) => void;
  onOpen: () => void;
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

export function WorkspaceChrome({
  activeTab,
  onTabChange,
  onOpen,
  onReload,
  onSelectColumns,
  hasDataset,
}: Props) {
  const tools: { group: string; actions: Tool[] }[] = [
    {
      group: 'File',
      actions: [
        { label: 'Open', icon: 'open', onClick: onOpen },
        { label: 'Save', icon: 'save', href: '#export', disabled: !hasDataset },
        { label: 'Reload', icon: 'reload', onClick: onReload, disabled: !hasDataset },
      ],
    },
    {
      group: 'Table',
      actions: [
        {
          label: 'Select columns',
          icon: 'columns',
          onClick: onSelectColumns,
          disabled: !hasDataset,
        },
        { label: 'Filter rows', icon: 'filter', href: '#clean', disabled: !hasDataset },
        { label: 'Sort', icon: 'sort', disabled: true },
      ],
    },
    {
      group: 'Transform',
      actions: [
        { label: 'Data type', icon: 'datatype', href: '#clean', disabled: !hasDataset },
        { label: 'Replace', icon: 'replace', disabled: true },
        { label: 'Fill', icon: 'fill', href: '#clean', disabled: !hasDataset },
        { label: 'Split', icon: 'split', disabled: true },
        { label: 'Merge', icon: 'merge', disabled: true },
      ],
    },
    {
      group: 'Reshape',
      actions: [
        { label: 'Group by', icon: 'group', disabled: true },
        { label: 'Pivot', icon: 'pivot', disabled: true },
        { label: 'Unpivot', icon: 'unpivot', disabled: true },
      ],
    },
  ];

  return (
    <>
      <nav className="top-tabs" aria-label="Workspace sections">
        {topTabs.map((tab) => (
          <a
            key={tab.label}
            href={tab.href}
            className={activeTab === tab.label ? 'active' : ''}
            onClick={() => onTabChange(tab.label)}
          >
            {tab.label}
          </a>
        ))}
      </nav>
      <section className="ribbon" aria-label="Workspace toolbar">
        {tools.map(({ group, actions }) => (
          <div className="ribbon-group" key={group}>
            {actions.map((action) => (
              <ToolButton key={action.label} action={action} onTabChange={onTabChange} />
            ))}
            <span className="group-caption">{group}</span>
          </div>
        ))}
      </section>
    </>
  );
}

export function WorkspaceSidebar({
  activeTab,
  onTabChange,
}: Pick<Props, 'activeTab' | 'onTabChange'>) {
  return (
    <aside className="sidebar">
      <nav aria-label="Dataset tools">
        {sidebarLinks.map((link) => (
          <a
            key={link.label}
            href={link.href}
            className={
              activeTab === link.label || (activeTab === 'Home' && link.label === 'Explore')
                ? 'active'
                : ''
            }
            onClick={() => onTabChange(link.label)}
          >
            <Icon name={link.icon} />
            <span>{link.label}</span>
          </a>
        ))}
      </nav>
      <div className="sidebar-footer">
        <div className="processing-status">
          <span className="sidebar-dot" />
          Local processing
        </div>
        <a
          href="#settings"
          className={activeTab === 'Settings' ? 'active' : ''}
          onClick={() => onTabChange('Settings')}
        >
          <Icon name="settings" />
          <span>Settings</span>
        </a>
      </div>
    </aside>
  );
}

function ToolButton({ action, onTabChange }: { action: Tool; onTabChange: (tab: string) => void }) {
  const className = `ribbon-action${action.disabled ? ' unavailable' : ''}`;
  const title = action.disabled
    ? `${action.label} is not available in the current engine`
    : undefined;
  if (action.href) {
    return (
      <a
        className={className}
        href={action.disabled ? undefined : action.href}
        aria-disabled={action.disabled || undefined}
        title={title}
        onClick={() => {
          if (!action.disabled) onTabChange(action.href === '#export' ? 'Export' : 'Transform');
        }}
      >
        <Icon name={action.icon} />
        <span>{action.label}</span>
      </a>
    );
  }
  return (
    <button
      type="button"
      className={className}
      aria-label={action.label === 'Open' ? 'Open another dataset' : action.label}
      disabled={action.disabled}
      title={title}
      onClick={action.onClick}
    >
      <Icon name={action.icon} />
      <span>{action.label}</span>
    </button>
  );
}
