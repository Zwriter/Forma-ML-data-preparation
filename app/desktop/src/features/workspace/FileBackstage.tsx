import { useEffect, useState } from 'react';
import { Icon } from '../../components/Icon';
import type { Dataset } from '../../types/dataset';

type RecentFile = { path: string; name: string; lastOpened: number; favorite: boolean };
type FilePage = 'import' | 'settings' | 'settings-about';

type Props = {
  dataset: Dataset | null;
  busy: boolean;
  showColumnDetails: boolean;
  onShowColumnDetails: (show: boolean) => void;
  onBack: () => void;
  onBrowse: () => void;
  onOpenDataset: (path: string) => Promise<boolean>;
};

const RECENT_FILES_KEY = 'forma.recent-files';

function readRecentFiles(): RecentFile[] {
  try {
    const saved: unknown = JSON.parse(window.localStorage.getItem(RECENT_FILES_KEY) ?? '[]');
    if (!Array.isArray(saved)) return [];
    return saved
      .filter(
        (item): item is Omit<RecentFile, 'favorite'> & { favorite?: boolean } =>
          typeof item?.path === 'string' &&
          typeof item?.name === 'string' &&
          typeof item?.lastOpened === 'number',
      )
      .map((item) => ({ ...item, favorite: item.favorite === true }));
  } catch {
    return [];
  }
}

export function FileBackstage({
  dataset,
  busy,
  showColumnDetails,
  onShowColumnDetails,
  onBack,
  onBrowse,
  onOpenDataset,
}: Props) {
  const [filePage, setFilePage] = useState<FilePage>('import');
  const [recentFiles, setRecentFiles] = useState<RecentFile[]>(readRecentFiles);
  const [recentFilter, setRecentFilter] = useState<'recent' | 'favorites'>('recent');
  const [recentSearch, setRecentSearch] = useState('');

  useEffect(() => {
    if (!dataset) return;
    const sourcePath = dataset.source_path;
    const recentFile = {
      path: sourcePath,
      name: sourcePath.split(/[\\/]/).pop() || sourcePath,
      lastOpened: Date.now(),
    };
    setRecentFiles((current) => {
      const previous = current.find((file) => file.path === sourcePath);
      return [
        { ...recentFile, favorite: previous?.favorite ?? false },
        ...current.filter((file) => file.path !== sourcePath),
      ].slice(0, 10);
    });
  }, [dataset?.source_path, dataset?.dataset_id]);

  useEffect(() => {
    try {
      window.localStorage.setItem(RECENT_FILES_KEY, JSON.stringify(recentFiles));
    } catch {
      // Recent files remain available for this session if browser storage is disabled.
    }
  }, [recentFiles]);

  const visibleRecentFiles = recentFiles.filter((file) => {
    if (recentFilter === 'favorites' && !file.favorite) return false;
    const query = recentSearch.trim().toLowerCase();
    return (
      !query || file.name.toLowerCase().includes(query) || file.path.toLowerCase().includes(query)
    );
  });

  function toggleFavorite(path: string) {
    setRecentFiles((files) =>
      files.map((file) => (file.path === path ? { ...file, favorite: !file.favorite } : file)),
    );
  }

  return (
    <section className="file-backstage" id="file">
      <nav className="file-navigation" aria-label="File menu">
        <button className="file-back" type="button" aria-label="Back to workspace" onClick={onBack}>
          <Icon name="back" />
        </button>
        <button
          className={filePage === 'import' ? 'selected' : ''}
          type="button"
          onClick={() => setFilePage('import')}
        >
          <Icon name="open" />
          Import
        </button>
        <div className="file-nav-bottom">
          <button
            className={filePage.startsWith('settings') ? 'selected' : ''}
            type="button"
            onClick={() => setFilePage('settings')}
          >
            <Icon name="settings" />
            Settings
          </button>
        </div>
      </nav>
      <div className="file-content">
        {filePage === 'import' && (
          <>
            <h1>Forma</h1>
            <div className="recent-files-tools">
              <div className="recent-file-filters" role="group" aria-label="Filter files">
                <button
                  type="button"
                  className={recentFilter === 'recent' ? 'active' : ''}
                  aria-pressed={recentFilter === 'recent'}
                  onClick={() => setRecentFilter('recent')}
                >
                  Recent
                </button>
                <button
                  type="button"
                  className={recentFilter === 'favorites' ? 'active' : ''}
                  aria-pressed={recentFilter === 'favorites'}
                  onClick={() => setRecentFilter('favorites')}
                >
                  Favorites
                </button>
              </div>
              <div className="recent-file-actions">
                <input
                  type="search"
                  aria-label="Search recent files"
                  placeholder="Search files"
                  value={recentSearch}
                  onChange={(event) => setRecentSearch(event.target.value)}
                />
                <button
                  type="button"
                  className="file-primary-action"
                  disabled={busy}
                  onClick={onBrowse}
                >
                  <Icon name="open" />
                  Import file
                </button>
              </div>
            </div>
            {visibleRecentFiles.length ? (
              <ul className="recent-files-list">
                {visibleRecentFiles.map((file) => (
                  <li key={file.path}>
                    <button
                      type="button"
                      className="recent-file-open"
                      onClick={() => void onOpenDataset(file.path)}
                    >
                      <Icon name="open" />
                      <span className="recent-file-name">{file.name}</span>
                      <span className="recent-file-path">{file.path}</span>
                      <time dateTime={new Date(file.lastOpened).toISOString()}>
                        {new Date(file.lastOpened).toLocaleDateString()}
                      </time>
                    </button>
                    <button
                      type="button"
                      className={`favorite-toggle${file.favorite ? ' is-favorite' : ''}`}
                      aria-label={
                        file.favorite
                          ? `Remove ${file.name} from favorites`
                          : `Add ${file.name} to favorites`
                      }
                      aria-pressed={file.favorite}
                      onClick={() => toggleFavorite(file.path)}
                    >
                      {file.favorite ? '★' : '☆'}
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="recent-files-empty">
                {recentFilter === 'favorites'
                  ? 'No favorites yet. Add files with the star button.'
                  : recentSearch.trim()
                    ? 'No files match your search.'
                    : 'No recently opened files.'}
              </p>
            )}
          </>
        )}
        {filePage === 'settings' && (
          <section className="card settings-card" id="settings">
            <h1>Settings</h1>
            <p>Forma processes datasets locally on this device.</p>
            <label className="check">
              <input
                type="checkbox"
                checked={showColumnDetails}
                onChange={(event) => onShowColumnDetails(event.target.checked)}
              />
              Show column details
            </label>
            <button
              type="button"
              className="about-settings-link"
              onClick={() => setFilePage('settings-about')}
            >
              About Forma
            </button>
          </section>
        )}
        {filePage === 'settings-about' && (
          <section className="card settings-card">
            <button type="button" className="quiet-button" onClick={() => setFilePage('settings')}>
              Back to Settings
            </button>
            <h1>About Forma</h1>
            <p>Forma is a local data workspace for exploring and transforming datasets.</p>
          </section>
        )}
      </div>
    </section>
  );
}
