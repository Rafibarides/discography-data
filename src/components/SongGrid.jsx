import { useMemo } from 'react';
import { CATEGORY_COLORS, YEAR_COLORS } from '../utils/constants';
import { groupBy, mapRange, getKeyQuality } from '../utils/helpers';
import SongTile from './SongTile';
import './SongGrid.css';

export default function SongGrid({ songs, allSongs, display, db, onSongSelect, onPersonSelect }) {
  const grouped = useMemo(() => {
    if (display.groupBy === 'none') return { '': songs };
    return groupBy(songs, (s) => {
      switch (display.groupBy) {
        case 'year': return s.year || 'Unknown';
        case 'release': return s.release?.title || 'Unknown';
        case 'category': return s.category_name || 'Unknown';
        case 'key_quality': return s.key_quality === 'minor' ? 'Minor' : 'Major';
        default: return '';
      }
    });
  }, [songs, display.groupBy]);

  const sizeRange = useMemo(() => {
    if (display.sizeBy === 'none') return null;
    const values = allSongs.map((s) => {
      switch (display.sizeBy) {
        case 'word_count': return s.stats?.word_count || 0;
        case 'duration': return s.duration_sec || 0;
        case 'bpm': return s.bpm || 0;
        case 'title_length': return s.title_length || s.title?.length || 0;
        default: return 0;
      }
    }).filter(Boolean);
    if (!values.length) return null;
    return [Math.min(...values), Math.max(...values)];
  }, [allSongs, display.sizeBy]);

  const getSizeValue = (song) => {
    if (!sizeRange) return 1;
    let val;
    switch (display.sizeBy) {
      case 'word_count': val = song.stats?.word_count || 0; break;
      case 'duration': val = song.duration_sec || 0; break;
      case 'bpm': val = song.bpm || 0; break;
      case 'title_length': val = song.title_length || song.title?.length || 0; break;
      default: val = 0;
    }
    return mapRange(val, sizeRange[0], sizeRange[1], 0.5, 1.5);
  };

  const getColor = (song) => {
    switch (display.colorBy) {
      case 'category': {
        const cat = CATEGORY_COLORS[song.category_name];
        return cat ? { bg: cat.color, glow: cat.glow } : { bg: '#444', glow: 'none' };
      }
      case 'perspective': {
        if (song.perspective_name?.includes('Third')) return { bg: '#FFB347', glow: '0 0 8px rgba(255,179,71,0.4)' };
        if (song.perspective_name?.includes('Both')) return { bg: '#C77DFF', glow: '0 0 8px rgba(199,125,255,0.4)' };
        return { bg: '#4A7BFF', glow: '0 0 8px rgba(74,123,255,0.4)' };
      }
      case 'year': {
        const c = YEAR_COLORS[song.year] || '#666';
        return { bg: c, glow: `0 0 8px ${c}40` };
      }
      case 'key_quality': {
        const q = getKeyQuality(song.key);
        return q === 'minor'
          ? { bg: '#4A7BFF', glow: '0 0 8px rgba(74,123,255,0.4)' }
          : { bg: '#FFB347', glow: '0 0 8px rgba(255,179,71,0.4)' };
      }
      case 'explicit': {
        return song.is_explicit
          ? { bg: '#FF6B8A', glow: '0 0 8px rgba(255,107,138,0.4)' }
          : { bg: '#78D672', glow: '0 0 8px rgba(120,214,114,0.4)' };
      }
      default:
        return { bg: '#555', glow: 'none' };
    }
  };

  const sortedGroups = useMemo(() => {
    const entries = Object.entries(grouped);
    if (display.groupBy === 'year') {
      entries.sort((a, b) => Number(a[0]) - Number(b[0]));
    }
    return entries;
  }, [grouped, display.groupBy]);

  if (!songs.length) {
    return (
      <div className="grid-empty">
        <p>No songs match the current filters.</p>
      </div>
    );
  }

  return (
    <div className="song-grid-wrapper">
      {display.colorBy !== 'none' && (
        <div className="grid-legend">
          {getLegendItems(display.colorBy, db).map((item) => (
            <span key={item.label} className="legend-item">
              <span className="legend-dot" style={{ background: item.color }} />
              <span className="legend-label">{item.label}</span>
            </span>
          ))}
        </div>
      )}

      {sortedGroups.map(([group, groupSongs]) => (
        <div key={group} className="grid-group">
          {group && (
            <div className="grid-group-header">
              <span className="group-title">{group}</span>
              <span className="group-count">{groupSongs.length}</span>
            </div>
          )}
          <div className="song-grid">
            {groupSongs.map((song) => (
              <SongTile
                key={song.song_id}
                song={song}
                color={getColor(song)}
                size={getSizeValue(song)}
                onClick={() => onSongSelect(song)}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function getLegendItems(colorBy, db) {
  switch (colorBy) {
    case 'category':
      return Object.entries(CATEGORY_COLORS).map(([name, val]) => ({
        label: val.label,
        color: val.color,
      }));
    case 'perspective':
      return [
        { label: 'First Person', color: '#4A7BFF' },
        { label: 'Third Person', color: '#FFB347' },
        { label: 'Mixed', color: '#C77DFF' },
      ];
    case 'year':
      return (db?.meta?.years || []).map((y) => ({
        label: String(y),
        color: YEAR_COLORS[y] || '#666',
      }));
    case 'key_quality':
      return [
        { label: 'Major', color: '#FFB347' },
        { label: 'Minor', color: '#4A7BFF' },
      ];
    case 'explicit':
      return [
        { label: 'Explicit', color: '#FF6B8A' },
        { label: 'Clean', color: '#78D672' },
      ];
    default:
      return [];
  }
}
