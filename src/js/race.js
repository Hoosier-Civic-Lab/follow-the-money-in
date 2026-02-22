/**
 * Race detail page — loads per-race JSON and renders candidate comparison,
 * timeline chart (one line per candidate), and race-level aggregate charts.
 * Phase toggle filters both candidate totals and timeline.
 */
import { loadJSON } from './data-loader.js';
import { formatCurrency } from './utils.js';
import { createDonutChart, createBarChart, createTimelineChart } from './chart-helpers.js';
import { filterByMonthForPhase } from './election-calendar.js';

const BASE = import.meta.env.BASE_URL.replace(/\/$/, '');

let race = null;
let timelineChart = null;
let currentPhase = 'all';

async function init() {
    const id = new URLSearchParams(window.location.search).get('id');
    if (!id) {
        showError();
        return;
    }

    try {
        race = await loadJSON(`races/${id}.json`);
        document.title = `${race.office}${race.district ? ' — ' + race.district : ''} — Follow the Money IN`;

        renderHeader();
        renderStats();
        renderCandidateCards();
        renderTimeline();
        renderRaceCharts();
        attachListeners();
    } catch (err) {
        console.error('Failed to load race:', err);
        showError();
    }
}

function renderHeader() {
    const title = document.getElementById('race-title');
    if (title) {
        title.textContent = race.district
            ? `${race.office} — ${race.district}`
            : race.office;
    }

    const badgesEl = document.getElementById('race-badges');
    if (badgesEl) {
        const badges = [];
        if (race.district) {
            badges.push(`<span class="inline-block px-2 py-0.5 rounded text-xs bg-gray-700 text-gray-300">${escapeHtml(race.district)}</span>`);
        }
        badges.push(`<span class="inline-block px-2 py-0.5 rounded text-xs bg-gray-700 text-gray-300">${race.candidates.length} candidate${race.candidates.length !== 1 ? 's' : ''}</span>`);
        badgesEl.innerHTML = badges.join('');
    }
}

function renderStats() {
    const year = detectElectionYear(race.by_month);
    const filteredMonths = filterByMonthForPhase(race.by_month, currentPhase, year);

    let totalRaised = 0;
    let totalContribs = 0;
    for (const entry of Object.values(filteredMonths)) {
        totalRaised += parseFloat(entry.total);
        totalContribs += entry.count;
    }

    setText('stat-total-raised', formatCurrency(totalRaised));
    setText('stat-total-contributions', totalContribs.toLocaleString());
}

