/**
 * Homepage initialisation — loads aggregate data and renders stat cards + charts.
 */
import { loadJSON } from './data-loader.js';
import { formatCurrency, formatCompact, formatDate } from './utils.js';
import { createDonutChart, createBarChart } from './chart-helpers.js';

async function init() {
    try {
        const [metadata, summary, candidatesList] = await Promise.all([
            loadJSON('metadata.json'),
            loadJSON('summary-all-races.json'),
            loadJSON('candidates-list.json'),
        ]);

        renderStatusBar(metadata);
        renderStatCards(summary, candidatesList);
        renderContributorTypeChart(summary);
        renderContributionSizeChart(summary);
        renderTop10Table(candidatesList);
    } catch (err) {
        console.error('Failed to load data:', err);
        document.getElementById('error-banner').classList.remove('hidden');
    }
}

function renderStatusBar(metadata) {
    const el = document.getElementById('status-bar');
    if (!el) return;
    const updated = formatDate(metadata.last_updated);
    el.textContent = `Last updated: ${updated}`;
}

function renderStatCards(summary, candidatesList) {
    const { totals } = summary;

    setText('stat-total-raised', formatCompact(totals.total_raised, true));
    setText('stat-total-contributions', formatCompact(totals.total_contributions));
    setText('stat-itemized-pct', `${((totals.total_itemized / totals.total_contributions) * 100).toFixed(1)}%`);
    setText('stat-unique-candidates', candidatesList.length.toLocaleString());
}

function renderContributorTypeChart(summary) {
    const canvas = document.getElementById('chart-contributor-type');
    if (!canvas) return;

    const typeData = summary.by_contributor_type;
    const order = ['individual', 'corporate', 'committee', 'self', 'unitemized'];
    const labels = [];
    const values = [];

    for (const key of order) {
        if (typeData[key]) {
            labels.push(key.charAt(0).toUpperCase() + key.slice(1));
            values.push(typeData[key].count);
        }
    }
    // Any extra types not in the order list
    for (const [key, val] of Object.entries(typeData)) {
        if (!order.includes(key)) {
            labels.push(key);
            values.push(val.count);
        }
    }

    createDonutChart(canvas, { labels, values }, 'Contributor Type');
}

function renderContributionSizeChart(summary) {
    const canvas = document.getElementById('chart-contribution-size');
    if (!canvas) return;

    const sizeData = summary.by_contribution_size;
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

function renderTop10Table(candidatesList) {
    const tbody = document.getElementById('top10-body');
    if (!tbody) return;

    const top10 = candidatesList.slice(0, 10);
    tbody.innerHTML = top10.map((c, i) => `
        <tr class="border-b border-gray-700 hover:bg-gray-750 transition-colors">
            <td class="py-3 px-4 text-gray-400 text-sm">${i + 1}</td>
            <td class="py-3 px-4">
                <a href="candidates.html#${c.id}" class="text-blue-400 hover:text-blue-300 font-medium">
                    ${escapeHtml(titleCase(c.name))}
                </a>
            </td>
            <td class="py-3 px-4 text-right font-mono text-green-400">${formatCurrency(c.total_raised)}</td>
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

// ── Helpers ────────────────────────────────────────────────────────────────

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

init();
