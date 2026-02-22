/**
 * Candidate detail page — loads per-candidate JSON and renders stats, charts,
 * timeline with phase filtering, and a paginated contributions table.
 */
import { loadJSON } from './data-loader.js';
import { formatCurrency, formatCompact, formatDate } from './utils.js';
import { createDonutChart, createBarChart, createTimelineChart } from './chart-helpers.js';
import { filterByMonthForPhase } from './election-calendar.js';
import { paginate } from './filter-engine.js';

const PER_PAGE = 25;
const BASE = import.meta.env.BASE_URL.replace(/\/$/, '');

let candidate = null;
let timelineChart = null;
let currentPhase = 'all';
let contribSortField = 'date';
let contribSortDir = 'desc';
let contribPage = 1;

async function init() {
    const id = new URLSearchParams(window.location.search).get('id');
    if (!id) {
        showError();
        return;
    }

    try {
        candidate = await loadJSON(`candidates/${id}.json`);
        document.title = `${titleCase(candidate.name)} — Follow the Money IN`;

        renderHeader();
        renderStatCards();
        renderDonutChart();
        renderSizeChart();
        renderTimeline();
        renderContributions();
        attachListeners();
    } catch (err) {
        console.error('Failed to load candidate:', err);
        showError();
    }
}

function renderHeader() {
    const nameEl = document.getElementById('candidate-name');
    if (nameEl) nameEl.textContent = titleCase(candidate.name);

    const badgesEl = document.getElementById('candidate-badges');
    if (badgesEl) {
        const badges = [];
        if (candidate.party) {
            const partyColor = partyBadgeClass(candidate.party);
            badges.push(`<span class="inline-block px-2 py-0.5 rounded text-xs font-semibold ${partyColor}">${escapeHtml(candidate.party)}</span>`);
        }
        if (candidate.office) {
            badges.push(`<span class="inline-block px-2 py-0.5 rounded text-xs bg-gray-700 text-gray-300">${escapeHtml(candidate.office)}</span>`);
        }
        if (candidate.district) {
            badges.push(`<span class="inline-block px-2 py-0.5 rounded text-xs bg-gray-700 text-gray-300">${escapeHtml(candidate.district)}</span>`);
        }
        const sourceBg = candidate.source === 'fec' ? 'bg-purple-900 text-purple-300' : 'bg-blue-900 text-blue-300';
        badges.push(`<span class="inline-block px-2 py-0.5 rounded text-xs uppercase tracking-wide ${sourceBg}">${escapeHtml(candidate.source)}</span>`);
        badgesEl.innerHTML = badges.join('');
    }

    // Show race link if office is set
    if (candidate.office) {
        const raceId = buildRaceId(candidate.office, candidate.district);
        const linkContainer = document.getElementById('race-link-container');
        const raceLink = document.getElementById('race-link');
        if (linkContainer && raceLink) {
            raceLink.href = `${BASE}/race.html?id=${encodeURIComponent(raceId)}`;
            linkContainer.classList.remove('hidden');
        }
    }
}

function renderStatCards() {
    const { totals } = candidate;
    const avg = totals.total_contributions > 0
        ? (parseFloat(totals.total_raised) / totals.total_contributions).toFixed(2)
        : '0';
    const itemizedPct = totals.total_contributions > 0
        ? ((totals.total_itemized / totals.total_contributions) * 100).toFixed(1)
        : '0';

    setText('stat-total-raised', formatCurrency(totals.total_raised));
    setText('stat-total-contributions', totals.total_contributions.toLocaleString());
    setText('stat-itemized', `${itemizedPct}%`);
    setText('stat-avg', formatCurrency(avg));
}

function renderDonutChart() {
    const canvas = document.getElementById('chart-contributor-type');
    if (!canvas) return;

    const typeData = candidate.by_contributor_type;
    const order = ['individual', 'corporate', 'committee', 'self', 'unitemized'];
    const labels = [];
    const values = [];
    for (const key of order) {
        if (typeData[key]) {
            labels.push(key.charAt(0).toUpperCase() + key.slice(1));
            values.push(typeData[key].count);
        }
    }
    for (const [key, val] of Object.entries(typeData)) {
        if (!order.includes(key)) {
            labels.push(key);
            values.push(val.count);
        }
    }
    createDonutChart(canvas, { labels, values });
}

