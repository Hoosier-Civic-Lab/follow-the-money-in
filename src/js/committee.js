/**
 * Committee detail page — loads per-committee JSON and renders stats, charts,
 * top recipients table, and a paginated contributions table.
 */
import { loadJSON } from './data-loader.js';
import { formatCurrency } from './utils.js';
import { createBarChart, createTimelineChart } from './chart-helpers.js';
import { paginate } from './filter-engine.js';

const PER_PAGE = 25;
const BASE = import.meta.env.BASE_URL.replace(/\/$/, '');

let committee = null;
let timelineChart = null;
let contribSortField = 'date';
let contribSortDir = 'desc';
let contribPage = 1;
let receiptSortField = 'date';
let receiptSortDir = 'desc';
let receiptPage = 1;

async function init() {
    const id = new URLSearchParams(window.location.search).get('id');
    if (!id) {
        showError();
        return;
    }

    try {
        committee = await loadJSON(`committees/${id}.json`);
        document.title = `${titleCase(committee.name)} — Follow the Money IN`;

        renderHeader();
        renderStatCards();
        renderSizeChart();
        renderTimeline();
        renderTopRecipients();
        renderContributions();
        renderReceipts();
        attachListeners();
    } catch (err) {
        console.error('Failed to load committee:', err);
        showError();
    }
}

function renderHeader() {
    setText('committee-name', titleCase(committee.name));
}

function renderStatCards() {
    const { totals } = committee;
    const avg = totals.total_contributions > 0
        ? (parseFloat(totals.total_given) / totals.total_contributions).toFixed(2)
        : '0';

    setText('stat-total-given', formatCurrency(totals.total_given));
    setText('stat-total-contributions', totals.total_contributions.toLocaleString());
    setText('stat-candidates-supported', totals.candidates_supported.toLocaleString());
    setText('stat-avg', formatCurrency(avg));
}

function renderSizeChart() {
    const canvas = document.getElementById('chart-contribution-size');
    if (!canvas) return;

    const sizeData = committee.by_contribution_size;
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
    if (!canvas || !committee.by_month) return;

    const sortedMonths = Object.keys(committee.by_month).sort();
    const labels = sortedMonths.map(ym => formatYearMonth(ym));
    const data = sortedMonths.map(ym => parseFloat(committee.by_month[ym].total));

    if (timelineChart) {
        timelineChart.destroy();
        timelineChart = null;
    }

    if (sortedMonths.length === 0) {
        canvas.parentElement.innerHTML = '<p class="text-gray-500 text-sm text-center py-8">No timeline data available.</p>';
        return;
    }

    timelineChart = createTimelineChart(canvas, {
        labels,
        datasets: [{ label: 'Amount Donated', data }],
    });
}

function renderTopRecipients() {
    const tbody = document.getElementById('recipients-body');
    if (!tbody) return;

    const recipients = (committee.top_recipients || []).slice(0, 10);

    if (recipients.length === 0) {
        tbody.innerHTML = `<tr><td colspan="3" class="py-10 text-center text-gray-500">No recipient data available.</td></tr>`;
        return;
    }

    tbody.innerHTML = recipients.map(r => `
        <tr class="border-b border-gray-700 hover:bg-gray-750 transition-colors">
            <td class="py-3 px-4">
                <a href="${BASE}/candidate.html?id=${encodeURIComponent(r.id)}"
                   class="font-medium text-blue-400 hover:text-blue-300 transition-colors">
                    ${escapeHtml(titleCase(r.name))}
                </a>
            </td>
            <td class="py-3 px-4 text-right font-mono text-green-400">${formatCurrency(r.total)}</td>
            <td class="py-3 px-4 text-right text-gray-300">${r.count.toLocaleString()}</td>
        </tr>
    `).join('');
}

