import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { NotificationPopup } from '../../../src/components/NotificationPopup';
import { useWorkspaceStore } from '../../../src/stores/workspaceStore';

describe('notification popup', () => {
  afterEach(() => {
    cleanup();
    useWorkspaceStore.setState({ notification: null, error: null });
  });

  it('shows failures as dismissible alerts', () => {
    useWorkspaceStore.getState().setError('Filter rows failed: invalid rule');
    render(<NotificationPopup />);

    expect(screen.getByRole('heading', { name: 'Action failed' })).toBeTruthy();
    expect(screen.getByRole('alert').textContent).toContain('Filter rows failed');
    fireEvent.click(screen.getByRole('button', { name: 'Dismiss notification' }));
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('does not show a popup for completed actions', () => {
    render(<NotificationPopup />);

    expect(screen.queryByRole('status')).toBeNull();
  });
});