function renderSizeChart() {
    const canvas = document.getElementById('chart-contribution-size');
    if (!canvas) return;

    const sizeData = candidate.by_contribution_size;
    const order = ['small', 'medium', 'large', 'mega'];
    const labelMap = { small: 'Small (<$100)', medium: 'Medium (<$1K)', large: 'Large (<$10K)', mega: 'Mega (≥$10K)' };
    const labels = [];
    const values = [];
    for (const key of order) {
        if (sizeData[key]) {
            labels.push(labelMap[key] || key);
            values.push(sizeData[key].count);
        }
    }
    createBarChart(canvas, { labels, values, label: 'Contributions' });
}

function renderTimeline() {
    const canvas = document.getElementById('chart-timeline');
    if (!canvas || !candidate.by_month) return;

    // Determine year from most common contribution year
    const year = detectElectionYear(candidate.by_month);

    const filtered = filterByMonthForPhase(candidate.by_month, currentPhase, year);
    const sortedMonths = Object.keys(filtered).sort();

    const labels = sortedMonths.map(ym => formatYearMonth(ym));
    const data = sortedMonths.map(ym => parseFloat(filtered[ym].total));

    if (timelineChart) {
        timelineChart.destroy();
        timelineChart = null;
    }

    if (sortedMonths.length === 0) {
        canvas.parentElement.innerHTML = '<p class="text-gray-500 text-sm text-center py-8">No data for selected phase.</p>';
        return;
    }

    timelineChart = createTimelineChart(canvas, {
        labels,
        datasets: [{ label: 'Amount Raised', data }],
    });
}

function renderContributions() {
    const contribs = candidate.contributions || [];
    const sorted = sortContributions(contribs);
    const { items, totalPages, totalItems, page } = paginate(sorted, { page: contribPage, perPage: PER_PAGE });

    const tbody = document.getElementById('contributions-body');
    if (tbody) {
        if (items.length === 0) {
            tbody.innerHTML = `<tr><td colspan="5" class="py-10 text-center text-gray-500">No contributions found.</td></tr>`;
        } else {
            tbody.innerHTML = items.map(c => `
                <tr class="border-b border-gray-700 hover:bg-gray-750 transition-colors">
                    <td class="py-3 px-4 text-gray-300 whitespace-nowrap">${c.date ? escapeHtml(c.date.slice(0, 10)) : '—'}</td>
                    <td class="py-3 px-4 text-right font-mono text-green-400">${formatCurrency(c.amount)}</td>
                    <td class="py-3 px-4 text-gray-200">${c.contributor_name ? escapeHtml(titleCase(c.contributor_name)) : '<span class="text-gray-600">—</span>'}</td>
                    <td class="py-3 px-4 text-gray-400 text-xs">${escapeHtml(c.contributor_type || '—')}</td>
                    <td class="py-3 px-4 text-gray-400 text-xs">${formatLocation(c)}</td>
                </tr>
            `).join('');
        }
    }

    const countEl = document.getElementById('contrib-count');
    if (countEl) countEl.textContent = `${contribs.length.toLocaleString()} total`;

    const info = document.getElementById('contrib-pagination-info');
    if (info) {
        const start = (page - 1) * PER_PAGE + 1;
        const end = Math.min(page * PER_PAGE, totalItems);
        info.textContent = totalItems > 0 ? `Showing ${start}–${end} of ${totalItems.toLocaleString()}` : '';
    }

    const prevBtn = document.getElementById('contrib-prev-btn');
    const nextBtn = document.getElementById('contrib-next-btn');
    if (prevBtn) prevBtn.disabled = page <= 1;
    if (nextBtn) nextBtn.disabled = page >= totalPages;

    updateContribSortIndicators();
}

