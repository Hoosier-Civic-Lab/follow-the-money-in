/**
 * Fetch Indiana SoS candidate lists (Primary + General) and produce
 * data/raw/indiana-candidates.json — a lookup map keyed by normalized name.
 *
 * The Excel file URLs include a date that changes with each SoS update, so
 * we discover them by scraping the elections page HTML.
 *
 * Output shape:
 *   { "JOHN DOE": { office, district, party }, ... }
 *
 * Usage: node scripts/fetch-indiana-candidates.js
 */

import { writeFile, mkdir } from 'fs/promises';
import axios from 'axios';
import XLSX from 'xlsx';

const SOS_ELECTIONS_URL = 'https://www.in.gov/sos/elections/';
const RAW_DIR = 'data/raw';
const OUTPUT_PATH = `${RAW_DIR}/indiana-candidates.json`;

// Row index (0-based) of the actual column headers in the sheet
const HEADER_ROW_INDEX = 2;

function normalizeName(name) {
    return String(name).toUpperCase().trim().replace(/\s+/g, ' ');
}

async function discoverExcelUrls(html) {
    const primaryMatch = html.match(/href="([^"]*Primary-Candidate-List[^"]*\.xlsx)"/i);
    const generalMatch = html.match(/href="([^"]*General-Candidate-List[^"]*\.xlsx)"/i);

    function toAbsolute(href) {
        if (!href) return null;
        return href.startsWith('http') ? href : `https://www.in.gov${href}`;
    }

    return {
        primary: toAbsolute(primaryMatch?.[1]),
        general: toAbsolute(generalMatch?.[1]),
    };
}

async function downloadExcel(url, label) {
    console.log(`  Downloading ${label}: ${url}`);
    const response = await axios.get(url, { responseType: 'arraybuffer', timeout: 60_000 });
    return Buffer.from(response.data);
}

function parseExcelBuffer(buffer) {
    const workbook = XLSX.read(buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 });

    // Row HEADER_ROW_INDEX (0-based) contains column names
    const headers = rows[HEADER_ROW_INDEX];
    if (!headers) return [];

    const nameIdx = headers.findIndex(h => /candidate.*name/i.test(String(h)));
    const officeIdx = headers.findIndex(h => /^office$/i.test(String(h)));
    const partyIdx = headers.findIndex(h => /political.*party/i.test(String(h)));
    const districtIdx = headers.findIndex(h => /^district$/i.test(String(h)));

    if (nameIdx === -1) {
        console.warn('  [WARN] Could not find "Candidate Name" column in header row:', headers);
        return [];
    }

    const entries = [];
    for (let i = HEADER_ROW_INDEX + 1; i < rows.length; i++) {
        const row = rows[i];
        if (!row || !row[nameIdx]) continue;
        entries.push({
            name: String(row[nameIdx]).trim(),
            office: officeIdx !== -1 ? String(row[officeIdx] ?? '').trim() : '',
            party: partyIdx !== -1 ? String(row[partyIdx] ?? '').trim() : '',
            district: districtIdx !== -1 ? String(row[districtIdx] ?? '').trim() : '',
        });
    }
    return entries;
}

function buildLookup(entries) {
    const lookup = {};
    for (const { name, office, party, district } of entries) {
        if (!name) continue;
        const key = normalizeName(name);
        // Primary entries take precedence if already seen; General adds if missing
        if (!lookup[key]) {
            lookup[key] = {
                office: office || null,
                district: district || null,
                party: party || null,
            };
        }
    }
    return lookup;
}

async function main() {
    console.log('Fetching Indiana SoS candidate lists...\n');

    // Scrape elections page for Excel URLs
    console.log(`Scraping ${SOS_ELECTIONS_URL}`);
    let html;
    try {
        const response = await axios.get(SOS_ELECTIONS_URL, { timeout: 30_000 });
        html = response.data;
    } catch (err) {
        console.warn(`[WARN] Could not reach SoS elections page: ${err.message}`);
        console.warn('Skipping candidate enrichment (non-fatal).');
        process.exit(0);
    }

    const { primary: primaryUrl, general: generalUrl } = await discoverExcelUrls(html);

    if (!primaryUrl && !generalUrl) {
        console.warn('[WARN] No Primary or General candidate Excel URLs found on the elections page.');
        console.warn('The SoS may not have published the lists yet. Skipping (non-fatal).');
        process.exit(0);
    }

    await mkdir(RAW_DIR, { recursive: true });

    const allEntries = [];

    if (primaryUrl) {
        try {
            const buf = await downloadExcel(primaryUrl, 'Primary');
            const entries = parseExcelBuffer(buf);
            console.log(`  Parsed ${entries.length} primary candidate rows`);
            allEntries.push(...entries);
        } catch (err) {
            console.warn(`[WARN] Failed to download/parse primary list: ${err.message}`);
        }
    } else {
        console.warn('[WARN] Primary candidate list URL not found on page.');
    }

    if (generalUrl) {
        try {
            const buf = await downloadExcel(generalUrl, 'General');
            const entries = parseExcelBuffer(buf);
            console.log(`  Parsed ${entries.length} general candidate rows`);
            allEntries.push(...entries);
        } catch (err) {
            console.warn(`[WARN] Failed to download/parse general list: ${err.message}`);
        }
    } else {
        console.warn('[WARN] General candidate list URL not found on page.');
    }

    if (allEntries.length === 0) {
        console.warn('[WARN] No candidate rows parsed from any Excel file. Exiting without writing output.');
        process.exit(0);
    }

    const lookup = buildLookup(allEntries);
    const count = Object.keys(lookup).length;

    await writeFile(OUTPUT_PATH, JSON.stringify(lookup, null, 2));
    console.log(`\n✅ Wrote ${count} candidates to ${OUTPUT_PATH}`);
}

main().catch(err => {
    console.error('❌ fetch-indiana-candidates failed:', err.message);
    process.exit(1);
});
