type Props = { path: string; busy: boolean; setPath: (path: string) => void; onBrowse: () => void; onOpen: () => void };

export function DatasetSelector({ path, busy, setPath, onBrowse, onOpen }: Props) {
  return <section className="card">
    <h2>Open a dataset</h2>
    <label htmlFor="dataset-path">CSV or Parquet file</label>
    <div className="row">
      <input id="dataset-path" value={path} onChange={(event) => setPath(event.target.value)} placeholder="C:\\data\\sample.csv" />
      <button onClick={onBrowse}>Browse files</button>
      <button disabled={busy || !path.trim()} onClick={onOpen}>{busy ? 'Opening…' : 'Open dataset'}</button>
    </div>
  </section>;
}
