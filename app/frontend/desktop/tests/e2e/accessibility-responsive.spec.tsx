import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import App from '../../src/App';
import { WorkflowActions } from '../../src/features/workspace/WorkflowActions';
import { useDatasetStore } from '../../src/stores/datasetStore';

const invoke = vi.hoisted(() => vi.fn());
vi.mock('@tauri-apps/api/core', () => ({ invoke }));
vi.mock('@tauri-apps/plugin-dialog', () => ({ open: vi.fn(), save: vi.fn() }));
vi.mock('@tauri-apps/api/event', () => ({ listen: vi.fn(async () => () => undefined) }));

describe('desktop accessibility and responsive shell', () => {
  afterEach(() => { cleanup(); useDatasetStore.setState({ dataset:null,preview:null,sourceDataset:null,sourcePreview:null }); invoke.mockReset(); });
  it('keeps dataset selection controls named and keyboard reachable in narrow window', () => {
    Object.defineProperty(window, 'innerWidth', { configurable:true, value:390 });
    render(<App />);
    expect(screen.getByRole('heading', { name:'Forma' })).toBeTruthy();
    expect(screen.getByLabelText('CSV or Parquet file')).toBeTruthy();
    expect(screen.getByRole('button', { name:'Browse files' })).toBeTruthy();
    const fileInput = screen.getByLabelText('CSV or Parquet file'); fileInput.focus();
    expect(document.activeElement).toBe(fileInput);
  });

  it('shows running profile state within one second', async () => {
    const dataset = { dataset_id:'d1',source_path:'data.csv',format:'csv' as const,columns:1,rows:10,state:'open',schema:[{name:'x',type:'Int64',nullable:true}] };
    useDatasetStore.setState({ dataset,preview:null,sourceDataset:dataset,sourcePreview:null });
    invoke.mockResolvedValue({ id:'profile-1',status:'success',result:{job_id:'p1',state:'pending'},error:null });
    const started = performance.now(); render(<WorkflowActions />);
    fireEvent.click(screen.getByText('Profile dataset'));
    await waitFor(() => expect(screen.getByText(/profile job queued/i)).toBeTruthy());
    expect(performance.now() - started).toBeLessThan(1000);
    expect(screen.getByText(/profile: Queued/)).toBeTruthy();
  });
});
