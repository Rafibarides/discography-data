import { useState, useMemo, useRef } from 'react';
import './HeatmapView.css';

const COLOR_OPTIONS = [
  { value: 'featured', label: 'Has Featured Vocalist' },
  { value: 'explicit', label: 'Explicit' },
  { value: 'video', label: 'Has Video' },
  { value: 'published', label: 'Published' },
  { value: 'major_minor', label: 'Major / Minor' },
  { value: 'category', label: 'Category' },
];

const INTENSITY_OPTIONS = [
  { value: 'none', label: 'Uniform' },
  { value: 'word_count', label: 'Word Count' },
  { value: 'duration', label: 'Duration' },
  { value: 'bpm', label: 'BPM' },
];

const SORT_OPTIONS = [
  { value: 'chronological', label: 'Chronological' },
  { value: 'release', label: 'By Release' },
  { value: 'word_count', label: 'By Word Count' },
  { value: 'bpm', label: 'By BPM' },
  { value: 'duration', label: 'By Duration' },
];

const CYAN = '#00F0FF';
const PINK = '#FF2D78';
const CYAN_DIM = '#0A3A3D';
const PINK_DIM = '#3D0A1E';

function getCategoryShade(name) {
  switch (name) {
    case 'Love & Romance (Positive)': return PINK;
    case 'Love & Romance (Negative)': return '#C0204A';
    case 'Social Commentary': return CYAN;
    case 'Narrative / Storytime': return '#00B8C4';
    case 'Philosophical': return '#8B5CF6';
    case 'Reflective': return '#06B6D4';
    default: return '#333';
  }
}

