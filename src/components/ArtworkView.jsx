import { useState, useMemo } from 'react';
import './ArtworkView.css';

const ART_TYPE_LABELS = {
  rendered: 'Rendered',
  composited: 'Composited',
  still: 'Still',
  graphic_design: 'Graphic Design',
  illustration: 'Illustration',
};

export default function ArtworkView({ db, onPersonSelect }) {
  const [filterType, setFilterType] = useState('all');
  const [filterCredit, setFilterCredit] = useState('all');
  const [selected, setSelected] = useState(null);

  const artTypes = useMemo(() => {
    return [...new Set(db.artwork.map((a) => a.art_type_name).filter(Boolean))];
  }, [db.artwork]);

  const creditPeople = useMemo(() => {
    const map = {};
    db.artwork.forEach((a) => {
      (a.credits || []).forEach((c) => {
        if (c.person) map[c.person.person_id] = c.person.name;
      });
    });
    return Object.entries(map).map(([id, name]) => ({ id, name }));
  }, [db.artwork]);

  const filtered = useMemo(() => {
    return db.artwork.filter((a) => {
      if (filterType !== 'all' && a.art_type_name !== filterType) return false;
      if (filterCredit !== 'all') {
        const hasCredit = (a.credits || []).some((c) => c.person?.person_id === filterCredit);
        if (!hasCredit) return false;
      }
      return true;
    });
  }, [db.artwork, filterType, filterCredit]);

  const typeBreakdown = useMemo(() => {
    const counts = {};
    db.artwork.forEach((a) => {
      const t = a.art_type_name || 'unknown';
      counts[t] = (counts[t] || 0) + 1;
    });
    return counts;
  }, [db.artwork]);

  return (
    <div className="artwork-view">
      <div className="artwork-header">
        <h3 className="artwork-title">Artwork</h3>
        <span className="artwork-count">{filtered.length} of {db.artwork.length}</span>
      </div>

      <div className="artwork-filters">
        <div className="artwork-type-chips">
          <button
            className={`art-chip ${filterType === 'all' ? 'active' : ''}`}
            onClick={() => setFilterType('all')}
          >
            All ({db.artwork.length})
          </button>
          {artTypes.map((type) => (
            <button
              key={type}
              className={`art-chip ${filterType === type ? 'active' : ''}`}
              onClick={() => setFilterType(type)}
            >
              {ART_TYPE_LABELS[type] || type} ({typeBreakdown[type] || 0})
            </button>
          ))}
        </div>
        {creditPeople.length > 1 && (
          <select
            className="artwork-credit-select"
            value={filterCredit}
            onChange={(e) => setFilterCredit(e.target.value)}
          >
            <option value="all">All artists</option>
            {creditPeople.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        )}
      </div>

      <div className="artwork-grid">
        {filtered.map((art) => (
          <button
            key={art.art_id}
            className={`artwork-card ${selected?.art_id === art.art_id ? 'selected' : ''}`}
            onClick={() => setSelected(selected?.art_id === art.art_id ? null : art)}
          >
            {art.image_url ? (
              <img
                src={art.image_url}
                alt={art.description || 'Cover art'}
                className="artwork-img"
                loading="lazy"
              />
            ) : (
              <div className="artwork-placeholder">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" opacity="0.3">
                  <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                  <circle cx="8.5" cy="8.5" r="1.5" />
                  <polyline points="21 15 16 10 5 21" />
                </svg>
              </div>
            )}
            <div className="artwork-info">
              <span className="artwork-release-name">
                {art.release?.title || art.description || 'Untitled'}
              </span>
              <span className="artwork-type-label">
                {ART_TYPE_LABELS[art.art_type_name] || art.art_type_name || ''}
              </span>
              {art.release?.year && (
                <span className="artwork-year">{art.release.year}</span>
              )}
            </div>
          </button>
        ))}
      </div>

      {selected && (
        <div className="artwork-overlay" onClick={() => setSelected(null)}>
          <div className="artwork-detail-panel" onClick={(e) => e.stopPropagation()}>
            <button className="artwork-detail-close" onClick={() => setSelected(null)}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
            <div className="artwork-detail-img-wrap">
              {selected.image_url ? (
                <img
                  src={selected.image_url}
                  alt={selected.description}
                  className="artwork-detail-img"
                />
              ) : (
                <div className="artwork-detail-placeholder">No image available</div>
              )}
            </div>
            <div className="artwork-detail-info">
              <h4>{selected.release?.title || selected.description}</h4>
              {selected.release && (
                <span className="ad-release-type">
                  {selected.release.release_type} / {selected.release.year}
                </span>
              )}
              <span className="ad-type">
                {ART_TYPE_LABELS[selected.art_type_name] || selected.art_type_name}
              </span>
              {selected.description && (
                <span className="ad-desc">{selected.description}</span>
              )}
              {(selected.credits || []).length > 0 && (
                <div className="ad-credits">
                  <span className="ad-credits-label">Credits</span>
                  {selected.credits.map((c, i) => (
                    <button
                      key={i}
                      className="ad-credit-person"
                      onClick={() => c.person && onPersonSelect(c.person.person_id)}
                    >
                      <span className="ad-credit-role">
                        {(c.role?.name || '').replace(/_/g, ' ')}
                      </span>
                      <span className="ad-credit-name">{c.person?.name || ''}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
