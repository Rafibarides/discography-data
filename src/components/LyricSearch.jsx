import { useState, useMemo } from 'react';
import { searchLyrics } from '../utils/analytics';
import { debounce } from '../utils/helpers';
import { CATEGORY_COLORS } from '../utils/constants';
import './LyricSearch.css';

export default function LyricSearch({ db, onClose, onSongSelect }) {
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');

  const handleInput = (e) => {
    setQuery(e.target.value);
    debouncedSet(e.target.value);
  };

  const debouncedSet = useMemo(
    () => debounce((q) => setDebouncedQuery(q), 300),
    []
  );

  const results = useMemo(() => {
    if (!debouncedQuery || debouncedQuery.length < 2) return null;
    return searchLyrics(db.songs, db.lyrics, debouncedQuery);
  }, [db, debouncedQuery]);

  const highlightText = (text, search) => {
    if (!search) return text;
    const regex = new RegExp(`(${search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
    const parts = text.split(regex);
    return parts.map((part, i) =>
      regex.test(part) ? (
        <mark key={i} className="lyric-highlight">{part}</mark>
      ) : (
        part
      )
    );
  };

  const getContext = (text, search, contextChars = 80) => {
    const lower = text.toLowerCase();
    const idx = lower.indexOf(search.toLowerCase());
    if (idx === -1) return text.slice(0, contextChars * 2);
    const start = Math.max(0, idx - contextChars);
    const end = Math.min(text.length, idx + search.length + contextChars);
    let snippet = text.slice(start, end);
    if (start > 0) snippet = '...' + snippet;
    if (end < text.length) snippet = snippet + '...';
    return snippet;
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box lyric-search-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Lyric Search</h3>
          <button className="modal-close" onClick={onClose}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <div className="lyric-search-input-wrap">
          <input
            type="text"
            value={query}
            onChange={handleInput}
            placeholder="Search a word or phrase across all lyrics..."
            className="lyric-search-input"
            autoFocus
          />
        </div>

        <div className="lyric-search-body">
          {results && (
            <div className="lyric-results-header">
              <span className="lyric-results-total">
                "{debouncedQuery}" found {results.totalOccurrences} time{results.totalOccurrences !== 1 ? 's' : ''} across {results.matches.length} song{results.matches.length !== 1 ? 's' : ''}
              </span>
            </div>
          )}

          {results && results.matches.length > 0 && (
            <div className="lyric-results-list">
              {results.matches.map((match) => {
                const catColor = CATEGORY_COLORS[match.song.category_name]?.color || '#555';
                return (
                  <button
                    key={match.song.song_id}
                    className="lyric-result-item"
                    onClick={() => onSongSelect(match.song)}
                  >
                    <div className="lr-header">
                      <span className="lr-dot" style={{ background: catColor }} />
                      <span className="lr-title">{match.song.title}</span>
                      <span className="lr-year">{match.song.year}</span>
                      <span className="lr-count">{match.count}x</span>
                    </div>
                    <div className="lr-snippet">
                      {highlightText(getContext(match.lyrics_text, debouncedQuery), debouncedQuery)}
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          {results && results.matches.length === 0 && (
            <div className="lyric-no-results">No matches found</div>
          )}

          {!results && (
            <div className="lyric-placeholder">
              Type at least 2 characters to search across all lyrics
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
