import { useMemo } from 'react';
import { CATEGORY_COLORS } from '../utils/constants';
import { formatDuration, getKeyQuality } from '../utils/helpers';
import { computeWordStats } from '../utils/analytics';
import { jsPDF } from 'jspdf';
import './SongDetail.css';

export default function SongDetail({ song, db, onClose, onPersonSelect }) {
  const wordStats = useMemo(() => {
    if (song.stats?.word_count > 0) {
      return {
        wordCount: song.stats.word_count,
        uniqueWordCount: song.stats.unique_word_count,
        topWords: song.stats.top_words_json || [],
      };
    }
    return computeWordStats(song.lyrics_text);
  }, [song]);

  const categoryColor = CATEGORY_COLORS[song.category_name]?.color || '#555';

  const creditsByRole = useMemo(() => {
    const map = {};
    (song.credits || []).forEach((c) => {
      const roleName = c.role?.name || c.credit_role_id;
      if (!map[roleName]) map[roleName] = [];
      map[roleName].push(c);
    });
    return map;
  }, [song.credits]);

  const handleDownloadPDF = () => {
    const doc = new jsPDF();
    const margin = 20;
    const pageWidth = doc.internal.pageSize.getWidth() - margin * 2;
    let y = margin;

    doc.setFontSize(18);
    doc.text(song.title, margin, y);
    y += 10;

    doc.setFontSize(10);
    doc.setTextColor(120);
    const meta = [];
    if (song.year) meta.push(String(song.year));
    if (song.release?.title) meta.push(song.release.title);
    if (song.category_name) meta.push(song.category_name);
    if (song.key) meta.push(song.key);
    if (song.bpm) meta.push(`${song.bpm} BPM`);
    if (song.duration_sec) meta.push(formatDuration(song.duration_sec));
    doc.text(meta.join('  |  '), margin, y);
    y += 8;

    const credits = (song.credits || []).map((c) => {
      const role = c.role?.name || '';
      const name = c.person?.name || '';
      return `${formatRoleName(role)}: ${name}`;
    });
    if (credits.length) {
      doc.text(credits.join('  |  '), margin, y);
      y += 10;
    }

    doc.setDrawColor(200);
    doc.line(margin, y, margin + pageWidth, y);
    y += 8;

    doc.setTextColor(40);
    doc.setFontSize(11);
    if (song.lyrics_text) {
      const lines = doc.splitTextToSize(song.lyrics_text, pageWidth);
      lines.forEach((line) => {
        if (y > doc.internal.pageSize.getHeight() - margin) {
          doc.addPage();
          y = margin;
        }
        doc.text(line, margin, y);
        y += 5.5;
      });
    } else {
      doc.text('(No lyrics available)', margin, y);
    }

    doc.save(`${song.title.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box detail-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="detail-header-info">
            <h3>{song.title}</h3>
            <div className="detail-meta-row">
              {song.year > 0 && <span className="detail-year">{song.year}</span>}
              {song.release && (
                <span className="detail-release">
                  {song.release.title}
                  {song.release.release_type && (
                    <span className="detail-release-type"> ({song.release.release_type})</span>
                  )}
                </span>
              )}
              {song.category_name && (
                <span className="detail-category" style={{ color: categoryColor }}>
                  {song.category_name}
                </span>
              )}
            </div>
          </div>
          <div className="detail-header-actions">
            <button className="btn-secondary" onClick={handleDownloadPDF}>PDF</button>
            <button className="modal-close" onClick={onClose}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>
        </div>

        <div className="modal-body detail-body">
          {song.cover_art?.image_url && (
            <div className="detail-cover-wrap">
              <img
                src={song.cover_art.image_url}
                alt={`Cover art for ${song.release?.title || song.title}`}
                className="detail-cover-img"
              />
              <div className="detail-cover-meta">
                {song.cover_art.art_type_name && (
                  <span className="cover-type">{song.cover_art.art_type_name.replace(/_/g, ' ')}</span>
                )}
                {song.cover_art.credits?.map((c, i) => (
                  <span key={i} className="cover-credit">
                    {c.role?.name?.replace(/_/g, ' ')} : {c.person?.name || ''}
                  </span>
                ))}
              </div>
            </div>
          )}
          <div className="detail-columns">
            <div className="detail-left">
              <div className="detail-properties">
                <PropRow label="Key" value={song.key || '--'} />
                <PropRow label="BPM" value={song.bpm || '--'} />
                <PropRow label="Duration" value={song.duration_sec ? formatDuration(song.duration_sec) : '--'} />
                <PropRow label="Perspective" value={song.perspective_name || '--'} />
                <PropRow label="Title Length" value={`${song.title?.length || 0} chars`} />
                <PropRow label="Words" value={wordStats.wordCount || '--'} />
                <PropRow label="Unique Words" value={wordStats.uniqueWordCount || '--'} />
                <PropRow
                  label="Published"
                  value={song.is_published ? 'Yes' : 'No'}
                  indicator={song.is_published ? 'green' : 'red'}
                />
                <PropRow
                  label="Explicit"
                  value={song.is_explicit ? 'Yes' : 'No'}
                  indicator={song.is_explicit ? 'red' : 'green'}
                />
                <PropRow
                  label="Video"
                  value={song.has_video ? 'Yes' : 'No'}
                  indicator={song.has_video ? 'green' : 'dim'}
                />
                <PropRow
                  label="Key Type"
                  value={getKeyQuality(song.key) === 'minor' ? 'Minor' : 'Major'}
                />
              </div>

              <div className="detail-credits">
                <h4 className="detail-section-title">Credits</h4>
                {Object.entries(creditsByRole).map(([role, credits]) => (
                  <div key={role} className="credit-group">
                    <span className="credit-role">{formatRoleName(role)}</span>
                    <div className="credit-names">
                      {credits.map((c, i) => (
                        <button
                          key={i}
                          className="credit-name"
                          onClick={() => onPersonSelect(c.person_id)}
                        >
                          {c.person?.name || c.person_id}
                          {c.credit_detail && (
                            <span className="credit-detail"> ({c.credit_detail})</span>
                          )}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
                {Object.keys(creditsByRole).length === 0 && (
                  <p className="no-data">No credits available</p>
                )}
              </div>

              {wordStats.topWords.length > 0 && (
                <div className="detail-top-words">
                  <h4 className="detail-section-title">Top Words</h4>
                  <div className="top-words-list">
                    {wordStats.topWords.slice(0, 10).map((tw, i) => (
                      <span key={i} className="top-word-item">
                        <span className="top-word-rank">{i + 1}</span>
                        <span className="top-word-text">{tw.word}</span>
                        <span className="top-word-count">{tw.count}</span>
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="detail-right">
              <h4 className="detail-section-title">Lyrics</h4>
              {song.lyrics_text ? (
                <pre className="detail-lyrics">{song.lyrics_text}</pre>
              ) : (
                <p className="no-data">No lyrics available</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function PropRow({ label, value, indicator }) {
  return (
    <div className="prop-row">
      <span className="prop-label">{label}</span>
      <span className="prop-value">
        {indicator && <span className={`prop-indicator ${indicator}`} />}
        {value}
      </span>
    </div>
  );
}

function formatRoleName(role) {
  if (!role) return '';
  return role
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}
