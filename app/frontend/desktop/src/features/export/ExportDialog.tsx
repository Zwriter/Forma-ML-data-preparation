import { save } from '@tauri-apps/plugin-dialog';
import { useExportStore } from '../../stores/exportStore';

export function ExportDialog({ busy, onExport }: { busy: boolean; onExport: (destination: string, format: 'csv'|'parquet', overwrite: boolean) => void }) {
  const destination = useExportStore((state) => state.destination);
  const overwrite = useExportStore((state) => state.overwrite);
  const setDestination = useExportStore((state) => state.setDestination);
  const setOverwrite = useExportStore((state) => state.setOverwrite);
  async function browse(format: 'csv'|'parquet') {
    const path = await save({ filters: [{ name: format.toUpperCase(), extensions: [format] }] });
    if (path) setDestination(path);
  }
  return <section className="card"><h2>Export cleaned dataset</h2>
    <label htmlFor="export-destination">Destination path</label>
    <div className="row"><input id="export-destination" value={destination} onChange={(event) => setDestination(event.target.value)} placeholder="Choose output path" />
      <button disabled={busy} onClick={() => void browse('csv')}>Browse CSV</button><button disabled={busy} onClick={() => void browse('parquet')}>Browse Parquet</button></div>
    <label className="check"><input type="checkbox" checked={overwrite} onChange={(event) => setOverwrite(event.target.checked)} /> Confirm replacement if destination exists</label>
    <div className="row"><button disabled={busy || !destination} onClick={() => onExport(destination, 'csv', overwrite)}>Export CSV</button>
      <button disabled={busy || !destination} onClick={() => onExport(destination, 'parquet', overwrite)}>Export Parquet</button></div>
  </section>;
}
