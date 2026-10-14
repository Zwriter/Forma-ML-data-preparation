import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { useDatasetStore } from '../../src/stores/datasetStore';
import { useJobStore } from '../../src/stores/jobStore';
import { useTransformationStore } from '../../src/stores/transformationStore';
import { WorkflowActions } from '../../src/features/workspace/WorkflowActions';

const bridge = vi.hoisted(() => ({ invoke: vi.fn(), listener: undefined as ((event: { payload: unknown }) => void) | undefined }));
vi.mock('@tauri-apps/api/core', () => ({ invoke: bridge.invoke }));
vi.mock('@tauri-apps/plugin-dialog', () => ({ open: vi.fn(), save: vi.fn() }));
vi.mock('@tauri-apps/api/event', () => ({ listen: vi.fn(async (_event: string, handler: typeof bridge.listener) => { bridge.listener = handler ?? undefined; return () => undefined; }) }));

describe('import-clean-export desktop flow', () => {
  afterEach(() => {
    cleanup(); bridge.invoke.mockReset(); bridge.listener = undefined;
    useDatasetStore.setState({ dataset:null,preview:null,sourceDataset:null,sourcePreview:null });
    useJobStore.setState({ jobs:[] }); useTransformationStore.setState({ operations:[] });
  });

  it('previews, applies, updates derived dataset, then exports it', async () => {
    const source = { dataset_id:'source-1',source_path:'source.csv',format:'csv' as const,columns:1,rows:2,state:'open',schema:[{name:'x',type:'Int64',nullable:true}] };
    const derived = { ...source,dataset_id:'derived-1',source_path:'derived://one',rows:1 };
    useDatasetStore.setState({ dataset:source,sourceDataset:source,preview:null,sourcePreview:null });
    bridge.invoke.mockResolvedValueOnce({ id:'r1',status:'success',result:{before:[{x:1},{x:1}],after:[{x:1}]},error:null })
      .mockResolvedValueOnce({ id:'r2',status:'success',result:{job_id:'clean-1',state:'pending'},error:null })
      .mockResolvedValueOnce({ id:'r3',status:'success',result:{dataset_id:'derived-1',columns:source.schema,records:[{x:1}],offset:0,limit:100,total_count:1},error:null })
      .mockResolvedValueOnce({ id:'r4',status:'success',result:{job_id:'export-1',state:'pending'},error:null });
    render(<WorkflowActions />);
    fireEvent.click(screen.getByText('Add operation'));
    fireEvent.click(screen.getByText('Preview first enabled'));
    await waitFor(() => expect(screen.getByText('Transformation preview')).toBeTruthy());
    fireEvent.click(screen.getByText('Apply operations'));
    await waitFor(() => expect(bridge.invoke).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(bridge.listener).toBeTypeOf('function'));
    await act(async () => bridge.listener?.({ payload:{job_id:'clean-1',kind:'clean',state:'completed',progress:1,message:'Completed',result:{dataset:derived}} }));
    await waitFor(() => expect(useDatasetStore.getState().dataset?.dataset_id).toBe('derived-1'));
    fireEvent.change(screen.getByLabelText('Destination path'), { target:{value:'clean.csv'} });
    fireEvent.click(screen.getByText('Export CSV'));
    await waitFor(() => expect(bridge.invoke).toHaveBeenCalledTimes(4));
    expect(bridge.invoke.mock.calls[3][1].request.method).toBe('export.csv');
    expect(bridge.invoke.mock.calls[3][1].request.params.dataset_id).toBe('derived-1');
  });
});
