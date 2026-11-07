import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { HorizontalBars } from '../../../src/features/profiling/charts/HorizontalBars';
import { VerticalBars } from '../../../src/features/profiling/charts/VerticalBars';

const items = [
  { label: 'TotalCharges', count: 1521 },
  { label: 'MonthlyCharges', count: 463 },
];

describe('HorizontalBars', () => {
  afterEach(cleanup);

  it('lists bars with count and share, sized against the top tick', () => {
    render(<HorizontalBars label="Missing values" items={items} total={7043} />);

    const list = screen.getByRole('list', { name: 'Missing values' });
    const bars = within(list).getAllByRole('listitem');
    expect(bars.map((bar) => bar.getAttribute('aria-label'))).toEqual([
      'TotalCharges: 1,521 (21.6%)',
      'MonthlyCharges: 463 (6.6%)',
    ]);
    expect(within(bars[0]).getByText('1,521 (21.6%)')).toBeTruthy();
    // Ticks run 0–2000, so 1,521 fills 76.05% of the track.
    expect((bars[0].querySelector('.hbars-bar') as HTMLElement).style.width).toBe('76.05%');
    expect(screen.getByText('2,000')).toBeTruthy();
  });

  it('shows the tooltip on keyboard focus', () => {
    render(<HorizontalBars label="Missing values" items={items} total={7043} />);
    fireEvent.focus(screen.getAllByRole('listitem')[1]);
    expect(screen.getByRole('tooltip').textContent).toBe('MonthlyCharges: 463 (6.6%)');
  });
});

describe('VerticalBars', () => {
  afterEach(cleanup);

  const contracts = [
    { label: 'Month-to-month', count: 3875 },
    { label: 'One year', count: 1483 },
  ];

  it('draws focusable columns with optional value labels and a y axis', () => {
    render(
      <VerticalBars
        label="Contract values"
        items={contracts}
        total={7043}
        showValues
        yLabel="Count"
      />,
    );

    const bars = within(screen.getByRole('list', { name: 'Contract values' })).getAllByRole(
      'listitem',
    );
    expect(bars[0].getAttribute('aria-label')).toBe('Month-to-month: 3,875 (55.0%)');
    expect(within(bars[0]).getByText('3,875 (55.0%)')).toBeTruthy();
    expect((bars[0].querySelector('.vbars-bar') as HTMLElement).style.height).toBe('96.875%');
    expect(screen.getByText('Count')).toBeTruthy();
    fireEvent.mouseEnter(bars[1]);
    expect(screen.getByRole('tooltip').textContent).toBe('One year: 1,483 (21.1%)');
  });

  it('labels only some bars when there are many', () => {
    const bins = Array.from({ length: 30 }, (_, i) => ({ label: String(i), count: i }));
    render(<VerticalBars label="Histogram" items={bins} total={435} labelEvery={10} />);
    const labels = [...document.querySelectorAll('.vbars-label')].map((node) => node.textContent);
    expect(labels.filter(Boolean)).toEqual(['0', '10', '20']);
    expect(screen.queryByText('29 (6.7%)')).toBeNull();
  });

  it('draws a log scale with power-of-ten ticks, keeping exact counts in labels', () => {
    const skewed = [
      { label: 'small', count: 9 },
      { label: 'large', count: 999 },
    ];
    render(<VerticalBars label="Skewed" items={skewed} total={1008} scale="log" />);

    const ticks = [...document.querySelectorAll('.vbars-axis span')].map((n) => n.textContent);
    expect(ticks).toEqual(['0', '1', '10', '100', '1,000']);
    const bars = within(screen.getByRole('list', { name: 'Skewed' })).getAllByRole('listitem');
    const height = (bar: HTMLElement) =>
      parseFloat((bar.querySelector('.vbars-bar') as HTMLElement).style.height);
    expect(height(bars[0])).toBeCloseTo((Math.log10(10) / Math.log10(1001)) * 100, 1);
    expect(height(bars[1])).toBeCloseTo((Math.log10(1000) / Math.log10(1001)) * 100, 1);
    expect(bars[1].getAttribute('aria-label')).toBe('large: 999 (99.1%)');
  });
});
