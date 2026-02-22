import { readFile, writeFile, mkdir } from 'fs/promises';
import path from 'path';
import Decimal from 'decimal.js';

const PROCESSED_DIR = 'data/processed';

/**
 * Convert a candidate name to a URL-safe slug.
 * e.g. "VANETA G. BECKER" → "vaneta-g-becker"
 */
function slugify(name) {
    return name
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '')
        .trim()
        .replace(/\s+/g, '-');
}

async function generateSummaries() {
    console.log('Generating summary statistics...\n');
    
    // Load all contributions
    const allContribsPath = path.join(PROCESSED_DIR, 'all-contributions.json');
    const allContributions = JSON.parse(await readFile(allContribsPath, 'utf-8'));
    
    console.log(`Loaded ${allContributions.length} contributions`);
    
    // Calculate aggregate statistics
    const summary = {
        last_updated: new Date().toISOString(),
        totals: {
            total_raised: allContributions
                .reduce((sum, c) => sum.plus(new Decimal(c.amount)), new Decimal(0))
                .toFixed(2),
            total_contributions: allContributions.length,
            total_itemized: allContributions.filter(c => c.contributor_type !== 'unitemized').length,
            total_unitemized: allContributions.filter(c => c.contributor_type === 'unitemized').length
        },
        by_contributor_type: {},
        by_contribution_size: {},
        by_occupation_category: {},
        by_state: {}
    };
    
    // Aggregate by various dimensions
    // Use Decimal for all aggregation
    allContributions.forEach(contrib => {
        const amount = new Decimal(contrib.amount);
        // By type
        const type = contrib.contributor_type;
        if (!summary.by_contributor_type[type]) {
            summary.by_contributor_type[type] = { count: 0, total: new Decimal(0) };
        }
        summary.by_contributor_type[type].count++;
        summary.by_contributor_type[type].total = summary.by_contributor_type[type].total.plus(amount);

        // By size
        const size = contrib.contribution_size;
        if (!summary.by_contribution_size[size]) {
            summary.by_contribution_size[size] = { count: 0, total: new Decimal(0) };
        }
        summary.by_contribution_size[size].count++;
        summary.by_contribution_size[size].total = summary.by_contribution_size[size].total.plus(amount);

        // By occupation
        const occ = contrib.occupation_category;
        if (!summary.by_occupation_category[occ]) {
            summary.by_occupation_category[occ] = { count: 0, total: new Decimal(0) };
        }
        summary.by_occupation_category[occ].count++;
        summary.by_occupation_category[occ].total = summary.by_occupation_category[occ].total.plus(amount);

        // By state
        const state = contrib.address_state || 'unknown';
        if (!summary.by_state[state]) {
            summary.by_state[state] = { count: 0, total: new Decimal(0) };
        }
        summary.by_state[state].count++;
        summary.by_state[state].total = summary.by_state[state].total.plus(amount);
    });

    // Convert Decimal totals to fixed strings for output
    Object.values(summary.by_contributor_type).forEach(obj => {
        obj.total = obj.total.toFixed(2);
    });
    Object.values(summary.by_contribution_size).forEach(obj => {
        obj.total = obj.total.toFixed(2);
    });
    Object.values(summary.by_occupation_category).forEach(obj => {
        obj.total = obj.total.toFixed(2);
    });
    Object.values(summary.by_state).forEach(obj => {
        obj.total = obj.total.toFixed(2);
    });
    
    // Save summary
    const summaryPath = path.join(PROCESSED_DIR, 'summary-all-races.json');
    await writeFile(summaryPath, JSON.stringify(summary, null, 2));

    console.log(`✅ Saved summary to ${summaryPath}`);
    console.log(`\nSummary Stats:`);
    console.log(`  Total Raised: $${summary.totals.total_raised.toLocaleString()}`);
    console.log(`  Total Contributions: ${summary.totals.total_contributions.toLocaleString()}`);
    console.log(`  Itemized: ${summary.totals.total_itemized.toLocaleString()}`);
    console.log(`  Unitemized: ${summary.totals.total_unitemized.toLocaleString()}`);

    // Generate candidate-level summaries
    await generateCandidateSummaries(allContributions);

    return summary;
}

