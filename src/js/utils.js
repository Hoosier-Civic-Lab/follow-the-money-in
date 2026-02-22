/**
 * Shared utility functions for the frontend.
 */

/**
 * Format a numeric string or number as USD currency.
 * @param {string|number} value
 */
export function formatCurrency(value) {
    const num = typeof value === 'string' ? parseFloat(value) : value;
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    }).format(num);
}

/**
 * Format a number with compact notation: 95179 → "95.2K", 42700000 → "$42.7M"
 * @param {string|number} value
 * @param {boolean} currency  If true, prepend "$"
 */
export function formatCompact(value, currency = false) {
    const num = typeof value === 'string' ? parseFloat(value) : value;
    let formatted;
    if (Math.abs(num) >= 1_000_000) {
        formatted = `${(num / 1_000_000).toFixed(1)}M`;
    } else if (Math.abs(num) >= 1_000) {
        formatted = `${(num / 1_000).toFixed(1)}K`;
    } else {
        formatted = num.toFixed(0);
    }
    return currency ? `$${formatted}` : formatted;
}

/**
 * Format an ISO date string to a human-readable date.
 * @param {string} iso  e.g. "2025-11-01T00:00:00.000Z"
 */
export function formatDate(iso) {
    if (!iso) return 'Unknown';
    const date = new Date(iso);
    return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        timeZone: 'UTC',
    });
}

/**
 * Convert a string to a URL-safe slug.
 * @param {string} name
 */
export function slugify(name) {
    return name
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '')
        .trim()
        .replace(/\s+/g, '-');
}
