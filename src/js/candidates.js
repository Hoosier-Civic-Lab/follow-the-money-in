/**
 * Candidates listing page — search, sort, paginate.
 */
import { loadJSON } from './data-loader.js';
import { formatCurrency, formatCompact } from './utils.js';
import { filterCandidates, sortCandidates, paginate } from './filter-engine.js';

const PER_PAGE = 25;

let allCandidates = [];
let query = '';
let sortField = 'total_raised';
let sortDir = 'desc';
let currentPage = 1;

async function init() {
    try {
        allCandidates = await loadJSON('candidates-list.json');
        const totalRecords = await loadJSON('summary-all-races.json')
            .then(s => s.totals.total_contributions)
            .catch(() => null);

        renderNote(allCandidates.length, totalRecords);
        attachListeners();
        render();
    } catch (err) {
        console.error('Failed to load candidates:', err);
        document.getElementById('error-banner').classList.remove('hidden');
    }
}

function renderNote(candidateCount, totalRecords) {
    const el = document.getElementById('coverage-note');
    if (!el) return;
    if (totalRecords) {
        const pct = ((candidateCount / totalRecords) * 100).toFixed(0);
        el.textContent =
            `Showing ${candidateCount.toLocaleString()} candidates with itemized contributions. ` +
            `Approximately ${pct}% of total contributions are attributed to named candidates.`;
    } else {
        el.textContent = `Showing ${candidateCount.toLocaleString()} candidates with itemized contributions.`;
    }
}

function attachListeners() {
    const searchInput = document.getElementById('search-input');
    if (searchInput) {
        searchInput.addEventListener('input', e => {
            query = e.target.value;
            currentPage = 1;
            render();
        });
    }

    const headers = document.querySelectorAll('[data-sort]');
    headers.forEach(th => {
        th.addEventListener('click', () => {
            const field = th.dataset.sort;
            if (sortField === field) {
                sortDir = sortDir === 'desc' ? 'asc' : 'desc';
            } else {
                sortField = field;
                sortDir = field === 'name' ? 'asc' : 'desc';
            }
            currentPage = 1;
            render();
        });
    });

    document.getElementById('prev-btn')?.addEventListener('click', () => {
        if (currentPage > 1) { currentPage--; render(); }
    });
    document.getElementById('next-btn')?.addEventListener('click', () => {
        const { totalPages } = getPagedData();
        if (currentPage < totalPages) { currentPage++; render(); }
    });
}

function getPagedData() {
    const filtered = filterCandidates(allCandidates, { query });
    const sorted = sortCandidates(filtered, { field: sortField, dir: sortDir });
    return paginate(sorted, { page: currentPage, perPage: PER_PAGE });
}

function render() {
    const { items, totalPages, totalItems, page } = getPagedData();

    renderTable(items);
    renderPagination(page, totalPages, totalItems);
    updateSortIndicators();
}

function renderTable(items) {
    const tbody = document.getElementById('candidates-body');
    if (!tbody) return;

    if (items.length === 0) {
        tbody.innerHTML = `<tr><td colspan="7" class="py-10 text-center text-gray-500">No candidates match your search.</td></tr>`;
        return;
    }

    const BASE = import.meta.env.BASE_URL.replace(/\/$/, '');
    tbody.innerHTML = items.map(c => `
        <tr class="border-b border-gray-700 hover:bg-gray-750 transition-colors">
            <td class="py-3 px-4">
                <a href="${BASE}/candidate.html?id=${encodeURIComponent(c.id)}"
                   class="font-medium text-blue-400 hover:text-blue-300 transition-colors">
                    ${escapeHtml(titleCase(c.name))}
                </a>
            </td>
            <td class="py-3 px-4 text-right font-mono text-green-400">${formatCurrency(c.total_raised)}</td>
            <td class="py-3 px-4 text-left text-gray-300">${c.office ? escapeHtml(c.office) : '<span class="text-gray-600">—</span>'}</td>
            <td class="py-3 px-4 text-left text-gray-300">${c.district ? escapeHtml(c.district) : '<span class="text-gray-600">—</span>'}</td>
            <td class="py-3 px-4 text-left">${partyBadge(c.party)}</td>
            <td class="py-3 px-4 text-right text-gray-300">${c.total_contributions.toLocaleString()}</td>
            <td class="py-3 px-4 text-center">
                <span class="inline-block px-2 py-0.5 rounded text-xs uppercase tracking-wide
                    ${c.source === 'fec' ? 'bg-purple-900 text-purple-300' : 'bg-blue-900 text-blue-300'}">
                    ${escapeHtml(c.source)}
                </span>
            </td>
        </tr>
    `).join('');
}

function renderPagination(page, totalPages, totalItems) {
    const info = document.getElementById('pagination-info');
    const prevBtn = document.getElementById('prev-btn');
    const nextBtn = document.getElementById('next-btn');

    if (info) {
        const start = (page - 1) * PER_PAGE + 1;
        const end = Math.min(page * PER_PAGE, totalItems);
        info.textContent = totalItems > 0
            ? `Showing ${start}–${end} of ${totalItems.toLocaleString()}`
            : 'No results';
    }
    if (prevBtn) prevBtn.disabled = page <= 1;
    if (nextBtn) nextBtn.disabled = page >= totalPages;
}

function updateSortIndicators() {
    document.querySelectorAll('[data-sort]').forEach(th => {
        const field = th.dataset.sort;
        const indicator = th.querySelector('.sort-indicator');
        if (!indicator) return;
        if (field === sortField) {
            indicator.textContent = sortDir === 'desc' ? ' ↓' : ' ↑';
        } else {
            indicator.textContent = '';
        }
    });
}

// ── Helpers ────────────────────────────────────────────────────────────────

function escapeHtml(str) {
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

function titleCase(str) {
    return str.toLowerCase().replace(/\b\w/g, c => c.toUpperCase());
}

function partyBadge(party) {
    if (!party) return '<span class="text-gray-600">—</span>';
    const cls = party.toLowerCase().startsWith('rep')
        ? 'bg-red-900 text-red-300'
        : party.toLowerCase().startsWith('dem')
            ? 'bg-blue-900 text-blue-300'
            : 'bg-gray-700 text-gray-300';
    return `<span class="inline-block px-2 py-0.5 rounded text-xs ${cls}">${escapeHtml(party)}</span>`;
}

init();
