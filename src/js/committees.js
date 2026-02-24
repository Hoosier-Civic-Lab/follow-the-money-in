/**
 * Committees listing page — search, sort, paginate.
 */
import { loadJSON } from './data-loader.js';
import { formatCurrency } from './utils.js';
import { paginate } from './filter-engine.js';

const PER_PAGE = 25;

let allCommittees = [];
let query = '';
let sortField = 'total_given';
let sortDir = 'desc';
let currentPage = 1;

async function init() {
    try {
        allCommittees = await loadJSON('committees-list.json');
        renderNote(allCommittees.length);
        attachListeners();
        render();
    } catch (err) {
        console.error('Failed to load committees:', err);
        document.getElementById('error-banner').classList.remove('hidden');
    }
}

function renderNote(count) {
    const el = document.getElementById('coverage-note');
    if (!el) return;
    el.textContent = `Showing ${count.toLocaleString()} committees that donated to Indiana candidates.`;
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

const NUMERIC_FIELDS = new Set(['total_given', 'total_contributions', 'candidates_supported']);

function sortCommittees(list) {
    return [...list].sort((a, b) => {
        let av = a[sortField];
        let bv = b[sortField];
        if (NUMERIC_FIELDS.has(sortField)) {
            av = parseFloat(av) || 0;
            bv = parseFloat(bv) || 0;
        } else {
            av = String(av).toLowerCase();
            bv = String(bv).toLowerCase();
        }
        if (av < bv) return sortDir === 'asc' ? -1 : 1;
        if (av > bv) return sortDir === 'asc' ? 1 : -1;
        return 0;
    });
}

function getPagedData() {
    const filtered = allCommittees.filter(c =>
        !query || c.name.toLowerCase().includes(query.toLowerCase())
    );
    const sorted = sortCommittees(filtered);
    return paginate(sorted, { page: currentPage, perPage: PER_PAGE });
}

function render() {
    const { items, totalPages, totalItems, page } = getPagedData();
    renderTable(items);
    renderPagination(page, totalPages, totalItems);
    updateSortIndicators();
}

function renderTable(items) {
    const tbody = document.getElementById('committees-body');
    if (!tbody) return;

    if (items.length === 0) {
        tbody.innerHTML = `<tr><td colspan="4" class="py-10 text-center text-gray-500">No committees match your search.</td></tr>`;
        return;
    }

    const BASE = import.meta.env.BASE_URL.replace(/\/$/, '');
    tbody.innerHTML = items.map(c => `
        <tr class="border-b border-gray-700 hover:bg-gray-750 transition-colors">
            <td class="py-3 px-4">
                <a href="${BASE}/committee.html?id=${encodeURIComponent(c.id)}"
                   class="font-medium text-blue-400 hover:text-blue-300 transition-colors">
                    ${escapeHtml(titleCase(c.name))}
                </a>
            </td>
            <td class="py-3 px-4 text-right font-mono text-green-400">${formatCurrency(c.total_given)}</td>
            <td class="py-3 px-4 text-right text-gray-300">${c.total_contributions.toLocaleString()}</td>
            <td class="py-3 px-4 text-right text-gray-300">${c.candidates_supported.toLocaleString()}</td>
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

init();
