import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { CategoryPanel } from '../../../src/features/profiling/CategoryPanel';
import { DistributionPanel } from '../../../src/features/profiling/DistributionPanel';
import { useProfileStore } from '../../../src/stores/profileStore';
import { demoProfile } from '../../../src/services/demoProfile';
import type { ColumnProfile } from '../../../src/types/profile';

const H = 'history-1';
const columns = demoProfile.columns;
const options = (name: string) =>
  within(screen.getByRole('combobox', { name }))
    .getAllByRole('option')
    .map((option) => option.textContent);

describe('DistributionPanel', () => {
  afterEach(() => {
    cleanup();
    useProfileStore.setState({ entries: {}, chartColumns: {} });
  });

  it('defaults to the first numeric column with at least two values', () => {
    render(<DistributionPanel historyId={H} columns={columns} />);

    expect(screen.getByRole('region', { name: 'Distribution of SeniorCitizen' })).toBeTruthy();
    expect(options('Distribution column')).toEqual([
      'SeniorCitizen',
      'tenure',
      'MonthlyCharges',
      'TotalCharges',
    ]);
    expect(screen.getAllByRole('listitem', { name: /SeniorCitizen|^0|^1/ }).length).toBeGreaterThan(
      0,
    );
  });

  it('switches column, remembers the pick, and shows the summary statistics', () => {
    const view = render(<DistributionPanel historyId={H} columns={columns} />);
    fireEvent.change(screen.getByRole('combobox', { name: 'Distribution column' }), {
      target: { value: 'MonthlyCharges' },
    });

    expect(screen.getByRole('region', { name: 'Distribution of MonthlyCharges' })).toBeTruthy();
    const stats = within(screen.getByRole('list', { name: 'Summary statistics' }));
    expect(stats.getAllByRole('listitem').map((item) => item.textContent)).toEqual([
      'Mean64.76',
      'Median70.35',
      'Std. dev.30.09',
      'Min18.25',
      'Max118.75',
    ]);
    expect(screen.getAllByRole('listitem')[0].getAttribute('aria-label')).toMatch(/^18–23: /);

    view.unmount();
    render(<DistributionPanel historyId={H} columns={columns} />);
    expect(screen.getByRole('region', { name: 'Distribution of MonthlyCharges' })).toBeTruthy();
  });

  it('explains when no column can be charted', () => {
    const text = columns.filter((column) => !column.numeric);
    render(<DistributionPanel historyId={H} columns={text} />);
    expect(screen.getByText('No number or date columns to chart.')).toBeTruthy();
  });
});

describe('CategoryPanel', () => {
  afterEach(() => {
    cleanup();
    useProfileStore.setState({ entries: {}, chartColumns: {} });
  });

  it('defaults to the first text column with 2–50 values and labels each bar', () => {
    render(<CategoryPanel historyId={H} columns={columns} />);

    expect(screen.getByRole('region', { name: 'gender (categorical)' })).toBeTruthy();
    expect(options('Categorical column')).not.toContain('tenure');
    fireEvent.change(screen.getByRole('combobox', { name: 'Categorical column' }), {
      target: { value: 'Contract' },
    });
    const bars = within(screen.getByRole('list', { name: 'Contract values' })).getAllByRole(
      'listitem',
    );
    expect(bars.map((bar) => bar.getAttribute('aria-label'))).toEqual([
      'Month-to-month: 3,874 (55.0%)',
      'Two year: 1,683 (23.9%)',
      'One year: 1,486 (21.1%)',
    ]);
    expect(within(bars[0]).getByText('3,874 (55.0%)')).toBeTruthy();
  });

  it('adds an Other bar for values outside the top ten', () => {
    render(<CategoryPanel historyId={H} columns={columns} />);
    fireEvent.change(screen.getByRole('combobox', { name: 'Categorical column' }), {
      target: { value: 'customerID' },
    });
    const bars = screen.getAllByRole('listitem');
    expect(bars.at(-1)!.getAttribute('aria-label')).toBe('Other: 7,038 (99.9%)');
  });

  it('explains when no column can be charted', () => {
    const numbers: ColumnProfile[] = columns.filter((column) => !column.categories);
    render(<CategoryPanel historyId={H} columns={numbers} />);
    expect(screen.getByText('No text or yes/no columns to chart.')).toBeTruthy();
  });
});
