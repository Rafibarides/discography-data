import { CACHE_KEY, CACHE_TS_KEY, SCRIPT_URL_KEY, CACHE_MAX_AGE } from './constants';

const DEFAULT_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbygCOycOPsI0RZbQ7j_aIwVTooKs1y5O9AkRWtNOUc3BdGpX9ZStP1mipleMppdkjMNXw/exec';

export function getScriptUrl() {
  return localStorage.getItem(SCRIPT_URL_KEY) || DEFAULT_SCRIPT_URL;
}

export function setScriptUrl(url) {
  localStorage.setItem(SCRIPT_URL_KEY, url);
}

export async function fetchFromSheet() {
  const url = getScriptUrl();
  if (!url) {
    throw new Error('Google Apps Script URL not configured. Click the settings icon to add it.');
  }

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch data: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();
  return data;
}

export function getCachedData() {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    const ts = localStorage.getItem(CACHE_TS_KEY);
    if (!raw || !ts) return null;

    const age = Date.now() - Number(ts);
    if (age > CACHE_MAX_AGE) return null;

    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function setCachedData(data) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(data));
    localStorage.setItem(CACHE_TS_KEY, String(Date.now()));
  } catch (e) {
    console.warn('Failed to cache data:', e.message);
  }
}

export function clearCache() {
  localStorage.removeItem(CACHE_KEY);
  localStorage.removeItem(CACHE_TS_KEY);
}
