import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { ToolHost } from '../../../../src/features/profiling/tools/ToolHost';
import { toggleKey } from '../../../../src/features/profiling/tools/DuplicatesTool';
import { pageStatus } from '../../../../src/features/profiling/tools/DataQualityTool';
import { useCleaningStore } from '../../../../src/stores/cleaningStore';
import { useProfileToolStore } from '../../../../src/stores/profileToolStore';
import { useWorkspaceStore } from '../../../../src/stores/workspaceStore';
import { lastParams, openDemoTool, resetTools } from './toolSetup';

const request = vi.hoisted(() => vi.fn());
vi.mock('../../../../src/services/ipcClient', () => ({ request }));

afterEach(() => resetTools(request));

describe('Column details', () => {
  it('shows the first column, then moves with Next and the picker', async () => {
    openDemoTool(request, 'column_details');
    render(<ToolHost />);

    const region = await screen.findByRole('region', { name: 'Column statistics' });
    expect(within(region).getByRole('heading', { name: 'customerID' })).toBeTruthy();
    expect(lastParams(request, 'profile.column_detail')).toMatchObject({ column: 'customerID' });
    expect(
      (screen.getByRole('button', { name: 'Previous column' }) as HTMLButtonElement).disabled,
    ).toBe(true);

    fireEvent.click(screen.getByRole('button', { name: 'Next column' }));
    await screen.findByRole('heading', { name: 'gender' });
    fireEvent.change(screen.getByRole('combobox', { name: 'Column' }), {
      target: { value: 'TotalCharges' },
    });
    await screen.findByRole('heading', { name: 'TotalCharges' });
    const stats = screen.getByRole('list', { name: 'Statistics' });
    expect(stats.textContent).toContain('Q1');
    expect(stats.textContent).toContain('Invalid11 (0.2%)');
    const invalid = screen.getByRole('list', { name: 'Invalid values' });
    expect(invalid.textContent).toContain('is not a decimal number');
    expect(screen.getByRole('list', { name: 'TotalCharges distribution' })).toBeTruthy();
  });

  it('shows text lengths and top values for text columns', async () => {
    openDemoTool(request, 'column_details');
    useProfileToolStore.getState().setInput('column_details', 'column', 'Contract');
    render(<ToolHost />);

    const stats = await screen.findByRole('list', { name: 'Statistics' });
    expect(stats.textContent).toContain('Shortest');
    expect(screen.getByRole('list', { name: 'Top values of Contract' })).toBeTruthy();
    expect(screen.getByText('No invalid values')).toBeTruthy();
  });
});

describe('Data quality', () => {
  it('lists problem rows with marked cells and pages through them', async () => {
    openDemoTool(request, 'data_quality');
    render(<ToolHost />);

    const table = await screen.findByRole('table', { name: 'Problem rows' });
    expect(screen.getByRole('status').textContent).toBe('Rows 1–100 of 3,229');
    const missing = within(table).getAllByText('Missing')[0];
    expect(missing.getAttribute('data-problem')).not.toBeNull();
    expect(lastParams(request, 'profile.rows')).toMatchObject({
      filter: { kind: 'problems', column: null },
      offset: 0,
      limit: 100,
    });

    fireEvent.click(screen.getByRole('button', { name: 'Next page' }));
    await waitFor(() =>
      expect(screen.getByRole('status').textContent).toBe('Rows 101–200 of 3,229'),
    );
    expect(
      (screen.getByRole('button', { name: 'Previous page' }) as HTMLButtonElement).disabled,
    ).toBe(false);
  });

  it('filters to one column, and invalid cells carry their reason as text', async () => {
    openDemoTool(request, 'data_quality');
    render(<ToolHost />);
    await screen.findByRole('table', { name: 'Problem rows' });

    fireEvent.change(screen.getByRole('combobox', { name: 'Problems in' }), {
      target: { value: 'TotalCharges' },
    });
    await waitFor(() => expect(screen.getByRole('status').textContent).toBe('Rows 1–100 of 1,532'));
    const invalid = document.querySelector('.tool-cell-invalid')!;
    expect(invalid.getAttribute('aria-description')).toContain('is not a decimal number');
    expect(invalid.textContent).toContain('Invalid:');
  });

  it('moves focus between problem cells and onto the next page', async () => {
    openDemoTool(request, 'data_quality');
    useProfileToolStore.getState().setInput('data_quality', 'column', 'SeniorCitizen');
    render(<ToolHost />);
    await screen.findByRole('table', { name: 'Problem rows' });
    const cells = () => [...document.querySelectorAll<HTMLElement>('[data-problem]')];

    fireEvent.click(screen.getByRole('button', { name: 'Next problem' }));
    expect(document.activeElement).toBe(cells()[0]);
    fireEvent.click(screen.getByRole('button', { name: 'Next problem' }));
    expect(document.activeElement).toBe(cells()[1]);

    act(() => cells().at(-1)!.focus());
    fireEvent.click(screen.getByRole('button', { name: 'Next problem' }));
    await waitFor(() => expect(screen.getByRole('status').textContent).toBe('Rows 101–200 of 226'));
    await waitFor(() => expect(document.activeElement).toBe(cells()[0]));
  });

  it('formats the paging status', () => {
    expect(pageStatus(undefined)).toBe('No rows');
  });
});

