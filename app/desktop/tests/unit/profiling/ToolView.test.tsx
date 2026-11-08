import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { ToolView } from '../../../src/features/profiling/tools/ToolView';
import type { ToolEntry } from '../../../src/stores/profileToolStore';

const ready: ToolEntry = {
  requestKey: 'k',
  dataVersion: 'v1',
  status: 'ready',
  jobId: null,
  progress: null,
  message: null,
  result: { ok: true },
  error: null,
};

function show(props: Partial<Parameters<typeof ToolView>[0]> = {}) {
  const handlers = {
    onBack: vi.fn(),
    onCancel: vi.fn(),
    onRetry: vi.fn(),
    onProfile: vi.fn(),
  };
  render(
    <ToolView title="Patterns" entry={ready} stale={false} hasProfile {...handlers} {...props}>
      <p>Tool content</p>
    </ToolView>,
  );
  return handlers;
}

describe('ToolView', () => {
  afterEach(cleanup);

  it('is a region named after the tool with a heading and Back to dashboard', () => {
    const { onBack } = show();
    const region = screen.getByRole('region', { name: 'Patterns' });
    expect(region.contains(screen.getByRole('heading', { level: 2, name: 'Patterns' }))).toBe(true);
    expect(screen.queryByText('Tool content')).not.toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Back to dashboard' }));
    expect(onBack).toHaveBeenCalledTimes(1);
  });

  it('closes on Escape, but not while a menu or dialog has focus', () => {
    const { onBack } = show();
    fireEvent.keyDown(document.body, { key: 'Escape' });
    expect(onBack).toHaveBeenCalledTimes(1);

    const menu = document.createElement('div');
    menu.setAttribute('role', 'menu');
    const item = document.createElement('button');
    menu.append(item);
    document.body.append(menu);
    fireEvent.keyDown(item, { key: 'Escape' });
    expect(onBack).toHaveBeenCalledTimes(1);
    menu.remove();
  });

  it('marks an older result as out of date and keeps showing it', () => {
    show({ stale: true });
    expect(screen.getByRole('status').textContent).toContain('Out of date');
    expect(screen.queryByText('Tool content')).not.toBeNull();
  });

  it('shows progress and Cancel while running', () => {
    const { onCancel } = show({
      entry: { ...ready, status: 'running', jobId: 'job-1', progress: 0.25, message: 'Counting' },
    });
    const bar = screen.getByRole('progressbar', { name: 'Tool progress' });
    expect(bar.getAttribute('value')).toBe('0.25');
    expect(screen.queryByText('Counting')).not.toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it('shows a working message instead of content before the first result', () => {
    show({ entry: { ...ready, status: 'running', result: null } });
    expect(screen.queryByText('Tool content')).toBeNull();
    expect(screen.queryByText('Loading results…')).not.toBeNull();
  });

  it('asks for a profile first when there is none', () => {
    const { onProfile } = show({ hasProfile: false, entry: undefined });
    expect(screen.queryByText('Profile the dataset first')).not.toBeNull();
    expect(screen.queryByText('Tool content')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Profile now' }));
    expect(onProfile).toHaveBeenCalledTimes(1);
  });

  it('shows an actionable error with Try again', () => {
    const { onRetry } = show({
      entry: { ...ready, status: 'failed', result: null, error: { code: 'X', message: 'Broke.' } },
    });
    expect(screen.getByRole('alert').textContent).toContain('Broke.');
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });
});
