import { useMemo } from 'react';
import { getPersonStats } from '../utils/analytics';
import { CATEGORY_COLORS } from '../utils/constants';
import { formatDuration } from '../utils/helpers';
import './PersonView.css';

export default function PersonView({ personId, db, onClose, onSongSelect }) {
  const stats = useMemo(() => getPersonStats(db, personId), [db, personId]);

  if (!stats.person) {
    return (
      <div className="modal-overlay" onClick={onClose}>
        <div className="modal-box person-modal" onClick={(e) => e.stopPropagation()}>
          <div className="modal-header">
            <h3>Person not found</h3>
            <button className="modal-close" onClick={onClose}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    );
  }

  const enrichedSongs = stats.songs.map((s) => {
    return db.songs.find((es) => es.song_id === s.song_id) || s;
  });

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box person-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div>
            <h3>{stats.person.name}</h3>
            <span className="person-summary">
              {stats.totalSongs} song{stats.totalSongs !== 1 ? 's' : ''} | {stats.totalCredits} credit{stats.totalCredits !== 1 ? 's' : ''}
            </span>
          </div>
          <button className="modal-close" onClick={onClose}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <div className="modal-body">
          <div className="person-roles">
            <h4 className="section-label">Roles</h4>
            <div className="role-bars">
              {Object.entries(stats.roleBreakdown)
                .sort((a, b) => b[1].length - a[1].length)
                .map(([role, songIds]) => (
                  <div key={role} className="role-bar-row">
                    <span className="role-bar-label">{formatRoleName(role)}</span>
                    <div className="role-bar-track">
                      <div
                        className="role-bar-fill"
                        style={{
                          width: `${(songIds.length / stats.totalSongs) * 100}%`,
                        }}
                      />
                    </div>
                    <span className="role-bar-count">{songIds.length}</span>
                  </div>
                ))}
            </div>
          </div>

          <div className="person-songs">
            <h4 className="section-label">Songs</h4>
            <div className="person-song-list">
              {enrichedSongs
                .sort((a, b) => (a.year || 0) - (b.year || 0))
                .map((song) => {
                  const roles = stats.credits
                    .filter((c) => c.song_id === song.song_id)
                    .map((c) => {
                      const role = db.indexes.roleIndex[c.credit_role_id];
                      return role ? role.name : c.credit_role_id;
                    });
                  const catColor = CATEGORY_COLORS[song.category_name]?.color || '#555';

                  return (
                    <button
                      key={song.song_id}
                      className="person-song-item"
                      onClick={() => onSongSelect(song)}
                    >
                      <span className="person-song-dot" style={{ background: catColor }} />
                      <span className="person-song-title">{song.title}</span>
                      <span className="person-song-year">{song.year || ''}</span>
                      <span className="person-song-roles">
                        {roles.map(formatRoleName).join(', ')}
                      </span>
                      {song.duration_sec > 0 && (
                        <span className="person-song-duration">
                          {formatDuration(song.duration_sec)}
                        </span>
                      )}
                    </button>
                  );
                })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function formatRoleName(role) {
  if (!role) return '';
  return role.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}
