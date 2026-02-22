import { readFile, writeFile } from 'fs/promises';

const HISTORICAL_PATH = 'data/reference/indiana-candidates-historical.json';
const RAW_CANDIDATES_PATH = 'data/raw/indiana-candidates.json';
const ALIASES_PATH = 'data/manual/name-aliases.json';
const CANDIDATES_LIST_PATH = 'data/processed/candidates-list.json';

// Suffixes that are not last names — strip when extracting last name
const SUFFIXES = new Set(['JR', 'SR', 'II', 'III', 'IV', 'V']);

function normalizeName(raw) {
    return raw.toUpperCase().trim().replace(/\s+/g, ' ');
}

function extractLastName(normalized) {
    // Handle "Last, First" format
    if (normalized.includes(',')) {
        return normalized.split(',')[0].trim();
    }
    const parts = normalized.split(' ');
    // Walk backwards, skip known suffixes
    for (let i = parts.length - 1; i >= 0; i--) {
        const bare = parts[i].replace(/\.$/, ''); // strip trailing period for suffix check
        if (!SUFFIXES.has(bare)) {
            return parts[i];
        }
    }
    return parts[parts.length - 1];
}

async function loadJSON(filePath, fallback) {
    try {
        return JSON.parse(await readFile(filePath, 'utf-8'));
    } catch {
        return fallback;
    }
}

async function run() {
    // Load lookup sources (same set as generate-summaries.js, minus manual overrides)
    const historical = await loadJSON(HISTORICAL_PATH, {});
    const rawCandidates = await loadJSON(RAW_CANDIDATES_PATH, {});
    const existingAliases = await loadJSON(ALIASES_PATH, {});

    console.log(`Historical lookup: ${Object.keys(historical).length} entries`);
    console.log(`Raw candidates:    ${Object.keys(rawCandidates).length} entries`);
    console.log(`Existing aliases:  ${Object.keys(existingAliases).length} entries`);

    // Combined lookup is what generate-summaries.js resolves aliases against
    const combined = { ...historical, ...rawCandidates };
    const combinedKeys = Object.keys(combined);
    console.log(`Combined lookup:   ${combinedKeys.length} entries`);

    // Build last-name index over combined lookup
    const byLastName = new Map();
    for (const key of combinedKeys) {
        const lastName = extractLastName(key);
        if (!byLastName.has(lastName)) byLastName.set(lastName, []);
        byLastName.get(lastName).push(key);
    }

    // Load unenriched candidates from pipeline output
    const candidatesList = await loadJSON(CANDIDATES_LIST_PATH, null);
    if (!Array.isArray(candidatesList)) {
        console.error('\nError: candidates-list.json missing or not an array.');
        console.error('Run "npm run aggregate" first to generate it.');
        process.exit(1);
    }

    const unenriched = candidatesList.filter(c => c.office === null);
    console.log(`\nUnenriched candidates: ${unenriched.length} / ${candidatesList.length}`);

    const newAliases = {};
    const ambiguous = [];
    let skippedAlreadyAliased = 0;
    let skippedNoMatch = 0;

    for (const candidate of unenriched) {
        const normalized = normalizeName(candidate.name);

        // Skip if already handled (existing file or already found this run)
        if (existingAliases[normalized] !== undefined || newAliases[normalized] !== undefined) {
            skippedAlreadyAliased++;
            continue;
        }

        const lastName = extractLastName(normalized);
        const allMatches = byLastName.get(lastName) || [];

        // Exclude the candidate's own normalized name (already tried, failed)
        const candidates = allMatches.filter(m => m !== normalized);

        if (candidates.length === 0) {
            skippedNoMatch++;
        } else if (candidates.length === 1) {
            newAliases[normalized] = candidates[0];
        } else {
            ambiguous.push({ name: normalized, matches: candidates });
        }
    }

    // Print ambiguous cases for human review
    if (ambiguous.length > 0) {
        console.log(`\n${'─'.repeat(60)}`);
        console.log(`AMBIGUOUS — ${ambiguous.length} candidate(s) need manual review`);
        console.log(`${'─'.repeat(60)}`);
        for (const { name, matches } of ambiguous) {
            console.log(`\n  "${name}"`);
            const show = matches.slice(0, 6);
            for (const m of show) {
                const info = combined[m];
                const dist = info.district ? `dist. ${info.district}` : 'statewide';
                console.log(`    → "${m}"  (${info.office || '?'}, ${dist}, ${info.party || '?'})`);
            }
            if (matches.length > 6) {
                console.log(`    … and ${matches.length - 6} more (last name too common to list all)`);
            }
        }
        console.log(`\nTo resolve: add the correct mapping to ${ALIASES_PATH}:`);
        console.log(`  "CONTRIBUTION NAME": "HISTORICAL LOOKUP NAME"`);
    }

    // Merge new auto-suggestions into existing aliases and write
    const updated = { ...existingAliases, ...newAliases };
    await writeFile(ALIASES_PATH, JSON.stringify(updated, null, 2), 'utf-8');

    console.log(`\n${'─'.repeat(60)}`);
    console.log(`SUMMARY`);
    console.log(`${'─'.repeat(60)}`);
    console.log(`  Auto-suggested (written):        ${Object.keys(newAliases).length}`);
    console.log(`  Ambiguous (manual review needed): ${ambiguous.length}`);
    console.log(`  No last-name match found:         ${skippedNoMatch}`);
    console.log(`  Already aliased (skipped):        ${skippedAlreadyAliased}`);
    console.log(`  Total aliases in file:            ${Object.keys(updated).length}`);
    console.log(`\nWrote ${ALIASES_PATH}`);
    console.log('Run "npm run aggregate" to apply aliases to processed output.');
}

run().catch(err => {
    console.error('Fatal error:', err);
    process.exit(1);
});
