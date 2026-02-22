/**
 * Pure functions for filtering, sorting, and paginating the candidates list.
 * No side effects; all functions return new arrays/objects.
 */

/**
 * Filter candidates by a text query (matches anywhere in the name).
 * @param {Array} list
 * @param {{ query: string }} opts
 */
export function filterCandidates(list, { query = '' }) {
    const q = query.trim().toLowerCase();
    if (!q) return list;
    return list.filter(c => c.name.toLowerCase().includes(q));
}

/**
 * Sort candidates by a field.
 * @param {Array} list
 * @param {{ field: string, dir: 'asc'|'desc' }} opts
 */
export function sortCandidates(list, { field = 'total_raised', dir = 'desc' }) {
    return [...list].sort((a, b) => {
        let av = a[field];
        let bv = b[field];

        // Numeric fields stored as strings
        if (field === 'total_raised') {
            av = parseFloat(av) || 0;
            bv = parseFloat(bv) || 0;
        } else if (field === 'total_contributions') {
            av = Number(av) || 0;
            bv = Number(bv) || 0;
        } else {
            // String comparison
            av = String(av).toLowerCase();
            bv = String(bv).toLowerCase();
        }

        if (av < bv) return dir === 'asc' ? -1 : 1;
        if (av > bv) return dir === 'asc' ? 1 : -1;
        return 0;
    });
}

/**
 * Return a single page of a list.
 * @param {Array} list
 * @param {{ page: number, perPage: number }} opts
 * @returns {{ items: Array, totalPages: number, totalItems: number }}
 */
export function paginate(list, { page = 1, perPage = 25 }) {
    const totalItems = list.length;
    const totalPages = Math.max(1, Math.ceil(totalItems / perPage));
    const safePage = Math.min(Math.max(1, page), totalPages);
    const start = (safePage - 1) * perPage;
    return {
        items: list.slice(start, start + perPage),
        totalPages,
        totalItems,
        page: safePage,
    };
}