function sortContributions(contribs) {
    return [...contribs].sort((a, b) => {
        let av, bv;
        if (contribSortField === 'amount') {
            av = parseFloat(a.amount) || 0;
            bv = parseFloat(b.amount) || 0;
        } else {
            av = a.date || '';
            bv = b.date || '';
        }
        if (av < bv) return contribSortDir === 'asc' ? -1 : 1;
        if (av > bv) return contribSortDir === 'asc' ? 1 : -1;
        return 0;
    });
}

function attachListeners() {
    // Phase toggle
    document.querySelectorAll('.phase-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            currentPhase = btn.dataset.phase;
            document.querySelectorAll('.phase-btn').forEach(b => {
                const active = b.dataset.phase === currentPhase;
                b.className = active
                    ? 'phase-btn px-3 py-1.5 bg-blue-600 text-white'
                    : 'phase-btn px-3 py-1.5 bg-gray-700 text-gray-300 hover:bg-gray-600';
            });
            renderTimeline();
        });
    });

    // Contribution table sort
    document.querySelectorAll('#contributions-body').length; // ensure table exists
    document.querySelectorAll('[data-sort]').forEach(th => {
        th.addEventListener('click', () => {
            const field = th.dataset.sort;
            if (contribSortField === field) {
                contribSortDir = contribSortDir === 'desc' ? 'asc' : 'desc';
            } else {
                contribSortField = field;
                contribSortDir = field === 'date' ? 'desc' : 'desc';
            }
            contribPage = 1;
            renderContributions();
        });
    });

    // Contributions pagination
    document.getElementById('contrib-prev-btn')?.addEventListener('click', () => {
        if (contribPage > 1) { contribPage--; renderContributions(); }
    });
    document.getElementById('contrib-next-btn')?.addEventListener('click', () => {
        const sorted = sortContributions(candidate.contributions || []);
        const { totalPages } = paginate(sorted, { page: contribPage, perPage: PER_PAGE });
        if (contribPage < totalPages) { contribPage++; renderContributions(); }
    });
}

function updateContribSortIndicators() {
    document.querySelectorAll('[data-sort]').forEach(th => {
        const field = th.dataset.sort;
        const indicator = th.querySelector('.sort-indicator');
        if (!indicator) return;
        indicator.textContent = field === contribSortField
            ? (contribSortDir === 'desc' ? ' ↓' : ' ↑')
            : '';
    });
}

// ── Helpers ────────────────────────────────────────────────────────────────

function showError() {
    document.getElementById('error-banner')?.classList.remove('hidden');
    setText('candidate-name', 'Candidate Not Found');
}

function setText(id, text) {
    const el = document.getElementById(id);
    if (el) el.textContent = text;
}

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

function formatLocation(contrib) {
    const parts = [contrib.address_city, contrib.address_state].filter(Boolean);
    return parts.length > 0 ? escapeHtml(parts.join(', ')) : '—';
}

function formatYearMonth(ym) {
    const [year, month] = ym.split('-');
    const d = new Date(Number(year), Number(month) - 1, 1);
    return d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
}

function detectElectionYear(byMonth) {
    if (!byMonth) return 2024;
    const months = Object.keys(byMonth);
    if (months.length === 0) return 2024;
    // Use the latest year in the data
    const years = months.map(ym => parseInt(ym.slice(0, 4), 10));
    return Math.max(...years);
}

function partyBadgeClass(party) {
    const p = (party || '').toUpperCase();
    if (p.includes('REP') || p === 'R') return 'bg-red-900 text-red-300';
    if (p.includes('DEM') || p === 'D') return 'bg-blue-900 text-blue-300';
    return 'bg-gray-700 text-gray-300';
}

function buildRaceId(office, district) {
    const slugify = s => s.toLowerCase().replace(/[^a-z0-9\s-]/g, '').trim().replace(/\s+/g, '-');
    return district ? `${slugify(office)}-${slugify(district)}` : slugify(office);
}

init();
