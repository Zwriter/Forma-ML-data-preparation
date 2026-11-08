import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { MissingValuesPanel } from '../../../src/features/profiling/MissingValuesPanel';
import { demoProfile } from '../../../src/services/demoProfile';

const { columns, row_count } = demoProfile;

describe('MissingValuesPanel', () => {
  afterEach(cleanup);

  it('shows the 10 columns with the most missing values, highest first', () => {
    render(<MissingValuesPanel columns={columns} rowCount={row_count} />);

    const region = screen.getByRole('region', { name: 'Missing values by column' });
    expect(region.getAttribute('tabindex')).toBe('-1');
    const bars = within(region).getAllByRole('listitem');
    expect(bars).toHaveLength(10);
    expect(bars[0].getAttribute('aria-label')).toBe('TotalCharges: 1,521 (21.6%)');
    expect(bars[1].getAttribute('aria-label')).toBe('MonthlyCharges: 463 (6.6%)');
  });

  it('lists every column with missing values in a closable popup', () => {
    render(<MissingValuesPanel columns={columns} rowCount={row_count} />);

    fireEvent.click(screen.getByRole('button', { name: 'Show all (11)' }));
    const dialog = screen.getByRole('dialog', { name: 'All missing values' });
    expect(within(dialog).getAllByRole('listitem')).toHaveLength(11);
    fireEvent.keyDown(dialog, { key: 'Escape' });
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Show all (11)' }));
  });

  it('says so when nothing is missing', () => {
    const complete = columns.map((column) => ({ ...column, missing_count: 0 }));
    render(<MissingValuesPanel columns={complete} rowCount={row_count} />);
    expect(screen.getByText('No missing values')).toBeTruthy();
    expect(screen.queryByRole('button', { name: /Show all/ })).toBeNull();
  });
});
