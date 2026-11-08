import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { ProfileHeader } from '../../../src/features/profiling/ProfileHeader';

const base = {
  computedAt: null,
  running: false,
  progress: null,
  message: null,
  onRefresh: vi.fn(),
  onCancel: vi.fn(),
};

describe('ProfileHeader', () => {
  afterEach(cleanup);

  it('shows the title, subtitle, and when the profile was computed', () => {
    render(<ProfileHeader {...base} computedAt={new Date().toISOString()} />);

    expect(screen.getByRole('heading', { name: 'Data profile' })).toBeTruthy();
    expect(screen.getByText(/Understand the structure/)).toBeTruthy();
    expect(screen.getByText(/Last updated/).textContent).toMatch(/^Last updated Today /);
  });

  it('refreshes on demand and disables Generate report until it exists', () => {
    const onRefresh = vi.fn();
    render(<ProfileHeader {...base} onRefresh={onRefresh} />);

    fireEvent.click(screen.getByRole('button', { name: 'Refresh profile' }));
    expect(onRefresh).toHaveBeenCalledOnce();
    const report = screen.getByRole('button', { name: 'Generate report' });
    expect((report as HTMLButtonElement).disabled).toBe(true);
    expect(report.getAttribute('title')).toBe('Profile the dataset first');
  });

  it('shows progress with the phase and a Cancel button while running', () => {
    const onCancel = vi.fn();
    render(
      <ProfileHeader
        {...base}
        running
        progress={0.3}
        message="Computing column statistics"
        onCancel={onCancel}
      />,
    );

    const bar = screen.getByRole('progressbar', { name: 'Profiling progress' });
    expect(bar.getAttribute('value')).toBe('0.3');
    expect(screen.getByText('Computing column statistics')).toBeTruthy();
    expect(
      (screen.getByRole('button', { name: 'Refresh profile' }) as HTMLButtonElement).disabled,
    ).toBe(true);
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(onCancel).toHaveBeenCalledOnce();
  });
});

describe('ProfileHeader staleness', () => {
  afterEach(cleanup);

  it('marks an out-of-date profile next to the last-updated time', () => {
    render(<ProfileHeader {...base} computedAt={new Date().toISOString()} stale />);
    const status = screen.getByRole('status');
    expect(status.textContent).toBe('Out of date');
    expect(screen.getByText(/Last updated/).textContent).toMatch(/^Last updated Today /);
  });

  it('shows no notice for a current profile', () => {
    render(<ProfileHeader {...base} computedAt={new Date().toISOString()} />);
    expect(screen.queryByText('Out of date')).toBeNull();
  });
});

describe('ProfileHeader report action', () => {
  afterEach(cleanup);

  it('generates a report when one can be made', () => {
    const onReport = vi.fn();
    render(<ProfileHeader {...base} reportHint={null} onReport={onReport} />);
    fireEvent.click(screen.getByRole('button', { name: 'Generate report' }));
    expect(onReport).toHaveBeenCalledOnce();
  });

  it('explains why it cannot', () => {
    render(<ProfileHeader {...base} reportHint="Refresh the profile first" onReport={vi.fn()} />);
    const button = screen.getByRole('button', { name: 'Generate report' });
    expect((button as HTMLButtonElement).disabled).toBe(true);
    expect(button.getAttribute('title')).toBe('Refresh the profile first');
  });
});

describe('ProfileHeader Refresh automatically', () => {
  afterEach(cleanup);

  it('is a switch that reports changes', () => {
    const onAutoRefresh = vi.fn();
    render(<ProfileHeader {...base} autoRefresh={false} onAutoRefresh={onAutoRefresh} />);

    const toggle = screen.getByRole('switch', { name: 'Refresh automatically' });
    expect((toggle as HTMLInputElement).checked).toBe(false);
    fireEvent.click(toggle);
    expect(onAutoRefresh).toHaveBeenCalledWith(true);
  });

  it('shows when it is on', () => {
    render(<ProfileHeader {...base} autoRefresh onAutoRefresh={vi.fn()} />);
    expect(
      (screen.getByRole('switch', { name: 'Refresh automatically' }) as HTMLInputElement).checked,
    ).toBe(true);
  });
});
