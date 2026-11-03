import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { ExportDialog } from '../../src/features/export/ExportDialog';

vi.mock('@tauri-apps/plugin-dialog', () => ({ save: vi.fn(async () => 'result.csv') }));

describe('export workflow controls', () => {
  afterEach(() => cleanup());
  it('requires explicit overwrite confirmation and returns destination choice', () => {
    const exportJob = vi.fn();
    render(<ExportDialog busy={false} onExport={exportJob} />);
    fireEvent.change(screen.getByLabelText('Destination path'), {
      target: { value: 'result.csv' },
    });
    fireEvent.click(screen.getByText('Export CSV'));
    expect(exportJob).toHaveBeenCalledWith('result.csv', 'csv', false);
    fireEvent.click(screen.getByLabelText('Confirm replacement if destination exists'));
    fireEvent.click(screen.getByText('Export CSV'));
    expect(exportJob).toHaveBeenLastCalledWith('result.csv', 'csv', true);
  });
});
