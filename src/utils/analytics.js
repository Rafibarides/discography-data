import { STOP_WORDS } from './constants';
import { getKeyQuality } from './helpers';

export function computeWordStats(lyricsText) {
  if (!lyricsText || !lyricsText.trim()) {
    return { wordCount: 0, uniqueWordCount: 0, topWords: [] };
  }

  const words = lyricsText
    .toLowerCase()
    .replace(/[^a-z'\s-]/g, '')
    .split(/\s+/)
    .filter((w) => w.length > 1);

  const wordCount = words.length;
  const freq = {};
  words.forEach((w) => {
    if (!STOP_WORDS.has(w)) {
      freq[w] = (freq[w] || 0) + 1;
    }
  });

  const uniqueWordCount = Object.keys(freq).length;
  const topWords = Object.entries(freq)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([word, count]) => ({ word, count }));

  return { wordCount, uniqueWordCount, topWords };
}

export function searchLyrics(songs, lyrics, query) {
  if (!query || !query.trim()) return { matches: [], totalOccurrences: 0 };

  const q = query.toLowerCase().trim();
  const matches = [];
  let totalOccurrences = 0;

  songs.forEach((song) => {
    const lyricEntry = lyrics.find((l) => l.song_id === song.song_id);
    if (!lyricEntry || !lyricEntry.lyrics_text) return;

    const text = lyricEntry.lyrics_text.toLowerCase();
    const regex = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
    const allMatches = lyricEntry.lyrics_text.match(regex);

    if (allMatches && allMatches.length > 0) {
      totalOccurrences += allMatches.length;
      matches.push({
        song,
        count: allMatches.length,
        lyrics_text: lyricEntry.lyrics_text,
      });
    }
  });

  matches.sort((a, b) => b.count - a.count);
  return { matches, totalOccurrences };
}

export function getTopWordsAcrossAll(lyrics) {
  const freq = {};
  lyrics.forEach((l) => {
    if (!l.lyrics_text) return;
    const words = l.lyrics_text
      .toLowerCase()
      .replace(/[^a-z'\s-]/g, '')
      .split(/\s+/)
      .filter((w) => w.length > 1);
    words.forEach((w) => {
      if (!STOP_WORDS.has(w)) {
        freq[w] = (freq[w] || 0) + 1;
      }
    });
  });

  return Object.entries(freq)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 20)
    .map(([word, count]) => ({ word, count }));
}

export function buildDatabase(raw) {
  if (!raw) return null;

  const songs = (raw.songs || []).map((s) => ({
    ...s,
    title: String(s.title ?? ''),
    key: String(s.key ?? ''),
    is_published: parseBool(s.is_published),
    is_explicit: parseBool(s.is_explicit),
    has_video: parseBool(s.has_video),
    year: Number(s.year) || 0,
    duration_sec: Number(s.duration_sec) || 0,
    bpm: Number(s.bpm) || 0,
    title_length: String(s.title ?? '').length,
    key_quality: getKeyQuality(String(s.key ?? '')),
  }));

  const releases = (raw.releases || []).map((r) => ({
    ...r,
    title: String(r.title ?? ''),
    release_type: String(r.release_type ?? ''),
    year: Number(r.year) || 0,
    is_published: parseBool(r.is_published),
  }));

  const people = raw.people || [];
  const songCredits = raw.song_credits || [];
  const creditRoles = raw.credit_roles || [];
  const lyrics = raw.lyrics || [];
  const songStats = (raw.song_stats || []).map((s) => ({
    ...s,
    word_count: Number(s.word_count) || 0,
    unique_word_count: Number(s.unique_word_count) || 0,
    featured_vocalist_count: Number(s.featured_vocalist_count) || 0,
    has_featured_vocalist: parseBool(s.has_featured_vocalist),
    top_words_json: typeof s.top_words_json === 'string' ? tryParseJSON(s.top_words_json) : s.top_words_json || [],
  }));
  const artwork = raw.artwork || [];
  const releaseArt = raw.release_art || [];
  const artCredits = raw.art_credits || [];
  const artTypes = raw.art_types || [];
  const distributors = raw.distributors || [];
  const labels = raw.labels || [];
  const lyricCategories = raw.lyric_categories || [];
  const perspectives = raw.perspectives || [];

  const songIndex = indexBy(songs, 'song_id');
  const releaseIndex = indexBy(releases, 'release_id');
  const personIndex = indexBy(people, 'person_id');
  const roleIndex = indexBy(creditRoles, 'credit_role_id');
  const categoryIndex = indexBy(lyricCategories, 'lyrics_category_id');
  const perspectiveIndex = indexBy(perspectives, 'perspective_id');
  const statsIndex = indexBy(songStats, 'song_id');
  const lyricsIndex = indexBy(lyrics, 'song_id');
  const artworkIndex = indexBy(artwork, 'art_id');
  const artTypeIndex = indexBy(artTypes, 'art_type_id');

  // Build release -> primary artwork lookup
  const releaseArtworkMap = {};
  releaseArt.forEach((ra) => {
    const art = artworkIndex[ra.art_id];
    if (art && (parseBool(ra.is_primary) || !releaseArtworkMap[ra.release_id])) {
      const artType = artTypeIndex[art.art_type_id];
      const credits = artCredits
        .filter((ac) => ac.art_id === art.art_id)
        .map((ac) => ({
          ...ac,
          person: personIndex[ac.person_id],
          role: roleIndex[ac.credit_role_id],
        }));
      releaseArtworkMap[ra.release_id] = {
        ...art,
        art_type_name: artType ? artType.name : '',
        credits,
      };
    }
  });

  // Enrich artwork array with type names and credits
  const enrichedArtwork = artwork.map((art) => {
    const artType = artTypeIndex[art.art_type_id];
    const credits = artCredits
      .filter((ac) => ac.art_id === art.art_id)
      .map((ac) => ({
        ...ac,
        person: personIndex[ac.person_id],
        role: roleIndex[ac.credit_role_id],
      }));
    const linkedRelease = releaseArt.find((ra) => ra.art_id === art.art_id);
    const release = linkedRelease ? releaseIndex[linkedRelease.release_id] : null;
    return {
      ...art,
      art_type_name: artType ? artType.name : '',
      credits,
      release,
    };
  });

  const enrichedSongs = songs.map((song) => {
    const release = releaseIndex[song.release_id];
    const category = categoryIndex[song.lyrics_category_id];
    const perspective = perspectiveIndex[song.perspective_id];
    const stats = statsIndex[song.song_id];
    const lyric = lyricsIndex[song.song_id];
    const credits = songCredits
      .filter((c) => c.song_id === song.song_id)
      .map((c) => ({
        ...c,
        person: personIndex[c.person_id],
        role: roleIndex[c.credit_role_id],
      }));
    const cover = releaseArtworkMap[song.release_id] || null;

    return {
      ...song,
      release,
      category_name: category ? category.name : '',
      perspective_name: perspective ? perspective.name : '',
      stats: stats || { word_count: 0, unique_word_count: 0, top_words_json: [], featured_vocalist_count: 0 },
      lyrics_text: lyric ? lyric.lyrics_text : '',
      credits,
      cover_art: cover,
    };
  });

  const years = [...new Set(songs.map((s) => s.year).filter(Boolean))].sort();
  const allKeys = [...new Set(songs.map((s) => s.key).filter(Boolean))].sort();
  const allBpms = songs.map((s) => s.bpm).filter(Boolean);
  const bpmRange = allBpms.length ? [Math.min(...allBpms), Math.max(...allBpms)] : [0, 0];
  const wordCounts = songStats.map((s) => s.word_count).filter(Boolean);
  const wordCountRange = wordCounts.length ? [Math.min(...wordCounts), Math.max(...wordCounts)] : [0, 0];
  const durations = songs.map((s) => s.duration_sec).filter(Boolean);
  const durationRange = durations.length ? [Math.min(...durations), Math.max(...durations)] : [0, 0];

  return {
    songs: enrichedSongs,
    releases,
    people,
    songCredits,
    creditRoles,
    lyrics,
    songStats,
    artwork: enrichedArtwork,
    releaseArt,
    artCredits,
    artTypes,
    distributors,
    labels,
    lyricCategories,
    perspectives,
    indexes: {
      songIndex,
      releaseIndex,
      personIndex,
      roleIndex,
      categoryIndex,
      perspectiveIndex,
      statsIndex,
      lyricsIndex,
    },
    meta: {
      years,
      allKeys,
      bpmRange,
      wordCountRange,
      durationRange,
      totalSongs: songs.length,
    },
  };
}

function parseBool(val) {
  if (typeof val === 'boolean') return val;
  if (typeof val === 'string') {
    const l = val.toLowerCase().trim();
    return l === 'true' || l === 'yes' || l === '1' || l === 'TRUE';
  }
  return Boolean(val);
}

function tryParseJSON(str) {
  try {
    return JSON.parse(str);
  } catch {
    return [];
  }
}

function indexBy(arr, key) {
  const map = {};
  arr.forEach((item) => {
    if (item[key] !== undefined && item[key] !== '') {
      map[item[key]] = item;
    }
  });
  return map;
}

export function getPersonStats(db, personId) {
  const credits = db.songCredits.filter((c) => c.person_id === personId);
  const person = db.indexes.personIndex[personId];
  const songIds = [...new Set(credits.map((c) => c.song_id))];
  const songs = songIds.map((id) => db.indexes.songIndex[id]).filter(Boolean);

  const roleBreakdown = {};
  credits.forEach((c) => {
    const role = db.indexes.roleIndex[c.credit_role_id];
    const roleName = role ? role.name : c.credit_role_id;
    if (!roleBreakdown[roleName]) roleBreakdown[roleName] = [];
    roleBreakdown[roleName].push(c.song_id);
  });

  return {
    person,
    totalSongs: songIds.length,
    totalCredits: credits.length,
    roleBreakdown,
    songs,
    credits,
  };
}

export function getTrendData(db, metric) {
  const years = db.meta.years;
  const data = [];

  years.forEach((year) => {
    const yearSongs = db.songs.filter((s) => s.year === year);
    let value = 0;

    switch (metric) {
      case 'song_count':
        value = yearSongs.length;
        break;
      case 'avg_word_count':
        if (yearSongs.length) {
          const total = yearSongs.reduce((sum, s) => sum + (s.stats?.word_count || 0), 0);
          value = Math.round(total / yearSongs.length);
        }
        break;
      case 'avg_duration':
        if (yearSongs.length) {
          const total = yearSongs.reduce((sum, s) => sum + (s.duration_sec || 0), 0);
          value = Math.round(total / yearSongs.length);
        }
        break;
      case 'avg_bpm':
        {
          const bpmSongs = yearSongs.filter((s) => s.bpm > 0);
          if (bpmSongs.length) {
            const total = bpmSongs.reduce((sum, s) => sum + s.bpm, 0);
            value = Math.round(total / bpmSongs.length);
          }
        }
        break;
      case 'featured_count':
        value = yearSongs.filter((s) => s.stats?.has_featured_vocalist || s.stats?.featured_vocalist_count > 0).length;
        break;
      case 'explicit_count':
        value = yearSongs.filter((s) => s.is_explicit).length;
        break;
      default:
        value = yearSongs.length;
    }

    data.push({ year, value });
  });

  return data;
}

export function getCategoryTrendData(db) {
  const years = db.meta.years;
  const categories = db.lyricCategories.map((c) => c.name);
  const series = {};

  categories.forEach((cat) => {
    series[cat] = years.map((year) => {
      const count = db.songs.filter(
        (s) => s.year === year && s.category_name === cat
      ).length;
      return { year, value: count };
    });
  });

  return { years, series };
}

export function applyFilters(songs, filters) {
  return songs.filter((song) => {
    if (filters.years && filters.years.length > 0) {
      if (!filters.years.includes(song.year)) return false;
    }
    if (filters.releases && filters.releases.length > 0) {
      if (!filters.releases.includes(song.release_id)) return false;
    }
    if (filters.categories && filters.categories.length > 0) {
      if (!filters.categories.includes(song.category_name)) return false;
    }
    if (filters.perspectives && filters.perspectives.length > 0) {
      if (!filters.perspectives.includes(song.perspective_name)) return false;
    }
    if (filters.keys && filters.keys.length > 0) {
      if (!filters.keys.includes(song.key)) return false;
    }
    if (filters.isPublished !== null && filters.isPublished !== undefined) {
      if (song.is_published !== filters.isPublished) return false;
    }
    if (filters.isExplicit !== null && filters.isExplicit !== undefined) {
      if (song.is_explicit !== filters.isExplicit) return false;
    }
    if (filters.hasVideo !== null && filters.hasVideo !== undefined) {
      if (song.has_video !== filters.hasVideo) return false;
    }
    if (filters.hasFeatured !== null && filters.hasFeatured !== undefined) {
      const has = song.stats?.featured_vocalist_count > 0 || song.stats?.has_featured_vocalist;
      if (has !== filters.hasFeatured) return false;
    }
    if (filters.keyQuality && filters.keyQuality !== 'all') {
      if (song.key_quality !== filters.keyQuality) return false;
    }
    if (filters.people && filters.people.length > 0) {
      const songPersonIds = song.credits.map((c) => c.person_id);
      if (!filters.people.some((pid) => songPersonIds.includes(pid))) return false;
    }
    if (filters.searchQuery) {
      const q = filters.searchQuery.toLowerCase();
      const searchable = [
        String(song.title || ''),
        String(song.year || ''),
        String(song.key || ''),
        String(song.bpm || ''),
        String(song.category_name || ''),
        String(song.perspective_name || ''),
        String(song.release?.title || ''),
        String(song.release?.release_type || ''),
        ...(song.credits || []).map((c) => String(c.person?.name || '')),
        ...(song.credits || []).map((c) => String(c.role?.name || '').replace(/_/g, ' ')),
      ].join(' ').toLowerCase();
      if (!searchable.includes(q)) return false;
    }
    if (filters.lyricSearch) {
      const q = filters.lyricSearch.toLowerCase();
      if (!song.lyrics_text || !String(song.lyrics_text).toLowerCase().includes(q)) return false;
    }
    return true;
  });
}
