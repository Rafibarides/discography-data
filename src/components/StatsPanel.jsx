import { useMemo, useState } from 'react';
import { CATEGORY_COLORS } from '../utils/constants';
import { getTopWordsAcrossAll, getWordFrequencyMap } from '../utils/analytics';
import { formatDuration, formatLongDuration } from '../utils/helpers';
import './StatsPanel.css';

export default function StatsPanel({ db, filteredSongs, onSongSelect, onPersonSelect }) {
  const stats = useMemo(() => {
    const songs = filteredSongs;
    const total = songs.length;
    if (!total) return null;

    const withLyrics = songs.filter((s) => s.lyrics_text && s.lyrics_text.trim());
    const explicit = songs.filter((s) => s.is_explicit);
    const hasVideo = songs.filter((s) => s.has_video);
    const published = songs.filter((s) => s.is_published);
    const hasFeatured = songs.filter((s) => s.stats?.featured_vocalist_count > 0 || s.stats?.has_featured_vocalist);
    const noFeatured = songs.filter((s) => !s.stats?.featured_vocalist_count && !s.stats?.has_featured_vocalist);

    const totalWords = songs.reduce((sum, s) => sum + (s.stats?.word_count || 0), 0);
    const avgWords = withLyrics.length ? Math.round(totalWords / withLyrics.length) : 0;

    const totalDuration = songs.reduce((sum, s) => sum + (s.duration_sec || 0), 0);
    const avgDuration = total ? Math.round(totalDuration / total) : 0;

    const bpmSongs = songs.filter((s) => s.bpm > 0);
    const avgBpm = bpmSongs.length ? Math.round(bpmSongs.reduce((s, b) => s + b.bpm, 0) / bpmSongs.length) : 0;

    const categoryBreakdown = {};
    songs.forEach((s) => {
      const cat = s.category_name || 'Unknown';
      categoryBreakdown[cat] = (categoryBreakdown[cat] || 0) + 1;
    });

    const perspectiveBreakdown = {};
    songs.forEach((s) => {
      const p = s.perspective_name || 'Unknown';
      perspectiveBreakdown[p] = (perspectiveBreakdown[p] || 0) + 1;
    });

    const keyBreakdown = {};
    songs.forEach((s) => {
      if (s.key) keyBreakdown[s.key] = (keyBreakdown[s.key] || 0) + 1;
    });

    const majorCount = songs.filter((s) => s.key_quality === 'major').length;
    const minorCount = songs.filter((s) => s.key_quality === 'minor').length;

    const sortedKeys = Object.entries(keyBreakdown).sort((a, b) => b[1] - a[1]);
    const mostUsedKey = sortedKeys.length > 0 ? { name: sortedKeys[0][0], count: sortedKeys[0][1] } : null;

    const bpmBreakdown = {};
    bpmSongs.forEach((s) => {
      bpmBreakdown[s.bpm] = (bpmBreakdown[s.bpm] || 0) + 1;
    });
    const sortedBpms = Object.entries(bpmBreakdown).sort((a, b) => b[1] - a[1]);
    const mostUsedBpm = sortedBpms.length > 0 ? { value: sortedBpms[0][0], count: sortedBpms[0][1] } : null;

    const vocalistCredits = {};
    const mixerCredits = {};
    const masterCredits = {};

    db.songCredits.forEach((c) => {
      const role = db.indexes.roleIndex[c.credit_role_id];
      if (!role) return;
      const person = db.indexes.personIndex[c.person_id];
      if (!person) return;
      const pid = c.person_id;

      if (role.name === 'featured_vocals') {
        vocalistCredits[pid] = (vocalistCredits[pid] || { name: person.name, count: 0 });
        vocalistCredits[pid].count++;
      }
      if (role.name === 'mixing') {
        mixerCredits[pid] = (mixerCredits[pid] || { name: person.name, count: 0 });
        mixerCredits[pid].count++;
      }
      if (role.name === 'mastering') {
        masterCredits[pid] = (masterCredits[pid] || { name: person.name, count: 0 });
        masterCredits[pid].count++;
      }
    });

    const topVocalists = Object.entries(vocalistCredits)
      .map(([id, v]) => ({ id, ...v }))
      .sort((a, b) => b.count - a.count);

    const topMixers = Object.entries(mixerCredits)
      .map(([id, v]) => ({ id, ...v }))
      .sort((a, b) => b.count - a.count);

    const topMasters = Object.entries(masterCredits)
      .map(([id, v]) => ({ id, ...v }))
      .sort((a, b) => b.count - a.count);

    const longestSong = [...songs].sort((a, b) => (b.stats?.word_count || 0) - (a.stats?.word_count || 0))[0];
    const shortestSong = [...songs].filter((s) => s.stats?.word_count > 0).sort((a, b) => (a.stats?.word_count || 0) - (b.stats?.word_count || 0))[0];
    const longestDuration = [...songs].sort((a, b) => (b.duration_sec || 0) - (a.duration_sec || 0))[0];
    const shortestDuration = [...songs].filter((s) => s.duration_sec > 0).sort((a, b) => (a.duration_sec || 0) - (b.duration_sec || 0))[0];

    return {
      total, explicit: explicit.length, hasVideo: hasVideo.length,
      published: published.length, hasFeatured: hasFeatured.length,
      noFeatured: noFeatured.length,
      totalWords, avgWords, totalDuration, avgDuration, avgBpm,
      categoryBreakdown, perspectiveBreakdown, keyBreakdown,
      majorCount, minorCount, mostUsedKey, mostUsedBpm,
      topVocalists, topMixers, topMasters,
      longestSong, shortestSong, longestDuration, shortestDuration,
    };
  }, [filteredSongs, db]);

  const { topWords, leastUsedWords, longestWords } = useMemo(() => {
    const songsWithLyrics = filteredSongs.filter((s) => s.lyrics_text);
    const relevantLyrics = songsWithLyrics.map((s) => ({ song_id: s.song_id, lyrics_text: s.lyrics_text }));

    const top = getTopWordsAcrossAll(relevantLyrics);
    const freq = getWordFrequencyMap(relevantLyrics);
    const entries = Object.entries(freq);

    // Build word -> songs map for lookups
    const wordToSongs = {};
    songsWithLyrics.forEach((s) => {
      const words = s.lyrics_text
        .toLowerCase()
        .replace(/[^a-z'\s-]/g, '')
        .split(/\s+/)
        .filter((w) => w.length > 1);
      const unique = new Set(words);
      unique.forEach((w) => {
        if (!wordToSongs[w]) wordToSongs[w] = [];
        wordToSongs[w].push(s);
      });
    });

    // Least used: find the minimum count and collect all words tied at that count
    const sorted = [...entries].sort((a, b) => a[1] - b[1]);
    const least = [];
    const minCount = sorted.length > 0 ? sorted[0][1] : null;
    for (const [word, count] of sorted) {
      if (count !== minCount) break;
      least.push({ word, count, songs: wordToSongs[word] || [] });
    }

    // Longest words: find the max length, collect ties
    const byLength = [...entries].sort((a, b) => b[0].length - a[0].length);
    const longest = [];
    let lengthPositions = 0;
    let lastLength = null;
    for (const [word, count] of byLength) {
      if (word.length !== lastLength) {
        if (lengthPositions >= 1) break;
        lengthPositions++;
        lastLength = word.length;
      }
      longest.push({ word, count, length: word.length, songs: wordToSongs[word] || [] });
    }

    return { topWords: top, leastUsedWords: least, longestWords: longest };
  }, [filteredSongs]);

  if (!stats) {
    return <div className="stats-empty">No data to display</div>;
  }

  return (
    <div className="stats-panel">
      <div className="stats-grid">
        <StatCard label="Total Songs" value={stats.total} />
        <StatCard label="Total Words" value={stats.totalWords.toLocaleString()} />
        <StatCard label="Avg Words/Song" value={stats.avgWords} />
        <StatCard label="Total Runtime" value={formatLongDuration(stats.totalDuration)} />
        <StatCard label="Avg Duration" value={formatDuration(stats.avgDuration)} />
        <StatCard label="Avg BPM" value={stats.avgBpm} />
        <StatCard label="Explicit" value={stats.explicit} sub={`${pct(stats.explicit, stats.total)}%`} />
        <StatCard label="Has Video" value={stats.hasVideo} sub={`${pct(stats.hasVideo, stats.total)}%`} />
        <StatCard label="Published" value={stats.published} sub={`${pct(stats.published, stats.total)}%`} />
        <StatCard label="Featured Vocals" value={stats.hasFeatured} sub={`${pct(stats.hasFeatured, stats.total)}%`} />
        <StatCard label="No Featured" value={stats.noFeatured} sub={`${pct(stats.noFeatured, stats.total)}%`} />
        <StatCard label="Major / Minor" value={`${stats.majorCount} / ${stats.minorCount}`} />
        {stats.mostUsedKey && (
          <StatCard label="Most Used Key" value={stats.mostUsedKey.name} sub={`${stats.mostUsedKey.count} songs`} />
        )}
        {stats.mostUsedBpm && (
          <StatCard label="Most Used BPM" value={stats.mostUsedBpm.value} sub={`${stats.mostUsedBpm.count} songs`} />
        )}
      </div>

      <div className="stats-sections">
        <div className="stats-section">
          <h4 className="stats-section-title">Categories</h4>
          <BarChart data={stats.categoryBreakdown} total={stats.total} colorMap={CATEGORY_COLORS} />
        </div>

        <div className="stats-section">
          <h4 className="stats-section-title">Perspectives</h4>
          <BarChart data={stats.perspectiveBreakdown} total={stats.total} />
        </div>

        <div className="stats-section">
          <h4 className="stats-section-title">Featured Vocalists</h4>
          <PeopleRank list={stats.topVocalists} onSelect={onPersonSelect} />
        </div>

        <div className="stats-section">
          <h4 className="stats-section-title">Mixing Engineers</h4>
          <PeopleRank list={stats.topMixers} onSelect={onPersonSelect} />
        </div>

        <div className="stats-section">
          <h4 className="stats-section-title">Mastering Engineers</h4>
          <PeopleRank list={stats.topMasters} onSelect={onPersonSelect} />
        </div>

        <div className="stats-section">
          <h4 className="stats-section-title">Top Words (excluding common)</h4>
          <div className="top-words-grid">
            {topWords.slice(0, 15).map((tw, i) => (
              <div key={tw.word} className="top-word-row">
                <span className="tw-rank">{i + 1}</span>
                <span className="tw-word">{tw.word}</span>
                <div className="tw-bar-track">
                  <div
                    className="tw-bar-fill"
                    style={{ width: `${(tw.count / topWords[0].count) * 100}%` }}
                  />
                </div>
                <span className="tw-count">{tw.count}</span>
              </div>
            ))}
          </div>
        </div>

        {leastUsedWords.length > 0 && (
          <WordPreviewSection
            title="Least Used Words"
            words={leastUsedWords}
            variant="least"
            subKey="count"
            subLabel=""
            onSongSelect={onSongSelect}
          />
        )}

        {longestWords.length > 0 && (
          <WordPreviewSection
            title={`Longest Word${longestWords.length > 1 ? 's' : ''}`}
            words={longestWords}
            variant="longest"
            subKey="length"
            subLabel=" chars"
            onSongSelect={onSongSelect}
          />
        )}

        <div className="stats-section">
          <h4 className="stats-section-title">Extremes</h4>
          <div className="extremes-grid">
            {stats.longestSong && (
              <ExtremeCard
                label="Most Words"
                song={stats.longestSong}
                value={`${stats.longestSong.stats?.word_count} words`}
                onClick={() => onSongSelect(stats.longestSong)}
              />
            )}
            {stats.shortestSong && (
              <ExtremeCard
                label="Fewest Words"
                song={stats.shortestSong}
                value={`${stats.shortestSong.stats?.word_count} words`}
                onClick={() => onSongSelect(stats.shortestSong)}
              />
            )}
            {stats.longestDuration && (
              <ExtremeCard
                label="Longest"
                song={stats.longestDuration}
                value={formatDuration(stats.longestDuration.duration_sec)}
                onClick={() => onSongSelect(stats.longestDuration)}
              />
            )}
            {stats.shortestDuration && (
              <ExtremeCard
                label="Shortest"
                song={stats.shortestDuration}
                value={formatDuration(stats.shortestDuration.duration_sec)}
                onClick={() => onSongSelect(stats.shortestDuration)}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, sub }) {
  return (
    <div className="stat-card">
      <span className="stat-value">{value}</span>
      <span className="stat-label">{label}</span>
      {sub && <span className="stat-sub">{sub}</span>}
    </div>
  );
}

function BarChart({ data, total, colorMap }) {
  const sorted = Object.entries(data).sort((a, b) => b[1] - a[1]);
  return (
    <div className="bar-chart">
      {sorted.map(([name, count]) => (
        <div key={name} className="bar-row">
          <span className="bar-label">{name}</span>
          <div className="bar-track">
            <div
              className="bar-fill"
              style={{
                width: `${(count / total) * 100}%`,
                background: colorMap?.[name]?.color || 'var(--accent-blue)',
              }}
            />
          </div>
          <span className="bar-count">{count}</span>
          <span className="bar-pct">{pct(count, total)}%</span>
        </div>
      ))}
    </div>
  );
}

function PeopleRank({ list, onSelect }) {
  if (!list.length) return <p className="no-data-text">No data</p>;
  const max = list[0].count;
  return (
    <div className="people-rank">
      {list.map((p) => (
        <button key={p.id} className="people-rank-row" onClick={() => onSelect(p.id)}>
          <span className="pr-name">{p.name}</span>
          <div className="pr-bar-track">
            <div className="pr-bar-fill" style={{ width: `${(p.count / max) * 100}%` }} />
          </div>
          <span className="pr-count">{p.count}</span>
        </button>
      ))}
    </div>
  );
}

function ExtremeCard({ label, song, value, onClick }) {
  return (
    <button className="extreme-card" onClick={onClick}>
      <span className="extreme-label">{label}</span>
      <span className="extreme-title">{song.title}</span>
      <span className="extreme-value">{value}</span>
    </button>
  );
}

function WordPreviewSection({ title, words, variant, subKey, subLabel, onSongSelect }) {
  const [modalOpen, setModalOpen] = useState(false);
  const preview = words.slice(0, 6);
  const hasMore = words.length > 6;

  return (
    <div className="stats-section">
      <h4 className="stats-section-title">{title} ({words.length})</h4>
      <div className="word-tags">
        {preview.map((tw) => (
          <WordTag
            key={tw.word}
            tw={tw}
            variant={variant}
            subKey={subKey}
            subLabel={subLabel}
            onSongSelect={onSongSelect}
          />
        ))}
        {hasMore && (
          <button className="word-tag-more" onClick={() => setModalOpen(true)}>
            +{words.length - 6} more
          </button>
        )}
      </div>
      {modalOpen && (
        <div className="modal-overlay" onClick={() => setModalOpen(false)}>
          <div className="modal-box word-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{title}</h3>
              <button className="modal-close" onClick={() => setModalOpen(false)}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
            <div className="modal-body word-modal-body">
              <div className="word-tags">
                {words.map((tw) => (
                  <WordTag
                    key={tw.word}
                    tw={tw}
                    variant={variant}
                    subKey={subKey}
                    subLabel={subLabel}
                    onSongSelect={(s) => { setModalOpen(false); onSongSelect(s); }}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function WordTag({ tw, variant, subKey, subLabel, onSongSelect }) {
  const songTitle = tw.songs?.length
    ? tw.songs.map((s) => s.title).join(', ')
    : '';
  const clickable = tw.songs?.length === 1;

  return (
    <span
      className={`word-tag ${variant} ${clickable ? 'clickable' : ''}`}
      title={songTitle}
      onClick={clickable ? () => onSongSelect(tw.songs[0]) : undefined}
    >
      <span className="word-tag-text">{tw.word}</span>
      <span className="word-tag-count">{tw[subKey]}{subLabel}</span>
    </span>
  );
}

function pct(n, total) {
  if (!total) return 0;
  return Math.round((n / total) * 100);
}
