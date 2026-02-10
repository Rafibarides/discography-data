export const CATEGORY_COLORS = {
  'Love & Romance (Positive)': { color: '#FF6B8A', glow: '0 0 8px rgba(255,107,138,0.4)', label: 'Love (Positive)' },
  'Love & Romance (Negative)': { color: '#4A7BFF', glow: '0 0 8px rgba(74,123,255,0.4)', label: 'Love (Negative)' },
  'Social Commentary':         { color: '#FFB347', glow: '0 0 8px rgba(255,179,71,0.4)', label: 'Social Commentary' },
  'Narrative / Storytime':     { color: '#4ECDC4', glow: '0 0 8px rgba(78,205,196,0.4)', label: 'Narrative' },
  'Philosophical':             { color: '#C77DFF', glow: '0 0 8px rgba(199,125,255,0.4)', label: 'Philosophical' },
  'Reflective':                { color: '#78D672', glow: '0 0 8px rgba(120,214,114,0.4)', label: 'Reflective' },
};

export const CATEGORY_LIST = [
  'Love & Romance (Positive)',
  'Love & Romance (Negative)',
  'Social Commentary',
  'Narrative / Storytime',
  'Philosophical',
  'Reflective',
];

export const PERSPECTIVE_LIST = [
  'First person exclusively',
  'Third person exclusively',
  'Both (first + third)',
  'Both (first + second framed socially)',
];

export const ART_TYPES = [
  'rendered',
  'composited',
  'still',
  'graphic_design',
  'illustration',
];

export const CREDIT_ROLE_CATEGORIES = {
  audio: ['mixing', 'mastering', 'production'],
  performance: ['featured_vocals', 'guitar', 'bass', 'synths', 'ukulele', 'backing_vocals'],
  visual: ['photographer', 'designer', '3d_artist'],
};

export const STOP_WORDS = new Set([
  'i', 'me', 'my', 'mine', 'myself',
  'you', 'your', 'yours', 'yourself',
  'he', 'him', 'his', 'she', 'her', 'hers',
  'we', 'us', 'our', 'they', 'them', 'their',
  'it', 'its',
  'a', 'an', 'the',
  'and', 'but', 'or', 'so', 'of', 'to', 'in', 'on', 'at', 'by', 'for', 'with',
  'is', 'am', 'are', 'was', 'were', 'be', 'been', 'being',
  'do', 'does', 'did', 'done',
  'have', 'has', 'had', 'having',
  'will', 'would', 'shall', 'should', 'can', 'could', 'may', 'might', 'must',
  'not', 'no', 'nor',
  'if', 'then', 'than', 'that', 'this', 'these', 'those',
  'up', 'out', 'down', 'off', 'over', 'under',
  'from', 'into', 'about', 'between', 'through', 'after', 'before',
  'all', 'each', 'every', 'both', 'few', 'some', 'any', 'most',
  'just', 'like', 'when', 'what', 'how', 'where', 'who', 'which',
  'as', 'more', 'also', 'here', 'there', 'very', 'too',
  'oh', 'ooh', 'ah', 'ahh', 'na', 'la', 'dum', 'mmm', 'hmm', 'yea', 'yeah',
  'im', "i'm", "i've", "i'll", "i'd",
  "don't", "won't", "can't", "didn't", "doesn't", "isn't", "aren't", "wasn't", "weren't",
  "couldn't", "wouldn't", "shouldn't", "haven't", "hasn't", "hadn't",
  "it's", "that's", "there's", "here's", "what's", "who's",
  "you're", "you've", "you'll", "you'd",
  "he's", "he'd", "he'll", "she's", "she'd", "she'll",
  "we're", "we've", "we'll", "we'd",
  "they're", "they've", "they'll", "they'd",
  'got', 'get', 'go', 'going', 'gone', 'come', 'came',
  'know', 'say', 'said', 'tell', 'told',
  'see', 'look', 'make', 'take', 'give', 'let',
  'been', 'now', 'one', 'two',
  'cause', 'cuz', "'cause",
]);

export const CACHE_KEY = 'discography_data';
export const CACHE_TS_KEY = 'discography_data_ts';
export const SCRIPT_URL_KEY = 'discography_script_url';
export const CACHE_MAX_AGE = 1000 * 60 * 60 * 24;

export const VIEW_MODES = {
  GRID: 'grid',
  HEATMAP: 'heatmap',
  STATS: 'stats',
  TRENDS: 'trends',
  ARTWORK: 'artwork',
};

export const COLOR_BY_OPTIONS = [
  { value: 'category', label: 'Lyric Category' },
  { value: 'perspective', label: 'Perspective' },
  { value: 'year', label: 'Year' },
  { value: 'key_quality', label: 'Major / Minor' },
  { value: 'explicit', label: 'Explicit' },
  { value: 'none', label: 'None' },
];

export const SIZE_BY_OPTIONS = [
  { value: 'none', label: 'Uniform' },
  { value: 'word_count', label: 'Word Count' },
  { value: 'duration', label: 'Duration' },
  { value: 'bpm', label: 'BPM' },
  { value: 'title_length', label: 'Title Length' },
];

export const GROUP_BY_OPTIONS = [
  { value: 'none', label: 'None' },
  { value: 'year', label: 'Year' },
  { value: 'release', label: 'Release' },
  { value: 'category', label: 'Category' },
  { value: 'key_quality', label: 'Major / Minor' },
];

export const YEAR_COLORS = {
  2020: '#FF6B6B',
  2021: '#FFA07A',
  2022: '#FFD93D',
  2023: '#6BCB77',
  2024: '#4D96FF',
  2025: '#9B59B6',
  2026: '#FF6B8A',
};
