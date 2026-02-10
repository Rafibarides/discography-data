import { downloadText } from '../utils/helpers';
import './ExportPanel.css';

export default function ExportPanel({ db, filteredSongs, onClose }) {
  const exportAllLyricsJSON = () => {
    const data = filteredSongs.map((s) => ({
      title: s.title,
      year: s.year,
      release: s.release?.title || '',
      category: s.category_name,
      lyrics: s.lyrics_text || '',
    }));
    downloadText(JSON.stringify(data, null, 2), 'discography_lyrics.json', 'application/json');
  };

  const exportAllLyricsTXT = () => {
    const lines = filteredSongs.map((s) => {
      const header = `=== ${s.title} (${s.year}) ===`;
      const release = s.release ? `Release: ${s.release.title}` : '';
      const lyrics = s.lyrics_text || '(No lyrics available)';
      return [header, release, '', lyrics, '', ''].join('\n');
    });
    downloadText(lines.join('\n'), 'discography_lyrics.txt');
  };

  const exportDatabaseJSON = () => {
    const data = {
      songs: db.songs.map((s) => ({
        song_id: s.song_id,
        title: s.title,
        year: s.year,
        release: s.release?.title,
        release_type: s.release?.release_type,
        key: s.key,
        bpm: s.bpm,
        duration_sec: s.duration_sec,
        is_explicit: s.is_explicit,
        has_video: s.has_video,
        is_published: s.is_published,
        category: s.category_name,
        perspective: s.perspective_name,
        word_count: s.stats?.word_count,
        unique_word_count: s.stats?.unique_word_count,
        lyrics: s.lyrics_text || '',
        credits: (s.credits || []).map((c) => ({
          person: c.person?.name,
          role: c.role?.name,
          detail: c.credit_detail,
        })),
      })),
      releases: db.releases,
      people: db.people,
    };
    downloadText(JSON.stringify(data, null, 2), 'discography_full.json', 'application/json');
  };

  const exportCSV = () => {
    const headers = [
      'Title', 'Year', 'Release', 'Release Type', 'Key', 'BPM',
      'Duration (sec)', 'Category', 'Perspective', 'Explicit',
      'Has Video', 'Published', 'Word Count', 'Featured Vocalist',
      'Mixed By', 'Mastered By',
    ];

    const rows = filteredSongs.map((s) => {
      const featured = (s.credits || [])
        .filter((c) => c.role?.name === 'featured_vocals')
        .map((c) => c.person?.name)
        .join('; ');
      const mixer = (s.credits || [])
        .filter((c) => c.role?.name === 'mixing')
        .map((c) => c.person?.name)
        .join('; ');
      const master = (s.credits || [])
        .filter((c) => c.role?.name === 'mastering')
        .map((c) => c.person?.name)
        .join('; ');

      return [
        s.title, s.year, s.release?.title || '', s.release?.release_type || '',
        s.key || '', s.bpm || '', s.duration_sec || '',
        s.category_name || '', s.perspective_name || '',
        s.is_explicit ? 'Yes' : 'No', s.has_video ? 'Yes' : 'No',
        s.is_published ? 'Yes' : 'No', s.stats?.word_count || '',
        featured, mixer, master,
      ];
    });

    const csvContent = [headers, ...rows]
      .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      .join('\n');

    downloadText(csvContent, 'discography.csv', 'text/csv');
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box export-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Export</h3>
          <button className="modal-close" onClick={onClose}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <div className="modal-body">
          <p className="export-note">
            Exporting {filteredSongs.length} song{filteredSongs.length !== 1 ? 's' : ''} (based on current filters)
          </p>

          <div className="export-options">
            <ExportButton
              title="Lyrics as JSON"
              description="All lyrics with metadata in JSON format"
              onClick={exportAllLyricsJSON}
            />
            <ExportButton
              title="Lyrics as TXT"
              description="All lyrics in plain text format"
              onClick={exportAllLyricsTXT}
            />
            <ExportButton
              title="Full Database JSON"
              description="Complete data export including credits and releases"
              onClick={exportDatabaseJSON}
            />
            <ExportButton
              title="Spreadsheet CSV"
              description="Song data as CSV for spreadsheet import"
              onClick={exportCSV}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function ExportButton({ title, description, onClick }) {
  return (
    <button className="export-btn" onClick={onClick}>
      <div className="export-btn-content">
        <span className="export-btn-title">{title}</span>
        <span className="export-btn-desc">{description}</span>
      </div>
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
        <polyline points="7 10 12 15 17 10" />
        <line x1="12" y1="15" x2="12" y2="3" />
      </svg>
    </button>
  );
}