async function generateCandidateSummaries(allContributions) {
    console.log('\nGenerating candidate summaries...');

    // Load optional candidate enrichment lookup (office/district/party)
    let candidateLookup = {};
    try {
        candidateLookup = JSON.parse(await readFile('data/raw/indiana-candidates.json', 'utf-8'));
        console.log(`  Loaded enrichment lookup with ${Object.keys(candidateLookup).length} entries`);
    } catch {
        // Not available — soft skip (file won't exist on fresh clones or before fetch:indiana:candidates)
    }

    function lookupCandidate(name) {
        const normalized = name.toUpperCase().trim().replace(/\s+/g, ' ');
        if (candidateLookup[normalized]) return candidateLookup[normalized];
        // Try "Last, First" → "First Last" rearrangement
        if (normalized.includes(',')) {
            const [last, ...rest] = normalized.split(',');
            const rearranged = `${rest.join(',').trim()} ${last.trim()}`;
            return candidateLookup[rearranged] || null;
        }
        return null;
    }

    // Group contributions by candidate_name (only records that have one)
    const byCandidate = new Map();
    for (const contrib of allContributions) {
        if (!contrib.candidate_name) continue;
        const name = contrib.candidate_name;
        if (!byCandidate.has(name)) {
            byCandidate.set(name, []);
        }
        byCandidate.get(name).push(contrib);
    }

    console.log(`  Found ${byCandidate.size} unique candidates with itemized contributions`);

    const candidatesDir = path.join(PROCESSED_DIR, 'candidates');
    await mkdir(candidatesDir, { recursive: true });

    const candidatesList = [];

    for (const [name, contribs] of byCandidate) {
        const id = slugify(name);
        const totalRaised = contribs
            .reduce((sum, c) => sum.plus(new Decimal(c.amount)), new Decimal(0))
            .toFixed(2);

        // Build per-candidate aggregates matching summary-all-races.json shape
        const byType = {};
        const bySize = {};
        for (const c of contribs) {
            const amount = new Decimal(c.amount);

            const type = c.contributor_type;
            if (!byType[type]) byType[type] = { count: 0, total: new Decimal(0) };
            byType[type].count++;
            byType[type].total = byType[type].total.plus(amount);

            const size = c.contribution_size;
            if (!bySize[size]) bySize[size] = { count: 0, total: new Decimal(0) };
            bySize[size].count++;
            bySize[size].total = bySize[size].total.plus(amount);
        }

        // Serialize Decimal totals
        Object.values(byType).forEach(obj => { obj.total = obj.total.toFixed(2); });
        Object.values(bySize).forEach(obj => { obj.total = obj.total.toFixed(2); });

        const source = contribs[0]?.source || 'indiana';
        const info = lookupCandidate(name);

        // Write per-candidate file
        const candidateData = {
            id,
            name,
            source,
            office: info?.office ?? null,
            district: info?.district ?? null,
            party: info?.party ?? null,
            totals: {
                total_raised: totalRaised,
                total_contributions: contribs.length,
                total_itemized: contribs.filter(c => c.contributor_type !== 'unitemized').length,
                total_unitemized: contribs.filter(c => c.contributor_type === 'unitemized').length,
            },
            by_contributor_type: byType,
            by_contribution_size: bySize,
            contributions: contribs,
        };

        const candidatePath = path.join(candidatesDir, `${id}.json`);
        await writeFile(candidatePath, JSON.stringify(candidateData, null, 2));

        // Add to index
        candidatesList.push({
            id,
            name,
            total_raised: totalRaised,
            total_contributions: contribs.length,
            source,
            office: info?.office ?? null,
            district: info?.district ?? null,
            party: info?.party ?? null,
        });
    }

    // Log enrichment stats
    const enriched = candidatesList.filter(c => c.office).length;
    const total = candidatesList.length;
    console.log(`  Enriched ${enriched}/${total} candidates with office data`);

    // Sort index by total_raised descending
    candidatesList.sort((a, b) => new Decimal(b.total_raised).minus(new Decimal(a.total_raised)).toNumber());

    const listPath = path.join(PROCESSED_DIR, 'candidates-list.json');
    await writeFile(listPath, JSON.stringify(candidatesList, null, 2));

    console.log(`✅ Saved candidates-list.json (${candidatesList.length} candidates)`);
    console.log(`✅ Saved ${candidatesList.length} per-candidate files to ${candidatesDir}`);
}

// Run if called directly
//if (import.meta.url === `file://${process.argv[1]}`) {
    generateSummaries()
    .then(() => {
        console.log('\n✅ Summary generation complete');
        process.exit(0);
    })
    .catch(error => {
        console.error('\n❌ Summary generation failed:', error);
        process.exit(1);
    });
//}

export { generateSummaries };