/**
 * Fetch JSON from a path relative to the base URL, with in-memory caching.
 * All paths are resolved relative to import.meta.env.BASE_URL so the same
 * code works both on localhost (/) and on GitHub Pages (/follow-the-money-in/).
 */

const cache = {};
const BASE = import.meta.env.BASE_URL.replace(/\/$/, '');

/**
 * Load a JSON file from data/processed/<path>.
 * @param {string} relativePath  e.g. 'summary-all-races.json'
 */
export async function loadJSON(relativePath) {
    const url = `${BASE}/data/processed/${relativePath}`;
    if (cache[url]) return cache[url];
    const response = await fetch(url);
    if (!response.ok) {
        throw new Error(`Failed to load ${url}: ${response.status} ${response.statusText}`);
    }
    cache[url] = await response.json();
    return cache[url];
}
