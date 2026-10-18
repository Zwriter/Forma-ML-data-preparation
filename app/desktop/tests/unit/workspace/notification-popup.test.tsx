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

    expect(screen.getByRole('alert').textContent).toContain('Filter rows failed');
    fireEvent.click(screen.getByRole('button', { name: 'Dismiss notification' }));
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('shows completed actions as status popups', () => {
    useWorkspaceStore.getState().notify('success', 'Sort rows completed');
    render(<NotificationPopup />);

    expect(screen.getByRole('status').textContent).toContain('Sort rows completed');
  });
});
