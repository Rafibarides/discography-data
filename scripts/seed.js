/**
 * ============================================================
 *  seed.js  -  Parse reference data and generate Seed.gs
 * ============================================================
 *
 *  Usage:   node scripts/seed.js
 *
 *  This reads all reference CSV/MD files, cross-references them,
 *  normalises titles, computes word stats, and outputs a Seed.gs
 *  file that you paste into your Google Apps Script editor.
 *
 *  Run  seedDatabase()  inside the script editor to populate
 *  all 15 tabs at once.
 * ============================================================
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REF_DIR = path.resolve(__dirname, '../../reference');
const OUT_FILE = path.resolve(__dirname, '../google-apps-script/Seed.gs');

/* ------------------------------------------------------------------ */
/*  CSV PARSER (handles quoted fields)                                 */
/* ------------------------------------------------------------------ */

function parseCSV(text) {
  const rows = [];
  let current = [];
  let field = '';
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    const next = text[i + 1];

    if (inQuotes) {
      if (ch === '"' && next === '"') {
        field += '"';
        i++;
      } else if (ch === '"') {
        inQuotes = false;
      } else {
        field += ch;
      }
    } else {
      if (ch === '"') {
        inQuotes = true;
      } else if (ch === ',') {
        current.push(field.trim());
        field = '';
      } else if (ch === '\n' || ch === '\r') {
        if (ch === '\r' && next === '\n') i++;
        current.push(field.trim());
        if (current.some((c) => c !== '')) rows.push(current);
        current = [];
        field = '';
      } else {
        field += ch;
      }
    }
  }
  current.push(field.trim());
  if (current.some((c) => c !== '')) rows.push(current);

  if (rows.length < 2) return [];
  const headers = rows[0];
  return rows.slice(1).map((row) => {
    const obj = {};
    headers.forEach((h, i) => {
      obj[h] = row[i] || '';
    });
    return obj;
  });
}

/* ------------------------------------------------------------------ */
/*  TITLE NORMALISATION                                                */
/* ------------------------------------------------------------------ */

const SMALL_WORDS = new Set([
  'a','an','the','and','but','or','for','nor','in','on','at','to','of','by','up','as','is','if','it','my','so','no','do','vs'
]);

function titleCase(str) {
  if (!str) return '';
  return str.toLowerCase().split(' ').map((word, idx) => {
    if (idx === 0) return cap(word);
    if (word.startsWith('(')) return '(' + cap(word.slice(1));
    if (SMALL_WORDS.has(word)) return word;
    return cap(word);
  }).join(' ');
}

function cap(w) {
  if (!w) return '';
  return w.charAt(0).toUpperCase() + w.slice(1);
}

function normalizeTitle(raw) {
  if (!raw) return '';
  let t = raw.trim();
  if (t === t.toUpperCase() && t.length > 3) t = titleCase(t);
  else if (t === t.toLowerCase() && t.length > 3) t = titleCase(t);
  t = t.replace(/\s+/g, ' ');
  return t;
}

/* ------------------------------------------------------------------ */
/*  WORD STATS                                                         */
/* ------------------------------------------------------------------ */

const STOP_WORDS = new Set([
  'i','me','my','mine','myself','you','your','yours','yourself',
  'he','him','his','she','her','hers','we','us','our','they','them','their',
  'it','its','a','an','the','and','but','or','so','of','to','in','on','at',
  'by','for','with','is','am','are','was','were','be','been','being',
  'do','does','did','done','have','has','had','having',
  'will','would','shall','should','can','could','may','might','must',
  'not','no','nor','if','then','than','that','this','these','those',
  'up','out','down','off','over','under','from','into','about','between',
  'through','after','before','all','each','every','both','few','some','any','most',
  'just','like','when','what','how','where','who','which','as','more','also',
  'here','there','very','too','oh','ooh','ah','ahh','na','la','dum','mmm','hmm',
  'yea','yeah',"im","i'm","i've","i'll","i'd",
  "don't","won't","can't","didn't","doesn't","isn't","aren't","wasn't","weren't",
  "couldn't","wouldn't","shouldn't","haven't","hasn't","hadn't",
  "it's","that's","there's","here's","what's","who's",
  "you're","you've","you'll","you'd","he's","he'd","she's","she'd",
  "we're","we've","we'll","we'd","they're","they've","they'll","they'd",
  'got','get','go','going','gone','come','came','know','say','said',
  'tell','told','see','look','make','take','give','let','been','now','one','two',
  'cause','cuz',"'cause",
]);