function renderContributions() {
    const contribs = committee.contributions || [];
    const sorted = sortContributions(contribs);
    const { items, totalPages, totalItems, page } = paginate(sorted, { page: contribPage, perPage: PER_PAGE });

    const tbody = document.getElementById('contributions-body');
    if (tbody) {
        if (items.length === 0) {
            tbody.innerHTML = `<tr><td colspan="4" class="py-10 text-center text-gray-500">No contributions found.</td></tr>`;
        } else {
            tbody.innerHTML = items.map(c => `
                <tr class="border-b border-gray-700 hover:bg-gray-750 transition-colors">
                    <td class="py-3 px-4 text-gray-300 whitespace-nowrap">${c.date ? escapeHtml(c.date.slice(0, 10)) : '—'}</td>
                    <td class="py-3 px-4 text-right font-mono text-green-400">${formatCurrency(c.amount)}</td>
                    <td class="py-3 px-4 text-gray-200">
                        ${c.candidate_name
                            ? `<a href="${BASE}/candidate.html?id=${encodeURIComponent(slugify(c.candidate_name))}"
                                  class="text-blue-400 hover:text-blue-300 transition-colors">
                                   ${escapeHtml(titleCase(c.candidate_name))}
                               </a>`
                            : '<span class="text-gray-600">—</span>'
                        }
                    </td>
                    <td class="py-3 px-4 text-gray-400 text-xs">${sizeBadge(c.contribution_size)}</td>
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

function renderReceipts() {
    const receipts = committee.receipts;
    const section = document.getElementById('receipts-section');
    if (!section) return;

    if (!receipts || receipts.total_contributions === 0) {
        // No incoming data — keep section hidden
        return;
    }

    section.classList.remove('hidden');

    // Stat cards
    setText('receipt-stat-total-raised', formatCurrency(receipts.total_raised));
    setText('receipt-stat-total-contributions', receipts.total_contributions.toLocaleString());
    setText('receipt-stat-unique-donors', receipts.unique_donors.toLocaleString());

    // Top donors table
    const topDonorsTbody = document.getElementById('top-donors-body');
    if (topDonorsTbody) {
        const donors = receipts.top_donors || [];
        if (donors.length === 0) {
            topDonorsTbody.innerHTML = `<tr><td colspan="4" class="py-10 text-center text-gray-500">No donor data.</td></tr>`;
        } else {
            topDonorsTbody.innerHTML = donors.map(d => `
                <tr class="border-b border-gray-700 hover:bg-gray-750 transition-colors">
                    <td class="py-3 px-4 text-gray-200">${escapeHtml(titleCase(d.name))}</td>
                    <td class="py-3 px-4">${typeBadge(d.type)}</td>
                    <td class="py-3 px-4 text-right font-mono text-green-400">${formatCurrency(d.total)}</td>
                    <td class="py-3 px-4 text-right text-gray-300">${d.count.toLocaleString()}</td>
                </tr>
            `).join('');
        }
    }

    renderReceiptRows();
}

function renderReceiptRows() {
    const receipts = committee.receipts;
    if (!receipts) return;

    const all = receipts.contributions || [];
    const sorted = [...all].sort((a, b) => {
        let av, bv;
        if (receiptSortField === 'amount') {
            av = parseFloat(a.amount) || 0;
            bv = parseFloat(b.amount) || 0;
        } else {
            av = a.date || '';
            bv = b.date || '';
        }
        if (av < bv) return receiptSortDir === 'asc' ? -1 : 1;
        if (av > bv) return receiptSortDir === 'asc' ? 1 : -1;
        return 0;
    });

    const { items, totalPages, totalItems, page } = paginate(sorted, { page: receiptPage, perPage: PER_PAGE });

    const tbody = document.getElementById('receipts-body');
    if (tbody) {
        if (items.length === 0) {
            tbody.innerHTML = `<tr><td colspan="4" class="py-10 text-center text-gray-500">No donations found.</td></tr>`;
        } else {
            tbody.innerHTML = items.map(c => `
                <tr class="border-b border-gray-700 hover:bg-gray-750 transition-colors">
                    <td class="py-3 px-4 text-gray-300 whitespace-nowrap">${c.date ? escapeHtml(c.date.slice(0, 10)) : '—'}</td>
                    <td class="py-3 px-4 text-right font-mono text-green-400">${formatCurrency(c.amount)}</td>
                    <td class="py-3 px-4 text-gray-200">${escapeHtml(titleCase(c.contributor_name || '—'))}</td>
                    <td class="py-3 px-4 text-xs">${typeBadge(c.contributor_type)}</td>
                </tr>
            `).join('');
        }
    }

    const countEl = document.getElementById('receipt-count');
    if (countEl) countEl.textContent = `${all.length.toLocaleString()} total`;

    const info = document.getElementById('receipt-pagination-info');
    if (info) {
        const start = (page - 1) * PER_PAGE + 1;
        const end = Math.min(page * PER_PAGE, totalItems);
        info.textContent = totalItems > 0 ? `Showing ${start}–${end} of ${totalItems.toLocaleString()}` : '';
    }

    const prevBtn = document.getElementById('receipt-prev-btn');
    const nextBtn = document.getElementById('receipt-next-btn');
    if (prevBtn) prevBtn.disabled = page <= 1;
    if (nextBtn) nextBtn.disabled = page >= totalPages;

    updateReceiptSortIndicators();
}

function updateReceiptSortIndicators() {
    document.querySelectorAll('[data-receipt-sort]').forEach(th => {
        const field = th.dataset.receiptSort;
        const indicator = th.querySelector('.receipt-sort-indicator');
        if (!indicator) return;
        indicator.textContent = field === receiptSortField
            ? (receiptSortDir === 'desc' ? ' ↓' : ' ↑')
            : '';
    });
}

function attachListeners() {
    document.querySelectorAll('[data-sort]').forEach(th => {
        th.addEventListener('click', () => {
            const field = th.dataset.sort;
            if (contribSortField === field) {
                contribSortDir = contribSortDir === 'desc' ? 'asc' : 'desc';
            } else {
                contribSortField = field;
                contribSortDir = 'desc';
            }
            contribPage = 1;
            renderContributions();
        });
    });

    document.getElementById('contrib-prev-btn')?.addEventListener('click', () => {
        if (contribPage > 1) { contribPage--; renderContributions(); }
    });
    document.getElementById('contrib-next-btn')?.addEventListener('click', () => {
        const sorted = sortContributions(committee.contributions || []);
        const { totalPages } = paginate(sorted, { page: contribPage, perPage: PER_PAGE });
        if (contribPage < totalPages) { contribPage++; renderContributions(); }
    });

    // Receipt table sort headers
    document.querySelectorAll('[data-receipt-sort]').forEach(th => {
        th.addEventListener('click', () => {
            const field = th.dataset.receiptSort;
            if (receiptSortField === field) {
                receiptSortDir = receiptSortDir === 'desc' ? 'asc' : 'desc';
            } else {
                receiptSortField = field;
                receiptSortDir = 'desc';
            }
            receiptPage = 1;
            renderReceiptRows();
        });
    });

    document.getElementById('receipt-prev-btn')?.addEventListener('click', () => {
        if (receiptPage > 1) { receiptPage--; renderReceiptRows(); }
    });
    document.getElementById('receipt-next-btn')?.addEventListener('click', () => {
        const all = committee.receipts?.contributions || [];
        const { totalPages } = paginate(all, { page: receiptPage, perPage: PER_PAGE });
        if (receiptPage < totalPages) { receiptPage++; renderReceiptRows(); }
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
    setText('committee-name', 'Committee Not Found');
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

function slugify(name) {
    return name
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '')
        .trim()
        .replace(/\s+/g, '-');
}

function formatYearMonth(ym) {
    const [year, month] = ym.split('-');
    const d = new Date(Number(year), Number(month) - 1, 1);
    return d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
}

function typeBadge(type) {
    if (!type) return '—';
    const colorMap = {
        individual: 'bg-blue-900 text-blue-300',
        corporate: 'bg-amber-900 text-amber-300',
        committee: 'bg-purple-900 text-purple-300',
        unitemized: 'bg-gray-700 text-gray-400',
    };
    const cls = colorMap[type] || 'bg-gray-700 text-gray-300';
    return `<span class="inline-block px-2 py-0.5 rounded text-xs ${cls}">${escapeHtml(type)}</span>`;
}

function sizeBadge(size) {
    if (!size) return '—';
    const colorMap = {
        small: 'bg-gray-700 text-gray-300',
        medium: 'bg-blue-900 text-blue-300',
        large: 'bg-amber-900 text-amber-300',
        mega: 'bg-red-900 text-red-300',
    };
    const cls = colorMap[size] || 'bg-gray-700 text-gray-300';
    return `<span class="inline-block px-2 py-0.5 rounded text-xs ${cls}">${escapeHtml(size)}</span>`;
}

init();
