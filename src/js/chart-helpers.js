/**
 * Chart.js factory helpers.
 * Returns Chart instances; caller is responsible for destroying old charts
 * before re-creating (call chart.destroy() if needed).
 */
import {
    Chart,
    ArcElement,
    BarElement,
    LineElement,
    PointElement,
    CategoryScale,
    LinearScale,
    Tooltip,
    Legend,
    Filler,
    DoughnutController,
    BarController,
    LineController,
} from 'chart.js';

Chart.register(
    ArcElement,
    BarElement,
    LineElement,
    PointElement,
    CategoryScale,
    LinearScale,
    Tooltip,
    Legend,
    Filler,
    DoughnutController,
    BarController,
    LineController,
);

const PALETTE = [
    '#3B82F6', // blue-500
    '#10B981', // emerald-500
    '#F59E0B', // amber-500
    '#EF4444', // red-500
    '#8B5CF6', // violet-500
    '#EC4899', // pink-500
    '#14B8A6', // teal-500
    '#F97316', // orange-500
];

/**
 * Create a doughnut chart.
 * @param {HTMLCanvasElement} canvas
 * @param {{ labels: string[], values: number[] }} data
 * @param {string} [title]
 */
export function createDonutChart(canvas, { labels, values }, title) {
    return new Chart(canvas, {
        type: 'doughnut',
        data: {
            labels,
            datasets: [{
                data: values,
                backgroundColor: PALETTE.slice(0, labels.length),
                borderWidth: 2,
                borderColor: '#1F2937',
            }],
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'right',
                    labels: { color: '#D1D5DB', font: { size: 12 } },
                },
                tooltip: {
                    callbacks: {
                        label(ctx) {
                            const val = ctx.parsed;
                            const total = ctx.dataset.data.reduce((a, b) => a + b, 0);
                            const pct = total > 0 ? ((val / total) * 100).toFixed(1) : 0;
                            return ` ${ctx.label}: ${val.toLocaleString()} (${pct}%)`;
                        },
                    },
                },
            },
        },
    });
}

/**
 * Create a timeline (line) chart for monthly contribution totals.
 * Supports multiple datasets (one per candidate for race pages).
 *
 * @param {HTMLCanvasElement} canvas
 * @param {{ labels: string[], datasets: Array<{ label: string, data: number[], color?: string }> }} data
 */
export function createTimelineChart(canvas, { labels, datasets }) {
    const chartDatasets = datasets.map((ds, i) => ({
        label: ds.label,
        data: ds.data,
        borderColor: ds.color || PALETTE[i % PALETTE.length],
        backgroundColor: (ds.color || PALETTE[i % PALETTE.length]) + '33',
        fill: datasets.length === 1,
        tension: 0.3,
        pointRadius: 3,
        pointHoverRadius: 5,
    }));

    return new Chart(canvas, {
        type: 'line',
        data: { labels, datasets: chartDatasets },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: { mode: 'index', intersect: false },
            plugins: {
                legend: {
                    display: datasets.length > 1,
                    labels: { color: '#D1D5DB', font: { size: 12 } },
                },
                tooltip: {
                    callbacks: {
                        label(ctx) {
                            const val = ctx.parsed.y;
                            return ` ${ctx.dataset.label}: $${val.toLocaleString()}`;
                        },
                    },
                },
            },
            scales: {
                x: {
                    ticks: { color: '#9CA3AF', maxRotation: 45 },
                    grid: { color: '#374151' },
                },
                y: {
                    ticks: {
                        color: '#9CA3AF',
                        callback(val) { return `$${(val / 1000).toFixed(0)}K`; },
                    },
                    grid: { color: '#374151' },
                    beginAtZero: true,
                },
            },
        },
    });
}

/**
 * Create a horizontal bar chart.
 * @param {HTMLCanvasElement} canvas
 * @param {{ labels: string[], values: number[], label: string }} data
 */
export function createBarChart(canvas, { labels, values, label }) {
    return new Chart(canvas, {
        type: 'bar',
        data: {
            labels,
            datasets: [{
                label: label || 'Count',
                data: values,
                backgroundColor: PALETTE.slice(0, labels.length),
                borderRadius: 4,
            }],
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            indexAxis: 'y',
            plugins: {
                legend: { display: false },
                tooltip: {
                    callbacks: {
                        label(ctx) {
                            return ` ${ctx.dataset.label}: ${ctx.parsed.x.toLocaleString()}`;
                        },
                    },
                },
            },
            scales: {
                x: {
                    ticks: { color: '#9CA3AF' },
                    grid: { color: '#374151' },
                },
                y: {
                    ticks: { color: '#D1D5DB' },
                    grid: { color: '#374151' },
                },
            },
        },
    });
}