function computeWordStats(text) {
  if (!text || !text.trim()) return { wordCount: 0, uniqueWordCount: 0, topWords: [] };
  const words = text.toLowerCase().replace(/[^a-z'\s-]/g, '').split(/\s+/).filter((w) => w.length > 1);
  const wordCount = words.length;
  const freq = {};
  words.forEach((w) => { if (!STOP_WORDS.has(w)) freq[w] = (freq[w] || 0) + 1; });
  const uniqueWordCount = Object.keys(freq).length;
  const topWords = Object.entries(freq).sort((a, b) => b[1] - a[1]).slice(0, 10).map(([word, count]) => ({ word, count }));
  return { wordCount, uniqueWordCount, topWords };
}

/* ------------------------------------------------------------------ */
/*  EXPLICIT DETECTION                                                 */
/* ------------------------------------------------------------------ */

const EXPLICIT_WORDS = ['shit','fuck','fucking','bitch','ass','damn','hell','bullshit','dick','nigga','nigger','crap'];

function isExplicit(text) {
  if (!text) return false;
  const lower = text.toLowerCase();
  return EXPLICIT_WORDS.some((w) => lower.includes(w));
}

/* ------------------------------------------------------------------ */
/*  READ REFERENCE FILES                                               */
/* ------------------------------------------------------------------ */

console.log('Reading reference files from:', REF_DIR);

const creditsRaw = fs.readFileSync(path.join(REF_DIR, 'Discography Ref 1 - Sheet1.csv'), 'utf-8');
const bpmRaw = fs.readFileSync(path.join(REF_DIR, 'Discography Ref 1 - BPM.csv'), 'utf-8');
const typeRaw = fs.readFileSync(path.join(REF_DIR, 'Discography Ref 1 - Type.csv'), 'utf-8');
const audioRaw = fs.readFileSync(path.join(REF_DIR, 'audio_lengths.csv'), 'utf-8');
const lyricsRaw = fs.readFileSync(path.join(REF_DIR, 'Rafi Barides Discography Lyrics.md'), 'utf-8');

const credits = parseCSV(creditsRaw);
const bpmData = parseCSV(bpmRaw);
const typeData = parseCSV(typeRaw);
const audioData = parseCSV(audioRaw);

/* ------------------------------------------------------------------ */
/*  PARSE LYRICS FROM MARKDOWN                                         */
/* ------------------------------------------------------------------ */

function parseLyrics(md) {
  const result = {};
  const lines = md.split('\n');
  let currentSong = null;
  let currentLyrics = [];

  for (const raw of lines) {
    const line = raw.trimEnd();

    // song header: ## Title (not year headers like ## **2020**)
    if (line.startsWith('## ') && !line.includes('**')) {
      if (currentSong) {
        result[currentSong] = currentLyrics.join('\n').trim();
      }
      currentSong = line.replace('## ', '').trim();
      currentLyrics = [];
      continue;
    }

    // year header or release header -> flush
    if (line.startsWith('# ') || (line.startsWith('## **') && /\d{4}/.test(line))) {
      if (currentSong) {
        result[currentSong] = currentLyrics.join('\n').trim();
        currentSong = null;
        currentLyrics = [];
      }
      continue;
    }

    // release info bullets -> flush
    if (line.startsWith('* **') || line.startsWith('  *')) {
      if (currentSong) {
        result[currentSong] = currentLyrics.join('\n').trim();
        currentSong = null;
        currentLyrics = [];
      }
      continue;
    }

    if (currentSong) {
      currentLyrics.push(line);
    }
  }

  if (currentSong) {
    result[currentSong] = currentLyrics.join('\n').trim();
  }

  return result;
}

const lyricsMap = parseLyrics(lyricsRaw);
console.log(`Parsed lyrics for ${Object.keys(lyricsMap).length} songs`);

/* ------------------------------------------------------------------ */
/*  BUILD BPM/KEY LOOKUP                                               */
/* ------------------------------------------------------------------ */

function normForLookup(t) {
  return t.toLowerCase()
    .replace(/\(feat\..*?\)/gi, '')
    .replace(/\(remastered\)/gi, '')
    .replace(/\(acoustic.*?\)/gi, '')
    .replace(/\(appendix\)/gi, '')
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

const bpmLookup = {};
bpmData.forEach((row) => {
  const key = normForLookup(row.Title || '');
  bpmLookup[key] = { key: row.Key || '', bpm: parseInt(row.BPM) || 0 };
});

/* ------------------------------------------------------------------ */
/*  BUILD TYPE/CATEGORY LOOKUP                                         */
/* ------------------------------------------------------------------ */

const typeLookup = {};
typeData.forEach((row) => {
  const rawSong = (row.Song || '').trim();
  // handle combined entries like "Over It for Now / Let Me Go"
  const parts = rawSong.split('/').map((s) => s.trim());
  parts.forEach((part) => {
    // remove year markers like "(2021)"
    const clean = part.replace(/\(\d{4}\)/, '').trim();
    const key = normForLookup(clean);
    typeLookup[key] = {
      perspective: (row.Perspective || '').trim(),
      category: (row['Lyric Category'] || '').trim(),
    };
  });
});

/* ------------------------------------------------------------------ */
/*  BUILD AUDIO LENGTH LOOKUP                                          */
/* ------------------------------------------------------------------ */

function extractSongNameFromFilename(fname) {
  let name = fname.replace(/\.(wav|mp3|m4a|flac)$/i, '');
  // remove leading track number "1. " or "8. "
  name = name.replace(/^\d+\.\s*/, '');
  // remove artist prefix "Rafi Barides - " or "Rafi Barides & Someone - "
  name = name.replace(/^Rafi Barides[^-]*-\s*/, '');
  // remove "(OFFICIAL MUSIC VIDEO)" etc
  name = name.replace(/\(OFFICIAL.*?\)/gi, '');
  // remove "BEN LERNER- "
  name = name.replace(/^BEN LERNER-?\s*/i, '');
  return name.trim();
}

const durationLookup = {};
audioData.forEach((row) => {
  const fname = (row.filename || '').trim();
  const seconds = parseFloat(row.seconds) || 0;
  const songName = extractSongNameFromFilename(fname);
  const key = normForLookup(songName);
  if (key) durationLookup[key] = Math.round(seconds * 100) / 100;
});

/* ------------------------------------------------------------------ */
/*  DEFINE RELEASES                                                    */
/* ------------------------------------------------------------------ */

const releases = [
  { release_id: 'rel-001', title: 'Breathe', release_type: 'single', release_date: '2020-01-01', year: 2020 },
  { release_id: 'rel-002', title: 'Need You Here', release_type: 'single', release_date: '2020-01-01', year: 2020 },
  { release_id: 'rel-003', title: 'Losing My Faith', release_type: 'single', release_date: '2020-01-01', year: 2020 },
  { release_id: 'rel-004', title: 'Moving', release_type: 'single', release_date: '2021-01-01', year: 2021 },
  { release_id: 'rel-005', title: 'Hopeless Place', release_type: 'single', release_date: '2021-01-01', year: 2021 },
  { release_id: 'rel-006', title: '1968', release_type: 'single', release_date: '2021-01-01', year: 2021 },
  { release_id: 'rel-007', title: 'Numb', release_type: 'single', release_date: '2021-01-01', year: 2021 },
  { release_id: 'rel-008', title: 'Paper Town', release_type: 'album', release_date: '2022-01-01', year: 2022 },
  { release_id: 'rel-009', title: 'Kindly', release_type: 'ep', release_date: '2022-01-01', year: 2022 },
  { release_id: 'rel-010', title: 'Concrete Jungle', release_type: 'album', release_date: '2023-01-01', year: 2023 },
  { release_id: 'rel-011', title: 'Selfish', release_type: 'single', release_date: '2023-01-01', year: 2023 },
  { release_id: 'rel-012', title: 'Where to Fall', release_type: 'single', release_date: '2023-01-01', year: 2023 },
  { release_id: 'rel-013', title: "You Don't Give Me Love", release_type: 'single', release_date: '2023-01-01', year: 2023 },
  { release_id: 'rel-014', title: 'Neighbors', release_type: 'single', release_date: '2023-01-01', year: 2023 },
  { release_id: 'rel-015', title: 'Mister Right Guy', release_type: 'single', release_date: '2023-01-01', year: 2023 },
  { release_id: 'rel-016', title: 'Little Bear', release_type: 'single', release_date: '2023-01-01', year: 2023 },
  { release_id: 'rel-017', title: 'Believe in Us', release_type: 'single', release_date: '2023-01-01', year: 2023 },
  { release_id: 'rel-018', title: 'Ice Cream Truck', release_type: 'single', release_date: '2023-01-01', year: 2023 },
  { release_id: 'rel-019', title: 'Friends in Private', release_type: 'single', release_date: '2023-01-01', year: 2023 },
  { release_id: 'rel-020', title: 'Outer Space', release_type: 'single', release_date: '2024-01-01', year: 2024 },
  { release_id: 'rel-022', title: 'Rags to Rags', release_type: 'ep', release_date: '2025-01-01', year: 2025 },
  { release_id: 'rel-023', title: 'Storm Before the Storm', release_type: 'album', release_date: '2026-01-01', year: 2026 },
];

/* song -> release mapping */
const songToRelease = {
  'Breathe': 'rel-001',
  'Need You Here': 'rel-002',
  'Losing My Faith': 'rel-003',
  'Moving': 'rel-004',
  'Hopeless Place': 'rel-005',
  '1968': 'rel-006',
  'Numb': 'rel-007',
  "I Don't Want to Love You Anymore": 'rel-008',
  'Over It for Now': 'rel-008',
  'Let Me Go': 'rel-008',
  'Something to Do': 'rel-008',
  'God (Remastered)': 'rel-008',
  'Asking for a Friend': 'rel-008',
  'Forever': 'rel-008',
  'No Place': 'rel-008',
  'Wide Awake': 'rel-008',
  'Kindly': 'rel-009',
  'The Club': 'rel-009',
  'Nothing Left': 'rel-009',
  "I Don't Want to Love You Anymore (Acoustic)": 'rel-009',
  'Down To One': 'rel-010',
  'Best From Life': 'rel-010',
  'Counting the Minutes': 'rel-010',
  'Bubble': 'rel-010',
  'Worth It': 'rel-010',
  'Change My Mind': 'rel-010',
  'Pastry': 'rel-010',
  'Uber Eats': 'rel-010',
  'Bad Decisions': 'rel-010',
  'Friends': 'rel-010',
  'Working for the Good Times': 'rel-010',
  'Problems': 'rel-010',
  'Selfish': 'rel-011',
  'Where To Fall': 'rel-012',
  "You Don't Give Me Love": 'rel-013',
  'Neighbors': 'rel-014',
  'Mister Right Guy': 'rel-015',
  'Little Bear': 'rel-016',
  'Believe In Us': 'rel-017',
  'Ice Cream Truck': 'rel-018',
  'Friends In Private': 'rel-019',
  'Outer Space': 'rel-020',
  'Remind Me': 'rel-022',
  'Lightheaded': 'rel-022',
  'Feels Like Home': 'rel-022',
  'Take My Breath': 'rel-022',
  'In Again': 'rel-023',
  'Somebody Else': 'rel-023',
  'This Too Shall Pass': 'rel-023',
  'Me And The Truth': 'rel-023',
  'The Proof': 'rel-023',
  'The Earth Is Flat': 'rel-023',
  'Good Enough': 'rel-023',
  'Chernobyl (Appendix)': 'rel-023',
};

/* ------------------------------------------------------------------ */
/*  DEFINE LYRIC CATEGORIES + PERSPECTIVES                             */
/* ------------------------------------------------------------------ */

const lyricCategories = [
  { lyrics_category_id: 'cat-01', name: 'Love & Romance (Positive)' },
  { lyrics_category_id: 'cat-02', name: 'Love & Romance (Negative)' },
  { lyrics_category_id: 'cat-03', name: 'Social Commentary' },
  { lyrics_category_id: 'cat-04', name: 'Narrative / Storytime' },
  { lyrics_category_id: 'cat-05', name: 'Philosophical' },
  { lyrics_category_id: 'cat-06', name: 'Reflective' },
];

const catNameToId = {};
lyricCategories.forEach((c) => { catNameToId[c.name] = c.lyrics_category_id; });

const perspectives = [
  { perspective_id: 'per-01', name: 'First person exclusively' },
  { perspective_id: 'per-02', name: 'Third person exclusively' },
  { perspective_id: 'per-03', name: 'Both (first + third)' },
  { perspective_id: 'per-04', name: 'Both (first + second framed socially)' },
];

const perNameToId = {};
perspectives.forEach((p) => { perNameToId[p.name] = p.perspective_id; });

/* ------------------------------------------------------------------ */
/*  DEFINE CREDIT ROLES                                                */
/* ------------------------------------------------------------------ */

const creditRoles = [
  { credit_role_id: 'role-01', name: 'mixing', category: 'audio' },
  { credit_role_id: 'role-02', name: 'mastering', category: 'audio' },
  { credit_role_id: 'role-03', name: 'featured_vocals', category: 'performance' },
  { credit_role_id: 'role-04', name: 'guitar', category: 'performance' },
  { credit_role_id: 'role-05', name: 'bass', category: 'performance' },
  { credit_role_id: 'role-06', name: 'synths', category: 'performance' },
  { credit_role_id: 'role-07', name: 'ukulele', category: 'performance' },
  { credit_role_id: 'role-08', name: 'backing_vocals', category: 'performance' },
  { credit_role_id: 'role-09', name: 'production', category: 'audio' },
  { credit_role_id: 'role-10', name: 'photographer', category: 'visual' },
  { credit_role_id: 'role-11', name: 'designer', category: 'visual' },
  { credit_role_id: 'role-12', name: '3d_artist', category: 'visual' },
  { credit_role_id: 'role-13', name: 'digital_artist', category: 'visual' },
  { credit_role_id: 'role-14', name: 'graphic_designer', category: 'visual' },
  { credit_role_id: 'role-15', name: 'illustrator', category: 'visual' },
];

const roleNameToId = {};
creditRoles.forEach((r) => { roleNameToId[r.name] = r.credit_role_id; });

/* ------------------------------------------------------------------ */
/*  ART TYPES                                                          */
/* ------------------------------------------------------------------ */

const artTypes = [
  { art_type_id: 'atype-01', name: 'rendered' },
  { art_type_id: 'atype-02', name: 'composited' },
  { art_type_id: 'atype-03', name: 'still' },
  { art_type_id: 'atype-04', name: 'graphic_design' },
  { art_type_id: 'atype-05', name: 'illustration' },
];

/* ------------------------------------------------------------------ */
/*  DISTRIBUTORS + LABELS                                              */
/* ------------------------------------------------------------------ */

const distributors = [
  { distributor_id: 'dist-01', name: 'Soundrop' },
  { distributor_id: 'dist-02', name: 'Distrokid' },
];

const labelsList = [
  { label_id: 'lbl-01', name: 'GNIX' },
  { label_id: 'lbl-02', name: 'UMH' },
];

/* Releases up to and including Kindly (rel-009) used Soundrop.
   Everything after that used Distrokid. */
const SOUNDROP_RELEASES = new Set([
  'rel-001','rel-002','rel-003','rel-004','rel-005','rel-006','rel-007','rel-008','rel-009',
]);

function getDistributorId(releaseId) {
  return SOUNDROP_RELEASES.has(releaseId) ? 'dist-01' : 'dist-02';
}

/* Label overrides  (everything else is independent) */
const SONG_LABEL_MAP = {
  'Hopeless Place': 'lbl-01',   // GNIX
  'Moving': 'lbl-02',           // UMH
};

function getLabelInfo(songTitle) {
  const labelId = SONG_LABEL_MAP[songTitle] || '';
  return {
    label_id: labelId,
    upload_type: labelId ? 'label' : 'independent',
  };
}

/* ------------------------------------------------------------------ */
/*  BUILD PEOPLE + SONGS + CREDITS                                     */
/* ------------------------------------------------------------------ */

const peopleMap = {};  // name -> person_id
let personCounter = 0;

/* Alias map: normalise variant spellings to canonical name */
const PERSON_ALIASES = {
  'Amir B': 'Amir',
};

function getOrCreatePerson(name) {
  let clean = name.trim();
  if (!clean) return null;
  clean = PERSON_ALIASES[clean] || clean;
  if (peopleMap[clean]) return peopleMap[clean];
  personCounter++;
  const id = 'p-' + String(personCounter).padStart(3, '0');
  peopleMap[clean] = id;
  return id;
}

const songs = [];
const songCreditsList = [];
const lyricsList = [];
const songStatsList = [];

let songCounter = 0;
let creditCounter = 0;

// process each song from the credits sheet
credits.forEach((row) => {
  const rawTitle = (row.Title || '').trim();
  if (!rawTitle) return;

  const title = normalizeTitle(rawTitle);
  songCounter++;
  const songId = 's-' + String(songCounter).padStart(3, '0');

  // find release
  const releaseId = findRelease(title, rawTitle);
  const release = releases.find((r) => r.release_id === releaseId);
  const year = release ? release.year : 0;
  const releaseDate = release ? release.release_date : '';

  // find BPM/key
  const bpmKey = normForLookup(rawTitle);
  const bpmEntry = bpmLookup[bpmKey] || {};

  // find type/category
  const typeKey = normForLookup(rawTitle);
  const typeEntry = typeLookup[typeKey] || {};

  // find duration
  const durKey = normForLookup(rawTitle);
  const duration = durationLookup[durKey] || 0;

  // find lyrics
  const lyricsText = findLyrics(title, rawTitle);

  // compute stats
  const stats = computeWordStats(lyricsText);
  const explicit = isExplicit(lyricsText);

  // has video - we know Asking for a Friend has one
  const hasVideo = rawTitle.toLowerCase().includes('asking for a friend') ? true : false;

  // category and perspective IDs
  const catId = catNameToId[typeEntry.category] || '';
  const perId = perNameToId[typeEntry.perspective] || '';

  songs.push({
    song_id: songId,
    title: title,
    release_id: releaseId,
    release_date: releaseDate,
    year: year,
    is_published: true,
    is_explicit: explicit,
    has_video: hasVideo,
    lyrics_category_id: catId,
    perspective_id: perId,
    distributor_id: getDistributorId(releaseId),
    upload_type: getLabelInfo(title).upload_type,
    label_id: getLabelInfo(title).label_id,
    duration_sec: duration,
    bpm: bpmEntry.bpm || 0,
    key: bpmEntry.key || '',
    title_length: title.length,
  });

  // lyrics
  lyricsList.push({
    song_id: songId,
    lyrics_text: lyricsText,
  });

  // song stats
  const featuredCount = (row['Featured Vocalist'] || '').trim()
    ? (row['Featured Vocalist'] || '').split(',').length
    : 0;

  songStatsList.push({
    song_id: songId,
    word_count: stats.wordCount,
    unique_word_count: stats.uniqueWordCount,
    top_words_json: JSON.stringify(stats.topWords),
    featured_vocalist_count: featuredCount,
    has_featured_vocalist: featuredCount > 0,
  });

  // --- CREDITS ---
  // Featured vocalist
  const featuredRaw = (row['Featured Vocalist'] || '').trim();
  if (featuredRaw) {
    featuredRaw.split(',').forEach((name) => {
      const pid = getOrCreatePerson(name.trim());
      if (pid) {
        creditCounter++;
        songCreditsList.push({
          song_credit_id: 'sc-' + String(creditCounter).padStart(4, '0'),
          song_id: songId,
          person_id: pid,
          credit_role_id: roleNameToId['featured_vocals'],
          credit_detail: '',
        });
      }
    });
  }

  // Mixed by
  const mixedBy = (row['Mixed By'] || '').trim();
  if (mixedBy) {
    const pid = getOrCreatePerson(mixedBy);
    if (pid) {
      creditCounter++;
      songCreditsList.push({
        song_credit_id: 'sc-' + String(creditCounter).padStart(4, '0'),
        song_id: songId,
        person_id: pid,
        credit_role_id: roleNameToId['mixing'],
        credit_detail: '',
      });
    }
  }

  // Mastered by
  const masteredBy = (row['Mastered By'] || '').trim();
  if (masteredBy) {
    const pid = getOrCreatePerson(masteredBy);
    if (pid) {
      creditCounter++;
      songCreditsList.push({
        song_credit_id: 'sc-' + String(creditCounter).padStart(4, '0'),
        song_id: songId,
        person_id: pid,
        credit_role_id: roleNameToId['mastering'],
        credit_detail: '',
      });
    }
  }

  // Instrumentalists
  const instrumentalists = (row['Instrumentalists'] || '').trim();
  if (instrumentalists) {
    // parse "Guitar: Nicky V Hines, Bass: Yoni Krakauer"
    const parts = instrumentalists.split(',').map((s) => s.trim()).filter(Boolean);
    parts.forEach((part) => {
      const colonIdx = part.indexOf(':');
      if (colonIdx > -1) {
        const instrument = part.slice(0, colonIdx).trim().toLowerCase();
        const personName = part.slice(colonIdx + 1).trim();
        const pid = getOrCreatePerson(personName);
        if (pid) {
          let roleId = '';
          if (instrument.includes('guitar')) roleId = roleNameToId['guitar'];
          else if (instrument.includes('bass')) roleId = roleNameToId['bass'];
          else if (instrument.includes('synth')) roleId = roleNameToId['synths'];
          else if (instrument.includes('ukulele')) roleId = roleNameToId['ukulele'];
          else if (instrument.includes('backing vocal')) roleId = roleNameToId['backing_vocals'];
          else roleId = roleNameToId['guitar']; // fallback

          creditCounter++;
          songCreditsList.push({
            song_credit_id: 'sc-' + String(creditCounter).padStart(4, '0'),
            song_id: songId,
            person_id: pid,
            credit_role_id: roleId,
            credit_detail: instrument,
          });
        }
      }
    });
  }
});

// Add Losing My Faith (not in credits sheet but has lyrics)
const losingMyFaithLyrics = lyricsMap['Losing my Faith'] || lyricsMap['Losing My Faith'] || '';
if (losingMyFaithLyrics) {
  songCounter++;
  const songId = 's-' + String(songCounter).padStart(3, '0');
  const stats = computeWordStats(losingMyFaithLyrics);

  songs.push({
    song_id: songId,
    title: 'Losing My Faith',
    release_id: 'rel-003',
    release_date: '2020-01-01',
    year: 2020,
    is_published: true,
    is_explicit: isExplicit(losingMyFaithLyrics),
    has_video: false,
    lyrics_category_id: catNameToId['Philosophical'] || '',
    perspective_id: perNameToId['First person exclusively'] || '',
    distributor_id: getDistributorId('rel-003'),
    upload_type: 'independent',
    label_id: '',
    duration_sec: durationLookup[normForLookup('Losing My Faith')] || 0,
    bpm: 0,
    key: '',
    title_length: 'Losing My Faith'.length,
  });

  lyricsList.push({ song_id: songId, lyrics_text: losingMyFaithLyrics });
  songStatsList.push({
    song_id: songId,
    word_count: stats.wordCount,
    unique_word_count: stats.uniqueWordCount,
    top_words_json: JSON.stringify(stats.topWords),
    featured_vocalist_count: 0,
    has_featured_vocalist: false,
  });
}

/* ------------------------------------------------------------------ */
/*  BUILD ARTWORK, RELEASE_ART, ART_CREDITS                            */
/* ------------------------------------------------------------------ */

const artTypeNameToId = {};
artTypes.forEach((a) => { artTypeNameToId[a.name] = a.art_type_id; });

const artCreditRoleMap = {
  '3D Artist': roleNameToId['3d_artist'],
  'Photographer': roleNameToId['photographer'],
  'Digital Artist': roleNameToId['digital_artist'],
  'Graphic Designer': roleNameToId['graphic_designer'],
  'Illustrator': roleNameToId['illustrator'],
};

const artTypeMap = {
  'Rendered': artTypeNameToId['rendered'],
  'Composited': artTypeNameToId['composited'],
  'Still': artTypeNameToId['still'],
  'Graphic Design': artTypeNameToId['graphic_design'],
  'Illustration': artTypeNameToId['illustration'],
};

/* slug -> release_id mapping */
const slugToRelease = {
  'paper-town': 'rel-008',
  'concrete-jungle': 'rel-010',
  'rags-to-rags': 'rel-022',
  'storm-before-the-storm': 'rel-023',
  'ice-cream-truck': 'rel-018',
  'numb': 'rel-007',
  'need-you-here': 'rel-002',
  '1968': 'rel-006',
  'losing-my-faith': 'rel-003',
  'friends-in-private': 'rel-019',
  'breathe': 'rel-001',
  'kindly': 'rel-009',
  'outer-space': 'rel-020',
  'believe-in-us': 'rel-017',
  'moving': 'rel-004',
};

/* Raw artwork reference data */
const artworkInput = [
  { slug: 'paper-town', file: 'paper-town.avif', url: 'https://pub-dc67bb733b51400289ae818910d1273d.r2.dev/rags-to-rags.avif', art_type: 'Rendered', credit_role: '3D Artist', credit_name: 'Rafi Barides' },
  { slug: 'concrete-jungle', file: 'concrete-jungle.avif', url: 'https://pub-dc67bb733b51400289ae818910d1273d.r2.dev/concrete-jungle.avif', art_type: 'Rendered', credit_role: '3D Artist', credit_name: 'Rafi Barides' },
  { slug: 'rags-to-rags', file: 'rags-to-rags.avif', url: 'https://pub-dc67bb733b51400289ae818910d1273d.r2.dev/rags-to-rags.avif', art_type: 'Still', credit_role: 'Photographer', credit_name: 'Rafi Barides' },
  { slug: 'storm-before-the-storm', file: 'storm-before-the-storm.avif', url: '', art_type: 'Still', credit_role: 'Photographer', credit_name: 'Simcha Kaplan' },
  { slug: 'ice-cream-truck', file: 'ice-cream-truck.avif', url: 'https://pub-dc67bb733b51400289ae818910d1273d.r2.dev/ice-cream-truck.avif', art_type: 'Composited', credit_role: 'Digital Artist', credit_name: 'Rafi Barides' },
  { slug: 'numb', file: 'numb.avif', url: 'https://pub-dc67bb733b51400289ae818910d1273d.r2.dev/numb.avif', art_type: 'Composited', credit_role: 'Digital Artist', credit_name: 'Rafi Barides' },
  { slug: 'need-you-here', file: 'need-you-here.avif', url: 'https://pub-dc67bb733b51400289ae818910d1273d.r2.dev/need-you-here.avif', art_type: 'Composited', credit_role: 'Digital Artist', credit_name: 'Rafi Barides' },
  { slug: '1968', file: '1968.avif', url: 'https://pub-dc67bb733b51400289ae818910d1273d.r2.dev/1968.avif', art_type: 'Composited', credit_role: 'Digital Artist', credit_name: 'Rafi Barides' },
  { slug: 'losing-my-faith', file: 'losing-my-faith.avif', url: 'https://pub-dc67bb733b51400289ae818910d1273d.r2.dev/losing-my-faith.avif', art_type: 'Composited', credit_role: 'Digital Artist', credit_name: 'Rafi Barides' },
  { slug: 'friends-in-private', file: 'friends-in-private.avif', url: 'https://pub-dc67bb733b51400289ae818910d1273d.r2.dev/friends-in-private.avif', art_type: 'Graphic Design', credit_role: 'Graphic Designer', credit_name: 'Rafi Barides' },
  { slug: 'breathe', file: 'breathe.avif', url: 'https://pub-dc67bb733b51400289ae818910d1273d.r2.dev/breathe.avif', art_type: 'Graphic Design', credit_role: 'Graphic Designer', credit_name: 'Rafi Barides' },
  { slug: 'kindly', file: 'kindly.avif', url: 'https://pub-dc67bb733b51400289ae818910d1273d.r2.dev/kindly.avif', art_type: 'Graphic Design', credit_role: 'Graphic Designer', credit_name: 'Rafi Barides' },
  { slug: 'outer-space', file: 'outer-space.avif', url: 'https://pub-dc67bb733b51400289ae818910d1273d.r2.dev/outer-space.avif', art_type: 'Illustration', credit_role: 'Illustrator', credit_name: 'Rafi Barides' },
  { slug: 'believe-in-us', file: 'beleive-in-us.avif', url: 'https://pub-dc67bb733b51400289ae818910d1273d.r2.dev/beleive-in-us.avif', art_type: 'Illustration', credit_role: 'Illustrator', credit_name: 'Rafi Barides' },
  { slug: 'moving', file: 'moving.avif', url: 'https://pub-dc67bb733b51400289ae818910d1273d.r2.dev/moving.avif', art_type: 'Graphic Design', credit_role: 'Graphic Designer', credit_name: 'UMH' },
];

const artworkList = [];
const releaseArtList = [];
const artCreditsList = [];

artworkInput.forEach((item, idx) => {
  const artId = 'art-' + String(idx + 1).padStart(3, '0');
  const releaseId = slugToRelease[item.slug] || '';
  const artTypeId = artTypeMap[item.art_type] || '';
  const creditRoleId = artCreditRoleMap[item.credit_role] || '';
  const personId = getOrCreatePerson(item.credit_name);

  // find the release to build a description
  const release = releases.find((r) => r.release_id === releaseId);
  const description = release ? `Cover art for ${release.title}` : `Cover art (${item.slug})`;

  artworkList.push({
    art_id: artId,
    image_url: item.url || '',
    description: description,
    art_type_id: artTypeId,
    created_year: release ? release.year : '',
  });

  if (releaseId) {
    releaseArtList.push({
      release_id: releaseId,
      art_id: artId,
      is_primary: true,
    });

    // also set cover_art_id on the release object
    const rel = releases.find((r) => r.release_id === releaseId);
    if (rel) rel._cover_art_id = artId;
  }

  if (personId && creditRoleId) {
    artCreditsList.push({
      art_id: artId,
      person_id: personId,
      credit_role_id: creditRoleId,
    });
  }
});

// Rebuild people array now that artwork may have added new people
const peopleFinal = Object.entries(peopleMap).map(([name, id]) => ({
  person_id: id,
  name: name,
}));

/* ------------------------------------------------------------------ */
/*  HELPER: Find release for a song title                              */
/* ------------------------------------------------------------------ */

function findRelease(normalizedTitle, rawTitle) {
  // try exact match first
  for (const [songName, relId] of Object.entries(songToRelease)) {
    if (songName.toLowerCase() === normalizedTitle.toLowerCase()) return relId;
    if (songName.toLowerCase() === rawTitle.toLowerCase()) return relId;
  }
  // try contains
  for (const [songName, relId] of Object.entries(songToRelease)) {
    if (normalizedTitle.toLowerCase().includes(songName.toLowerCase())) return relId;
  }
  return '';
}

/* ------------------------------------------------------------------ */
/*  HELPER: Find lyrics for a song title                               */
/* ------------------------------------------------------------------ */

function findLyrics(normalizedTitle, rawTitle) {
  // try exact keys
  for (const [key, text] of Object.entries(lyricsMap)) {
    if (key.toLowerCase() === normalizedTitle.toLowerCase()) return text;
    if (key.toLowerCase() === rawTitle.toLowerCase()) return text;
  }
  // try normalized match
  const norm = normForLookup(normalizedTitle);
  for (const [key, text] of Object.entries(lyricsMap)) {
    if (normForLookup(key) === norm) return text;
  }
  // for acoustic version, use original lyrics
  if (normalizedTitle.toLowerCase().includes('acoustic')) {
    const base = normalizedTitle.replace(/\(acoustic.*?\)/i, '').trim();
    return findLyrics(base, base);
  }
  return '';
}

/* ------------------------------------------------------------------ */
/*  GENERATE Seed.gs                                                   */
/* ------------------------------------------------------------------ */

function escapeForGS(str) {
  if (typeof str !== 'string') return String(str);
  return str
    .replace(/\\/g, '\\\\')
    .replace(/'/g, "\\'")
    .replace(/\n/g, '\\n')
    .replace(/\r/g, '');
}

function rowToGS(obj) {
  const entries = Object.entries(obj).map(([k, v]) => {
    if (typeof v === 'boolean') return `'${k}': ${v}`;
    if (typeof v === 'number') return `'${k}': ${v}`;
    return `'${k}': '${escapeForGS(String(v))}'`;
  });
  return `    {${entries.join(', ')}}`;
}

function arrayToGS(name, arr) {
  if (!arr.length) return `  var ${name} = [];\n`;
  const lines = arr.map((obj) => rowToGS(obj));
  return `  var ${name} = [\n${lines.join(',\n')}\n  ];\n`;
}

let output = `/**
 * ============================================================
 *  Seed.gs  -  Generated by seed.js
 *  Run seedDatabase() after setupSheets() to populate all tabs
 * ============================================================
 */

function seedDatabase() {
`;

output += arrayToGS('lyricCategoriesData', lyricCategories);
output += '  writeRowsToSheet(\'lyric_categories\', lyricCategoriesData);\n\n';

output += arrayToGS('perspectivesData', perspectives);
output += '  writeRowsToSheet(\'perspectives\', perspectivesData);\n\n';

output += arrayToGS('creditRolesData', creditRoles);
output += '  writeRowsToSheet(\'credit_roles\', creditRolesData);\n\n';

output += arrayToGS('artTypesData', artTypes);
output += '  writeRowsToSheet(\'art_types\', artTypesData);\n\n';

output += arrayToGS('distributorsData', distributors);
output += '  writeRowsToSheet(\'distributors\', distributorsData);\n\n';

output += arrayToGS('labelsData', labelsList);
output += '  writeRowsToSheet(\'labels\', labelsData);\n\n';

output += arrayToGS('releasesData', releases.map((r) => {
  const { _cover_art_id, ...rest } = r;
  return { ...rest, cover_art_id: _cover_art_id || '', is_published: true };
}));
output += '  writeRowsToSheet(\'releases\', releasesData);\n\n';

output += arrayToGS('peopleData', peopleFinal);
output += '  writeRowsToSheet(\'people\', peopleData);\n\n';

output += arrayToGS('songsData', songs);
output += '  writeRowsToSheet(\'songs\', songsData);\n\n';

output += arrayToGS('songCreditsData', songCreditsList);
output += '  writeRowsToSheet(\'song_credits\', songCreditsData);\n\n';

// lyrics (these can be very large, split into chunks of 20)
const LYRICS_CHUNK = 20;
for (let i = 0; i < lyricsList.length; i += LYRICS_CHUNK) {
  const chunk = lyricsList.slice(i, i + LYRICS_CHUNK);
  const varName = `lyricsChunk${Math.floor(i / LYRICS_CHUNK)}`;
  output += arrayToGS(varName, chunk);
  output += `  writeRowsToSheet('lyrics', ${varName});\n`;
  // after first chunk, we need to append not overwrite
  if (i === 0) {
    output += `  // Note: subsequent chunks append after existing rows\n`;
  }
  output += '\n';
}

output += arrayToGS('songStatsData', songStatsList);
output += '  writeRowsToSheet(\'song_stats\', songStatsData);\n\n';

output += arrayToGS('artworkData', artworkList);
output += '  writeRowsToSheet(\'artwork\', artworkData);\n\n';

output += arrayToGS('releaseArtData', releaseArtList);
output += '  writeRowsToSheet(\'release_art\', releaseArtData);\n\n';

output += arrayToGS('artCreditsData', artCreditsList);
output += '  writeRowsToSheet(\'art_credits\', artCreditsData);\n\n';

output += `  Logger.log('Database seeded successfully with ' + ${songs.length} + ' songs, ' + ${artworkList.length} + ' artwork entries.');\n`;
output += `}\n`;

// Fix the lyrics writeRowsToSheet calls - after the first call we need to append
// Actually, the writeRowsToSheet in Code.gs always writes at row 2.
// We need a different approach for chunked writes. Let's use appendRowsToSheet.

// Let's add an append helper and fix the lyrics section
let finalOutput = output.replace(
  /writeRowsToSheet\('lyrics', lyricsChunk(\d+)\)/g,
  (match, num) => {
    if (num === '0') return "writeRowsToSheet('lyrics', lyricsChunk0)";
    return `appendRowsToSheet('lyrics', lyricsChunk${num})`;
  }
);

// Add the append helper at the top of the file
finalOutput = finalOutput.replace(
  'function seedDatabase() {',
  `// Helper to append rows (used for large datasets like lyrics)
function appendRowsToSheet(sheetName, rows) {
  if (!rows || rows.length === 0) return;
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(sheetName);
  if (!sheet) { Logger.log('Sheet not found: ' + sheetName); return; }

  var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  var lastRow = sheet.getLastRow();

  var data = rows.map(function(row) {
    return headers.map(function(h) {
      return row[h] !== undefined ? row[h] : '';
    });
  });

  if (data.length > 0) {
    sheet.getRange(lastRow + 1, 1, data.length, headers.length).setValues(data);
  }
  Logger.log('Appended ' + data.length + ' rows to ' + sheetName);
}

function seedDatabase() {`
);

fs.writeFileSync(OUT_FILE, finalOutput, 'utf-8');

console.log('\n=== SEED GENERATION COMPLETE ===');
console.log(`Songs:    ${songs.length}`);
console.log(`Releases: ${releases.length}`);
console.log(`People:   ${peopleFinal.length}`);
console.log(`Credits:  ${songCreditsList.length}`);
console.log(`Lyrics:   ${lyricsList.filter((l) => l.lyrics_text).length} with text`);
console.log(`Artwork:  ${artworkList.length}`);
console.log(`Art Cred: ${artCreditsList.length}`);
console.log(`\nOutput:   ${OUT_FILE}`);
console.log('\nNext steps:');
console.log('  1. Open your Google Sheet "Discography"');
console.log('  2. Extensions > Apps Script');
console.log('  3. Paste Code.gs content');
console.log('  4. Create new file "Seed.gs" and paste generated content');
console.log('  5. Run setupSheets()');
console.log('  6. Run seedDatabase()');
console.log('  7. Deploy as web app');
