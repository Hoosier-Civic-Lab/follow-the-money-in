/**
 * Races listing page — loads races-list.json and renders a sortable table.
 */
import { loadJSON } from './data-loader.js';
import { formatCurrency } from './utils.js';

const BASE = import.meta.env.BASE_URL.replace(/\/$/, '');

let allRaces = [];
let sortField = 'total_raised';
let sortDir = 'desc';

async function init() {
    try {
        allRaces = await loadJSON('races-list.json');
        renderCoverageNote();

        if (allRaces.length === 0) {
            document.getElementById('empty-state')?.classList.remove('hidden');
        } else {
            document.getElementById('races-table-container')?.classList.remove('hidden');
            attachListeners();
            render();
        }
    } catch (err) {
        console.error('Failed to load races:', err);
        document.getElementById('error-banner')?.classList.remove('hidden');
    }
}

function renderCoverageNote() {
    const el = document.getElementById('coverage-note');
    if (!el) return;
    if (allRaces.length === 0) {
        el.textContent = 'No enriched races available. Run the candidate enrichment pipeline to populate this page.';
    } else {
        el.textContent = `Showing ${allRaces.length.toLocaleString()} race${allRaces.length !== 1 ? 's' : ''} with candidate office data.`;
    }
}

function attachListeners() {
    document.querySelectorAll('[data-sort]').forEach(th => {
        th.addEventListener('click', () => {
            const field = th.dataset.sort;
            if (sortField === field) {
                sortDir = sortDir === 'desc' ? 'asc' : 'desc';
            } else {
                sortField = field;
                sortDir = field === 'office' ? 'asc' : 'desc';
            }
            render();
        });
    });
}

function render() {
    const sorted = sortRaces(allRaces);
    renderTable(sorted);
    updateSortIndicators();
}

function sortRaces(races) {
    return [...races].sort((a, b) => {
        let av = a[sortField];
        let bv = b[sortField];

        if (sortField === 'total_raised') {
            av = parseFloat(av) || 0;
            bv = parseFloat(bv) || 0;
        } else if (sortField === 'total_contributions' || sortField === 'candidate_count') {
            av = Number(av) || 0;
            bv = Number(bv) || 0;
        } else {
            av = String(av || '').toLowerCase();
            bv = String(bv || '').toLowerCase();
        }

        if (av < bv) return sortDir === 'asc' ? -1 : 1;
        if (av > bv) return sortDir === 'asc' ? 1 : -1;
        return 0;
    });
}

function renderTable(races) {
    const tbody = document.getElementById('races-body');
    if (!tbody) return;

    tbody.innerHTML = races.map(r => `
        <tr class="border-b border-gray-700 hover:bg-gray-750 transition-colors">
            <td class="py-3 px-4">
                <a href="${BASE}/race.html?id=${encodeURIComponent(r.id)}"
                   class="font-medium text-blue-400 hover:text-blue-300 transition-colors">
                    ${escapeHtml(r.office)}
                </a>
            </td>
            <td class="py-3 px-4 text-gray-300">${r.district ? escapeHtml(r.district) : '<span class="text-gray-600">—</span>'}</td>
            <td class="py-3 px-4 text-right font-mono text-green-400">${formatCurrency(r.total_raised)}</td>
            <td class="py-3 px-4 text-right text-gray-300">${r.total_contributions.toLocaleString()}</td>
            <td class="py-3 px-4 text-right text-gray-300">${r.candidate_count}</td>
        </tr>
    `).join('');
}

function updateSortIndicators() {
    document.querySelectorAll('[data-sort]').forEach(th => {
        const field = th.dataset.sort;
        const indicator = th.querySelector('.sort-indicator');
        if (!indicator) return;
        indicator.textContent = field === sortField
            ? (sortDir === 'desc' ? ' ↓' : ' ↑')
            : '';
    });
}

function escapeHtml(str) {
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

init();