export default function HeatmapView({ songs, allSongs, db, onSongSelect }) {
  const [colorMode, setColorMode] = useState('featured');
  const [intensity, setIntensity] = useState('none');
  const [sortBy, setSortBy] = useState('chronological');
  const [yearRange, setYearRange] = useState(null);
  const [tooltip, setTooltip] = useState(null);
  const gridRef = useRef(null);

  const years = db.meta.years;
  const minYear = years[0] || 2020;
  const maxYear = years[years.length - 1] || 2026;

  const currentMax = yearRange !== null ? yearRange : maxYear;

  const filteredByYear = useMemo(() => {
    return allSongs.filter((s) => s.year >= minYear && s.year <= currentMax);
  }, [allSongs, minYear, currentMax]);

  const matchedIds = useMemo(() => new Set(songs.map((s) => s.song_id)), [songs]);

  const sorted = useMemo(() => {
    const arr = [...filteredByYear];
    switch (sortBy) {
      case 'chronological':
        arr.sort((a, b) => (a.year - b.year) || String(a.title).localeCompare(String(b.title)));
        break;
      case 'release':
        arr.sort((a, b) => {
          const ra = a.release?.title || '';
          const rb = b.release?.title || '';
          return ra.localeCompare(rb) || (a.year - b.year);
        });
        break;
      case 'word_count':
        arr.sort((a, b) => (b.stats?.word_count || 0) - (a.stats?.word_count || 0));
        break;
      case 'bpm':
        arr.sort((a, b) => (a.bpm || 0) - (b.bpm || 0));
        break;
      case 'duration':
        arr.sort((a, b) => (b.duration_sec || 0) - (a.duration_sec || 0));
        break;
      default:
        break;
    }
    return arr;
  }, [filteredByYear, sortBy]);

  const intensityRange = useMemo(() => {
    if (intensity === 'none') return null;
    const values = allSongs.map((s) => getVal(s, intensity)).filter((v) => v > 0);
    if (!values.length) return null;
    return [Math.min(...values), Math.max(...values)];
  }, [allSongs, intensity]);

  const getOpacity = (song, isMatch) => {
    if (!isMatch) return 0.08;
    if (intensity === 'none' || !intensityRange) return 0.9;
    const val = getVal(song, intensity);
    const [lo, hi] = intensityRange;
    if (hi === lo) return 0.9;
    return 0.25 + ((val - lo) / (hi - lo)) * 0.75;
  };

  const getColor = (song, isMatch) => {
    if (!isMatch) return '#1A1A1A';
    switch (colorMode) {
      case 'featured': {
        const has = song.stats?.featured_vocalist_count > 0 || song.stats?.has_featured_vocalist;
        return has ? PINK : CYAN;
      }
      case 'explicit':
        return song.is_explicit ? PINK : CYAN;
      case 'video':
        return song.has_video ? PINK : CYAN;
      case 'published':
        return song.is_published ? CYAN : PINK;
      case 'major_minor':
        return song.key_quality === 'minor' ? CYAN : PINK;
      case 'category':
        return getCategoryShade(song.category_name);
      default:
        return CYAN;
    }
  };

  const getGlow = (song, isMatch) => {
    if (!isMatch) return 'none';
    const color = getColor(song, true);
    const op = getOpacity(song, true);
    if (op < 0.35) return `0 0 3px ${color}30`;
    const s = Math.round(op * 10);
    return `0 0 ${s}px ${color}90, 0 0 ${s * 2}px ${color}30`;
  };

  const cols = Math.max(14, Math.ceil(Math.sqrt(sorted.length) * 1.9));

  const handleMouseEnter = (e, song) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const gridRect = gridRef.current?.getBoundingClientRect() || { left: 0, top: 0 };
    setTooltip({
      song,
      x: rect.left - gridRect.left + rect.width / 2,
      y: rect.top - gridRect.top - 4,
    });
  };

  const getLegend = () => {
    switch (colorMode) {
      case 'featured': return [{ color: PINK, label: 'Featured' }, { color: CYAN, label: 'Solo' }];
      case 'explicit': return [{ color: PINK, label: 'Explicit' }, { color: CYAN, label: 'Clean' }];
      case 'video': return [{ color: PINK, label: 'Has Video' }, { color: CYAN, label: 'No Video' }];
      case 'published': return [{ color: CYAN, label: 'Published' }, { color: PINK, label: 'Removed' }];
      case 'major_minor': return [{ color: CYAN, label: 'Minor' }, { color: PINK, label: 'Major' }];
      case 'category': return [
        { color: PINK, label: 'Love (+)' },
        { color: '#C0204A', label: 'Love (-)' },
        { color: CYAN, label: 'Social' },
        { color: '#00B8C4', label: 'Narrative' },
        { color: '#8B5CF6', label: 'Philosophical' },
        { color: '#06B6D4', label: 'Reflective' },
      ];
      default: return [];
    }
  };

  return (
    <div className="heatmap-view">
      <div className="hm-controls">
        <div className="hm-ctrl">
          <label>Color</label>
          <select value={colorMode} onChange={(e) => setColorMode(e.target.value)}>
            {COLOR_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>
        <div className="hm-ctrl">
          <label>Brightness</label>
          <select value={intensity} onChange={(e) => setIntensity(e.target.value)}>
            {INTENSITY_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>
        <div className="hm-ctrl">
          <label>Order</label>
          <select value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
            {SORT_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="hm-legend">
        {getLegend().map((item) => (
          <span key={item.label} className="hm-legend-item">
            <span className="hm-legend-dot" style={{ background: item.color, boxShadow: `0 0 5px ${item.color}80` }} />
            {item.label}
          </span>
        ))}
        <span className="hm-count">{sorted.length} songs</span>
      </div>

      <div className="hm-year-slider">
        <span className="hm-year-label">{minYear}</span>
        <input
          type="range"
          min={minYear}
          max={maxYear}
          value={currentMax}
          onChange={(e) => setYearRange(Number(e.target.value))}
          className="hm-slider"
        />
        <span className="hm-year-label hm-year-current">{currentMax}</span>
      </div>

      <div
        className="hm-grid"
        ref={gridRef}
        style={{ gridTemplateColumns: `repeat(${cols}, var(--hm-cell-size))` }}
        onMouseLeave={() => setTooltip(null)}
      >
        {sorted.map((song) => {
          const isMatch = matchedIds.has(song.song_id);
          const color = getColor(song, isMatch);
          const opacity = getOpacity(song, isMatch);

          return (
            <button
              key={song.song_id}
              className={`hm-cell ${isMatch ? 'on' : 'off'}`}
              style={{
                '--cell-color': color,
                backgroundColor: color,
                opacity,
                boxShadow: getGlow(song, isMatch),
              }}
              onClick={() => onSongSelect(song)}
              onMouseEnter={(e) => handleMouseEnter(e, song)}
              onMouseLeave={() => setTooltip(null)}
            />
          );
        })}

        {tooltip && (
          <div
            className="hm-tooltip"
            style={{ left: tooltip.x, top: tooltip.y }}
          >
            <span className="hm-tt-title">{String(tooltip.song.title)}</span>
            <span className="hm-tt-sub">
              {tooltip.song.year}
              {tooltip.song.release ? ` -- ${String(tooltip.song.release.title)}` : ''}
            </span>
            <span className="hm-tt-sub">
              {tooltip.song.key || ''}
              {tooltip.song.bpm ? ` / ${tooltip.song.bpm} BPM` : ''}
              {tooltip.song.stats?.word_count ? ` / ${tooltip.song.stats.word_count}w` : ''}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

function getVal(song, metric) {
  switch (metric) {
    case 'word_count': return song.stats?.word_count || 0;
    case 'duration': return song.duration_sec || 0;
    case 'bpm': return song.bpm || 0;
    default: return 1;
  }
}
