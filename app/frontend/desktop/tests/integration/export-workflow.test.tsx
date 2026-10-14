import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { ExportDialog } from '../../src/features/export/ExportDialog';
import { BeforeAfterComparison } from '../../src/features/cleaning/BeforeAfterComparison';
import { JobStatus } from '../../src/features/jobs/JobStatus';
import { useJobStore } from '../../src/stores/jobStore';

vi.mock('@tauri-apps/plugin-dialog', () => ({ save: vi.fn(async () => 'result.csv') }));

describe('export workflow controls', () => {
  afterEach(() => { cleanup(); useJobStore.setState({ jobs: [] }); });
  it('requires explicit overwrite confirmation and returns destination choice', () => {
    const exportJob = vi.fn();
    render(<ExportDialog busy={false} onExport={exportJob} />);
    fireEvent.change(screen.getByLabelText('Destination path'), { target:{value:'result.csv'} });
    fireEvent.click(screen.getByText('Export CSV'));
    expect(exportJob).toHaveBeenCalledWith('result.csv', 'csv', false);
    fireEvent.click(screen.getByLabelText('Confirm replacement if destination exists'));
    fireEvent.click(screen.getByText('Export CSV'));
    expect(exportJob).toHaveBeenLastCalledWith('result.csv', 'csv', true);
  });

  it('compares before and after bounded records', () => {
    render(<BeforeAfterComparison before={[{x:1}]} after={[{x:2}]} />);
    expect(screen.getByText('Before')).toBeTruthy(); expect(screen.getByText('After')).toBeTruthy();
    expect(screen.getByText(/\{\s*"x":\s*1\s*\}/)).toBeTruthy();
  });

  it('shows active job state and cancellation action', () => {
    useJobStore.setState({ jobs:[{job_id:'j1',kind:'export',state:'running',progress:null,message:'Writing'}] });
    render(<JobStatus />);
    expect(screen.getByText(/progress unknown/)).toBeTruthy();
    expect(screen.getByText('Cancel')).toBeTruthy();
  });
});
