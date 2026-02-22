import { readdir, writeFile } from 'fs/promises';
import { join } from 'path';
import { parseCSVFile } from './utils/csv-parser.js';

const RAW_DIR = 'data/raw';
const OUT_FILE = 'data/reference/indiana-candidates-historical.json';
const FILE_PATTERN = /^(primary|general)-elections-(\d{4})\.csv$/;

function normalizeDistrict(raw) {
    if (!raw || !raw.trim()) return null;
    const trimmed = raw.trim();
    if (trimmed.includes(',')) return null;           // multi-district = statewide federal
    if (trimmed.toLowerCase() === 'indiana') return null; // statewide state office
    return trimmed;
}

function normalizeName(raw) {
    return raw.toUpperCase().trim().replace(/\s+/g, ' ');
}

// Sort key: primary < general within same year, earlier year first
function sortKey(type, year) {
    return year * 10 + (type === 'primary' ? 0 : 1);
}

async function run() {
    const allFiles = await readdir(RAW_DIR);
    const matchedFiles = allFiles
        .map(f => {
            const m = f.match(FILE_PATTERN);
            if (!m) return null;
            return { filename: f, type: m[1], year: parseInt(m[2], 10) };
        })
        .filter(Boolean)
        .sort((a, b) => sortKey(a.type, a.year) - sortKey(b.type, b.year));

    if (matchedFiles.length === 0) {
        console.log('No election CSV files found in', RAW_DIR);
        process.exit(1);
    }

    console.log(`Found ${matchedFiles.length} election CSV files:`);
    matchedFiles.forEach(f => console.log(`  ${f.filename}`));

    const lookup = {};

    for (const { filename, type, year } of matchedFiles) {
        const filepath = join(RAW_DIR, filename);
        const rows = await parseCSVFile(filepath);
        let count = 0;

        for (const row of rows) {
            const candidateRaw = row.Candidate?.trim();
            if (!candidateRaw) continue;

            const key = normalizeName(candidateRaw);
            lookup[key] = {
                office: row.Office?.trim() || null,
                district: normalizeDistrict(row.District),
                party: row.Party?.trim() || null,
            };
            count++;
        }

        console.log(`  ${filename}: ${count} entries`);
    }

    const total = Object.keys(lookup).length;
    await writeFile(OUT_FILE, JSON.stringify(lookup, null, 2), 'utf-8');
    console.log(`\nWrote ${total} unique candidates to ${OUT_FILE}`);
}

run().catch(err => {
    console.error('Fatal error:', err);
    process.exit(1);
});
