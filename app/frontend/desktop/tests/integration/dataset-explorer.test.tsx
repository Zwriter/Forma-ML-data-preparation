import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import App from '../../src/App';
import { useDatasetStore } from '../../src/stores/datasetStore';
import { useWorkspaceStore } from '../../src/stores/workspaceStore';

const invoke = vi.fn();
vi.mock('@tauri-apps/api/core', () => ({ invoke: (...args: unknown[]) => invoke(...args) }));
vi.mock('@tauri-apps/plugin-dialog', () => ({ open: vi.fn(), save: vi.fn() }));
vi.mock('@tauri-apps/api/event', () => ({ listen: vi.fn(async () => () => undefined) }));

describe('dataset explorer workflow', () => {
  afterEach(() => { cleanup(); invoke.mockReset(); useDatasetStore.setState({ dataset:null,preview:null,sourceDataset:null,sourcePreview:null }); useWorkspaceStore.setState({ busy:false,error:null }); });
  it('opens file, shows schema and bounded records', async () => {
    invoke.mockResolvedValueOnce({ id:'ui-1',status:'success',result:{ dataset_id:'d1',source_path:'fixture.csv',format:'csv',columns:1,rows:1,state:'open',schema:[{name:'x',type:'Int64',nullable:true}] },error:null })
      .mockResolvedValueOnce({ id:'ui-2',status:'success',result:{ dataset_id:'d1',columns:[{name:'x',type:'Int64',nullable:true}],records:[{x:1}],offset:0,limit:100,total_count:1 },error:null });
    render(<App />); fireEvent.change(screen.getByLabelText('CSV or Parquet file'), { target:{value:'fixture.csv'} }); fireEvent.click(screen.getByText('Open dataset'));
    await waitFor(() => expect(screen.getByText('Dataset overview')).toBeTruthy());
    expect(screen.getByText('fixture.csv')).toBeTruthy();
    expect(invoke).toHaveBeenCalledTimes(2);
  });
});
