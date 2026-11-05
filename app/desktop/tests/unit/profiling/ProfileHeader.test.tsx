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
