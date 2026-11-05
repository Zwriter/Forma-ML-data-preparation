import { Icon, type IconName } from '../../components/Icon';
import type { Profile } from '../../types/profile';
import { formatCount } from './profileFormat';

type Card = { label: string; value: number; icon: IconName; tone?: 'warning' | 'alert' };

export function SummaryCards({ profile }: { profile: Profile }) {
  const cards: Card[] = [
    { label: 'Rows', value: profile.row_count, icon: 'grid' },
    { label: 'Columns', value: profile.column_count, icon: 'columns' },
    { label: 'Missing cells', value: profile.missing_cells, icon: 'warning', tone: 'warning' },
    { label: 'Duplicate rows', value: profile.duplicate_rows, icon: 'copy', tone: 'alert' },
  ];
  return (
    <ul className="profile-summary" aria-label="Dataset summary">
      {cards.map(({ label, value, icon, tone }) => {
        const flagged = tone && value > 0;
        return (
          <li
            key={label}
            className={`summary-card${flagged ? ` summary-card-${tone}` : ''}`}
            aria-label={`${label}: ${formatCount(value)}${flagged ? ', needs attention' : ''}`}
            tabIndex={label === 'Duplicate rows' ? -1 : undefined}
          >
            <span className="summary-card-icon">
              <Icon name={icon} />
            </span>
            <span>
              <strong className="summary-card-value">{formatCount(value)}</strong>
              <span className="summary-card-label">{label}</span>
            </span>
          </li>
        );
      })}
    </ul>
  );
}