describe('Distribution', () => {
  it('asks for the chosen bar count and draws a log scale and box plot', async () => {
    openDemoTool(request, 'distribution');
    useProfileToolStore.getState().setInput('distribution', 'column', 'MonthlyCharges');
    render(<ToolHost />);

    await screen.findByRole('img', { name: /^Box plot: Q1 / });
    expect(lastParams(request, 'profile.distribution')).toMatchObject({ bins: 30 });
    const bars = screen.getByRole('radiogroup', { name: 'Bars' });
    fireEvent.click(within(bars).getByRole('radio', { name: '50' }));
    await waitFor(() =>
      expect(lastParams(request, 'profile.distribution')).toMatchObject({ bins: 50 }),
    );
    await waitFor(() =>
      expect(
        within(screen.getByRole('list', { name: /distribution$/ })).getAllByRole('listitem'),
      ).toHaveLength(50),
    );

    fireEvent.click(screen.getByRole('switch', { name: 'Log scale' }));
    expect([...document.querySelectorAll('.vbars-axis span')].map((n) => n.textContent)).toContain(
      '10',
    );
  });
});

describe('Duplicates', () => {
  it('shows groups for the chosen key columns and adds a step without leaving the tab', async () => {
    openDemoTool(request, 'duplicates');
    render(<ToolHost />);

    await screen.findByRole('table', { name: 'Duplicate groups' });
    expect(screen.getByRole('status').textContent).toBe('14 duplicate rows in 14 groups');

    fireEvent.click(screen.getByRole('button', { name: 'Add step: Remove duplicates' }));
    const steps = useCleaningStore.getState().drafts['file-1'];
    expect(steps).toHaveLength(1);
    expect(steps[0]).toMatchObject({ type: 'drop_duplicates', parameters: { columns: null } });
    expect(useWorkspaceStore.getState().notification?.action?.label).toBe('Undo');
    expect(screen.getByRole('button', { name: 'Added' }).getAttribute('aria-disabled')).toBe(
      'true',
    );
    expect(useProfileToolStore.getState().tool).toBe('duplicates');

    fireEvent.click(screen.getByRole('button', { name: 'Key columns' }));
    fireEvent.click(screen.getByRole('menuitemcheckbox', { name: 'customerID' }));
    await waitFor(() =>
      expect(lastParams(request, 'profile.duplicates')?.columns).toHaveLength(20),
    );
    expect(lastParams(request, 'profile.duplicates')?.columns).not.toContain('customerID');
  });

  it('toggles key columns, keeping at least one and using null for all', () => {
    const all = ['a', 'b', 'c'];
    expect(toggleKey(null, 'b', all)).toEqual(['a', 'c']);
    expect(toggleKey(['a', 'c'], 'b', all)).toBeNull();
    expect(toggleKey(['a'], 'a', all)).toEqual(['a']);
  });
});
