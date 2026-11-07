import { afterEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { ToolHost } from '../../../../src/features/profiling/tools/ToolHost';
import {
  correlationText,
  CorrelationGrid,
} from '../../../../src/features/profiling/charts/CorrelationGrid';
import { lastParams, openDemoTool, resetTools } from './toolSetup';

const request = vi.hoisted(() => vi.fn());
vi.mock('../../../../src/services/ipcClient', () => ({ request }));

afterEach(() => resetTools(request));

describe('Patterns', () => {
  it('shows correlations with a word per cell, strongest pairs, and value formats', async () => {
    openDemoTool(request, 'patterns');
    render(<ToolHost />);

    const table = await screen.findByRole('table', { name: 'Correlations' });
    const row = within(table).getByRole('rowheader', { name: 'tenure' }).closest('tr')!;
    expect(within(row).getByText('0.83 strong')).toBeTruthy();
    expect(within(table).getByRole('columnheader', { name: 'TotalCharges' })).toBeTruthy();

    const strongest = screen.getByRole('list', { name: 'Strongest pairs' });
    expect(within(strongest).getAllByRole('listitem')[0].textContent).toBe(
      'tenure and TotalCharges: 0.83 strong',
    );
    const formats = screen.getByRole('list', { name: 'Value formats' });
    expect(within(formats).getByText('customerID')).toBeTruthy();
    expect(formats.textContent).toContain('Mixed formats');
    expect(lastParams(request, 'profile.patterns')).toMatchObject({ dataset_id: 'demo' });
  });

  it('words each coefficient by strength, and too few shared rows read as a dash', () => {
    expect(correlationText(0.7)).toBe('0.70 strong');
    expect(correlationText(-0.45)).toBe('-0.45 moderate');
    expect(correlationText(0.2)).toBe('0.20 weak');
    expect(correlationText(0.19)).toBe('0.19 none');
    expect(correlationText(null)).toBe('—');
  });

  it('shows a dash where a pair shares too few rows', () => {
    render(
      <CorrelationGrid
        columns={['a', 'b']}
        matrix={[
          [1, null],
          [null, 1],
        ]}
      />,
    );
    const table = screen.getByRole('table', { name: 'Correlations' });
    expect(within(table).getAllByText('—')).toHaveLength(2);
    expect(within(table).getAllByText('1.00 strong')).toHaveLength(2);
  });
});

describe('Anomalies', () => {
  it('lists outliers per column and shows the outlier rows for one column', async () => {
    openDemoTool(request, 'anomalies');
    render(<ToolHost />);

    const table = await screen.findByRole('table', { name: 'Outliers by column' });
    const first = within(table).getAllByRole('row')[1];
    expect(within(first).getByRole('rowheader').textContent).toBe('TotalCharges');
    expect(first.textContent).toContain('8684.8');

    fireEvent.click(screen.getByRole('button', { name: 'Show rows for TotalCharges' }));
    const rows = await screen.findByRole('table', { name: 'Outlier rows' });
    expect(lastParams(request, 'profile.rows')).toMatchObject({
      filter: { kind: 'outliers', column: 'TotalCharges' },
      offset: 0,
      limit: 100,
    });
    expect(within(rows).getAllByText('Outlier:').length).toBe(3);
  });

  it('cannot show rows for a column without outliers', async () => {
    openDemoTool(request, 'anomalies');
    render(<ToolHost />);
    const button = (await screen.findByRole('button', {
      name: 'Show rows for tenure',
    })) as HTMLButtonElement;
    expect(button.disabled).toBe(true);
  });
});
