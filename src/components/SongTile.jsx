import { formatDuration } from '../utils/helpers';
import './SongTile.css';

export default function SongTile({ song, color, size, onClick }) {
  const baseSize = 64;
  const tileSize = Math.round(baseSize * size);
  const coverUrl = song.cover_art?.image_url;

  return (
    <button
      className={`song-tile ${coverUrl ? 'has-art' : ''}`}
      style={{
        width: tileSize,
        height: tileSize,
        backgroundColor: coverUrl ? undefined : `${color.bg}18`,
        borderColor: `${color.bg}50`,
        boxShadow: color.glow !== 'none' ? color.glow : undefined,
        backgroundImage: coverUrl ? `url(${coverUrl})` : undefined,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }}
      onClick={onClick}
      title={`${song.title} (${song.year})`}
    >
      {coverUrl && (
        <span
          className="tile-overlay"
          style={{ backgroundColor: `${color.bg}CC` }}
        />
      )}
      <span className="tile-indicator" style={{ backgroundColor: color.bg }} />
      <span className="tile-title">{song.title}</span>
      {song.duration_sec > 0 && (
        <span className="tile-duration">{formatDuration(song.duration_sec)}</span>
      )}
      {song.year > 0 && <span className="tile-year">{song.year}</span>}
    </button>
  );
}