function renderCandidateCards() {
    const container = document.getElementById('candidate-cards');
    if (!container) return;

    const year = detectElectionYear(race.by_month);
    const candidatesWithTotals = race.candidates.map(c => {
        const filteredMonths = filterByMonthForPhase(c.by_month, currentPhase, year);
        const raised = Object.values(filteredMonths).reduce((sum, m) => sum + parseFloat(m.total), 0);
        const contribs = Object.values(filteredMonths).reduce((sum, m) => sum + m.count, 0);
        return { ...c, phaseRaised: raised, phaseContribs: contribs };
    });

    // Compute race total for this phase (for percentage bars)
    const raceTotal = candidatesWithTotals.reduce((sum, c) => sum + c.phaseRaised, 0);

    // Sort by phase total desc
    candidatesWithTotals.sort((a, b) => b.phaseRaised - a.phaseRaised);

    container.innerHTML = candidatesWithTotals.map(c => {
        const pct = raceTotal > 0 ? ((c.phaseRaised / raceTotal) * 100).toFixed(1) : '0';
        const partyBg = partyBadgeClass(c.party);

        return `
            <div class="bg-gray-800 rounded-xl border border-gray-700 p-5">
                <div class="flex items-start justify-between mb-3">
                    <div>
                        <a href="${BASE}/candidate.html?id=${encodeURIComponent(c.id)}"
                           class="font-semibold text-blue-400 hover:text-blue-300 transition-colors">
                            ${escapeHtml(titleCase(c.name))}
                        </a>
                        ${c.party ? `<span class="ml-2 inline-block px-1.5 py-0.5 rounded text-xs ${partyBg}">${escapeHtml(c.party)}</span>` : ''}
                    </div>
                </div>
                <div class="mb-3">
                    <p class="text-xl font-bold text-green-400">${formatCurrency(c.phaseRaised)}</p>
                    <p class="text-xs text-gray-500 mt-0.5">${c.phaseContribs.toLocaleString()} contribution${c.phaseContribs !== 1 ? 's' : ''}</p>
                </div>
                <!-- % of race total bar -->
                <div class="mt-2">
                    <div class="flex justify-between text-xs text-gray-500 mb-1">
                        <span>Share of race</span>
                        <span>${pct}%</span>
                    </div>
                    <div class="w-full bg-gray-700 rounded-full h-1.5">
                        <div class="bg-blue-500 h-1.5 rounded-full" style="width: ${Math.min(100, parseFloat(pct))}%"></div>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

function renderTimeline() {
    const canvas = document.getElementById('chart-timeline');
    if (!canvas) return;

    const year = detectElectionYear(race.by_month);

    // Collect all months across all candidates for this phase
    const allMonths = new Set();
    for (const c of race.candidates) {
        const filtered = filterByMonthForPhase(c.by_month, currentPhase, year);
        for (const ym of Object.keys(filtered)) allMonths.add(ym);
    }
    const sortedMonths = [...allMonths].sort();

    if (timelineChart) {
        timelineChart.destroy();
        timelineChart = null;
    }

    if (sortedMonths.length === 0) {
        canvas.parentElement.innerHTML = '<p class="text-gray-500 text-sm text-center py-8">No data for selected phase.</p>';
        return;
    }

    const labels = sortedMonths.map(ym => formatYearMonth(ym));

    const datasets = race.candidates.map(c => {
        const filtered = filterByMonthForPhase(c.by_month, currentPhase, year);
        const data = sortedMonths.map(ym => filtered[ym] ? parseFloat(filtered[ym].total) : 0);
        return { label: titleCase(c.name), data };
    });

    timelineChart = createTimelineChart(canvas, { labels, datasets });
}

function renderRaceCharts() {
    const donutCanvas = document.getElementById('chart-contributor-type');
    if (donutCanvas) {
        const typeData = race.by_contributor_type;
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
            if (!order.includes(key)) { labels.push(key); values.push(val.count); }
        }
        createDonutChart(donutCanvas, { labels, values });
    }

    const barCanvas = document.getElementById('chart-contribution-size');
    if (barCanvas) {
        const sizeData = race.by_contribution_size;
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
        createBarChart(barCanvas, { labels, values, label: 'Contributions' });
    }
}

function attachListeners() {
    document.querySelectorAll('.phase-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            currentPhase = btn.dataset.phase;
            document.querySelectorAll('.phase-btn').forEach(b => {
                const active = b.dataset.phase === currentPhase;
                b.className = active
                    ? 'phase-btn px-3 py-1.5 bg-blue-600 text-white'
                    : 'phase-btn px-3 py-1.5 bg-gray-700 text-gray-300 hover:bg-gray-600';
            });
            renderStats();
            renderCandidateCards();
            renderTimeline();
        });
    });
}

// ── Helpers ────────────────────────────────────────────────────────────────

function showError() {
    document.getElementById('error-banner')?.classList.remove('hidden');
    setText('race-title', 'Race Not Found');
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

function formatYearMonth(ym) {
    const [year, month] = ym.split('-');
    const d = new Date(Number(year), Number(month) - 1, 1);
    return d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
}

function detectElectionYear(byMonth) {
    if (!byMonth) return 2024;
    const months = Object.keys(byMonth);
    if (months.length === 0) return 2024;
    const years = months.map(ym => parseInt(ym.slice(0, 4), 10));
    return Math.max(...years);
}

function partyBadgeClass(party) {
    const p = (party || '').toUpperCase();
    if (p.includes('REP') || p === 'R') return 'bg-red-900 text-red-300';
    if (p.includes('DEM') || p === 'D') return 'bg-blue-900 text-blue-300';
    return 'bg-gray-700 text-gray-300';
}

init();
