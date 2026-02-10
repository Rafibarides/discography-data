const SMALL_WORDS = new Set([
  'a', 'an', 'the', 'and', 'but', 'or', 'for', 'nor',
  'in', 'on', 'at', 'to', 'of', 'by', 'up', 'as', 'is',
  'if', 'it', 'my', 'so', 'no', 'do', 'vs',
]);

export function titleCase(str) {
  if (!str) return '';
  return str
    .toLowerCase()
    .split(' ')
    .map((word, index) => {
      if (index === 0) return capitalize(word);
      if (word.startsWith('(')) return '(' + capitalize(word.slice(1));
      if (SMALL_WORDS.has(word)) return word;
      return capitalize(word);
    })
    .join(' ');
}

function capitalize(word) {
  if (!word) return '';
  return word.charAt(0).toUpperCase() + word.slice(1);
}

export function normalizeTitle(raw) {
  if (!raw) return '';
  let t = raw.trim();
  if (t === t.toUpperCase() && t.length > 3) {
    t = titleCase(t);
  }
  if (t === t.toLowerCase() && t.length > 3) {
    t = titleCase(t);
  }
  t = t.replace(/\s+/g, ' ');
  return t;
}

export function formatDuration(seconds) {
  if (!seconds || seconds <= 0) return '--:--';
  const m = Math.floor(seconds / 60);
  const s = Math.round(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export function formatLongDuration(seconds) {
  if (!seconds || seconds <= 0) return '--';
  const h = Math.floor(seconds / 3600);
  const m = Math.round((seconds % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

export function formatDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

export function slugify(str) {
  return str
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

export function getKeyQuality(key) {
  if (!key) return 'unknown';
  const lower = key.toLowerCase();
  if (lower.includes('minor') || lower.endsWith('m')) return 'minor';
  if (lower.includes('major')) return 'major';
  return 'major';
}

export function parseBoolean(val) {
  if (typeof val === 'boolean') return val;
  if (typeof val === 'string') {
    const lower = val.toLowerCase().trim();
    return lower === 'true' || lower === 'yes' || lower === '1';
  }
  return Boolean(val);
}

export function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

export function lerp(a, b, t) {
  return a + (b - a) * clamp(t, 0, 1);
}

export function mapRange(value, inMin, inMax, outMin, outMax) {
  if (inMax === inMin) return outMin;
  return outMin + ((value - inMin) / (inMax - inMin)) * (outMax - outMin);
}

export function debounce(fn, ms) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), ms);
  };
}

export function groupBy(arr, keyFn) {
  const map = {};
  arr.forEach((item) => {
    const key = keyFn(item);
    if (!map[key]) map[key] = [];
    map[key].push(item);
  });
  return map;
}

export function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function downloadText(text, filename, mimeType = 'text/plain') {
  const blob = new Blob([text], { type: mimeType });
  downloadBlob(blob, filename);
}
