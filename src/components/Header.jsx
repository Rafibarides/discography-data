import { VIEW_MODES } from '../utils/constants';
import { debounce } from '../utils/helpers';
import { searchLyrics, getTopWordsAcrossAll } from '../utils/analytics';
import { useState, useCallback, useMemo } from 'react';
import './Header.css';

export default function Header({
  db,
  viewMode,
  onViewModeChange,
  searchQuery,
  onSearchChange,
  onRefresh,
  onSettings,
  onExport,
  onLyricSearch,
  loading,
  resultCount,
  totalCount,
}) {
  const [localSearch, setLocalSearch] = useState(searchQuery);

  const debouncedSearch = useCallback(
    debounce((q) => onSearchChange(q), 250),
    [onSearchChange]
  );

  const handleSearchInput = (e) => {
    setLocalSearch(e.target.value);
    debouncedSearch(e.target.value);
  };

  const topWord = useMemo(() => {
    if (!db) return null;
    const words = getTopWordsAcrossAll(db.lyrics);
    return words.length > 0 ? words[0] : null;
  }, [db]);

  const lyricHit = useMemo(() => {
    if (!db || !searchQuery || searchQuery.length < 2) return null;
    const result = searchLyrics(db.songs, db.lyrics, searchQuery);
    if (result.totalOccurrences === 0) return null;
    return result;
  }, [db, searchQuery]);

  return (
    <header className="header">
      <div className="header-left">
        <h1 className="header-title">Discography</h1>
        <span className="header-count">
          {resultCount === totalCount
            ? `${totalCount} songs`
            : `${resultCount} of ${totalCount}`}
        </span>
        {topWord && !searchQuery && (
          <span className="header-top-word">
            Most used word: <strong>{topWord.word}</strong> ({topWord.count}x)
          </span>
        )}
        {lyricHit && (
          <span className="header-lyric-hit">
            "{searchQuery}" found in lyrics {lyricHit.totalOccurrences}x across {lyricHit.matches.length} song{lyricHit.matches.length !== 1 ? 's' : ''}
          </span>
        )}
      </div>

      <div className="header-center">
        <div className="header-search">
          <svg className="search-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            type="text"
            placeholder="Search songs, people, keys, words..."
            value={localSearch}
            onChange={handleSearchInput}
            className="search-input"
          />
        </div>

        <nav className="header-nav">
          {Object.entries(VIEW_MODES).map(([key, value]) => (
            <button
              key={key}
              className={`nav-btn ${viewMode === value ? 'active' : ''}`}
              onClick={() => onViewModeChange(value)}
            >
              {key.charAt(0) + key.slice(1).toLowerCase()}
            </button>
          ))}
        </nav>
      </div>

      <div className="header-right">
        <button className="header-action" onClick={onLyricSearch} title="Search lyrics">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14 2 14 8 20 8" />
            <line x1="16" y1="13" x2="8" y2="13" />
            <line x1="16" y1="17" x2="8" y2="17" />
          </svg>
        </button>
        <button className="header-action" onClick={onExport} title="Export">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="7 10 12 15 17 10" />
            <line x1="12" y1="15" x2="12" y2="3" />
          </svg>
        </button>
        <button
          className={`header-action refresh-btn ${loading ? 'spinning' : ''}`}
          onClick={onRefresh}
          title="Refresh data"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="23 4 23 10 17 10" />
            <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
          </svg>
        </button>
        <button className="header-action" onClick={onSettings} title="Settings">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="3" />
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
          </svg>
        </button>
      </div>
    </header>
  );
}
