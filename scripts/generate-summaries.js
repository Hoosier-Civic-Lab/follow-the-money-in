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
    const candidatesList = await generateCandidateSummaries(allContributions);

    // Generate race-level summaries (enriched candidates only)
    await generateRaceSummaries(allContributions, candidatesList);

    // Generate committee-level summaries
    await generateCommitteeSummaries(allContributions);

    return summary;
}

async function generateCandidateSummaries(allContributions) {
    console.log('\nGenerating candidate summaries...');

    // Load candidate enrichment lookup — three-layer merge, lowest → highest priority:
    //   1. data/reference/indiana-candidates-historical.json  (prior-cycle baseline, committed)
    //   2. data/raw/indiana-candidates.json                   (current-cycle auto-fetch)
    //   3. data/manual/candidate-overrides.json               (human corrections, wins)
    // Each layer is independently optional; missing files are silently skipped.
    let candidateLookup = {};
    const lookupSources = [
        { path: 'data/reference/indiana-candidates-historical.json', label: 'historical reference' },
        { path: 'data/raw/indiana-candidates.json',                  label: 'current-cycle fetch' },
        { path: 'data/manual/candidate-overrides.json',              label: 'manual overrides' },
    ];
    for (const { path: filePath, label } of lookupSources) {
        try {
            const layer = JSON.parse(await readFile(filePath, 'utf-8'));
            const count = Object.keys(layer).length;
            Object.assign(candidateLookup, layer);
            console.log(`  Loaded ${label}: ${count} entries`);
        } catch {
            console.log(`  Skipped ${label} (not available)`);
        }
    }
    console.log(`  Candidate lookup: ${Object.keys(candidateLookup).length} entries total`);

    // Load name aliases — maps contribution name → historical name, independently optional.
    // Run "npm run suggest:aliases" to auto-populate from last-name matching.
    let nameAliases = {};
    try {
        nameAliases = JSON.parse(await readFile('data/manual/name-aliases.json', 'utf-8'));
        console.log(`  Loaded name aliases: ${Object.keys(nameAliases).length} entries`);
    } catch {
        console.log(`  Skipped name aliases (not available)`);
    }

    function lookupCandidate(name) {
        const normalized = name.toUpperCase().trim().replace(/\s+/g, ' ');
        // Resolve alias first — maps contribution name variant to historical lookup key
        const lookupKey = nameAliases[normalized] || normalized;
        if (candidateLookup[lookupKey]) return candidateLookup[lookupKey];
        // Try "Last, First" → "First Last" rearrangement on the (possibly aliased) key
        if (lookupKey.includes(',')) {
            const [last, ...rest] = lookupKey.split(',');
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
        const byMonth = {};
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

            // Group by YYYY-MM for timeline chart
            const ym = c.date ? c.date.slice(0, 7) : null;
            if (ym) {
                if (!byMonth[ym]) byMonth[ym] = { count: 0, total: new Decimal(0) };
                byMonth[ym].count++;
                byMonth[ym].total = byMonth[ym].total.plus(amount);
            }
        }

        // Serialize Decimal totals
        Object.values(byType).forEach(obj => { obj.total = obj.total.toFixed(2); });
        Object.values(bySize).forEach(obj => { obj.total = obj.total.toFixed(2); });
        Object.values(byMonth).forEach(obj => { obj.total = obj.total.toFixed(2); });

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
            by_month: byMonth,
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

    return candidatesList;
}

async function generateRaceSummaries(allContributions, candidatesList) {
    console.log('\nGenerating race summaries...');

    // Only process enriched candidates (those with office data)
    const enrichedCandidates = candidatesList.filter(c => c.office !== null);
    if (enrichedCandidates.length === 0) {
        console.log('  No enriched candidates — skipping race summaries');
        const racesDir = path.join(PROCESSED_DIR, 'races');
        await mkdir(racesDir, { recursive: true });
        await writeFile(path.join(PROCESSED_DIR, 'races-list.json'), JSON.stringify([], null, 2));
        console.log('✅ Saved empty races-list.json (no enriched candidates)');
        return;
    }

    // Build a set of candidate names for each race, keyed by race ID
    // Race key = slugify(office) + (district ? '-' + slugify(district) : '')
    const raceMap = new Map();

    for (const candidate of enrichedCandidates) {
        const officeSlug = slugify(candidate.office);
        const raceId = candidate.district
            ? `${officeSlug}-${slugify(candidate.district)}`
            : officeSlug;

        if (!raceMap.has(raceId)) {
            raceMap.set(raceId, {
                id: raceId,
                office: candidate.office,
                district: candidate.district || null,
                candidateNames: new Set(),
            });
        }
        raceMap.get(raceId).candidateNames.add(candidate.name);
    }

    // Index contributions by candidate name for fast lookup
    const contribsByCandidate = new Map();
    for (const contrib of allContributions) {
        if (!contrib.candidate_name) continue;
        if (!contribsByCandidate.has(contrib.candidate_name)) {
            contribsByCandidate.set(contrib.candidate_name, []);
        }
        contribsByCandidate.get(contrib.candidate_name).push(contrib);
    }

    const racesDir = path.join(PROCESSED_DIR, 'races');
    await mkdir(racesDir, { recursive: true });

    const racesList = [];

    for (const [raceId, raceInfo] of raceMap) {
        // Aggregate all contributions across all candidates in this race
        const allRaceContribs = [];
        const candidateDetails = [];

        for (const candidateName of raceInfo.candidateNames) {
            const contribs = contribsByCandidate.get(candidateName) || [];
            allRaceContribs.push(...contribs);

            // Per-candidate summary within the race
            const totalRaised = contribs
                .reduce((sum, c) => sum.plus(new Decimal(c.amount)), new Decimal(0))
                .toFixed(2);

            const byMonth = {};
            for (const c of contribs) {
                const ym = c.date ? c.date.slice(0, 7) : null;
                if (ym) {
                    if (!byMonth[ym]) byMonth[ym] = { count: 0, total: new Decimal(0) };
                    byMonth[ym].count++;
                    byMonth[ym].total = byMonth[ym].total.plus(new Decimal(c.amount));
                }
            }
            Object.values(byMonth).forEach(obj => { obj.total = obj.total.toFixed(2); });

            // Look up enrichment info
            const enriched = enrichedCandidates.find(c => c.name === candidateName);
            candidateDetails.push({
                id: slugify(candidateName),
                name: candidateName,
                party: enriched?.party ?? null,
                totals: {
                    total_raised: totalRaised,
                    total_contributions: contribs.length,
                },
                by_month: byMonth,
            });
        }

        // Race-level aggregates
        const raceTotalRaised = allRaceContribs
            .reduce((sum, c) => sum.plus(new Decimal(c.amount)), new Decimal(0))
            .toFixed(2);

        const byType = {};
        const bySize = {};
        const byMonth = {};

        for (const c of allRaceContribs) {
            const amount = new Decimal(c.amount);

            const type = c.contributor_type;
            if (!byType[type]) byType[type] = { count: 0, total: new Decimal(0) };
            byType[type].count++;
            byType[type].total = byType[type].total.plus(amount);

            const size = c.contribution_size;
            if (!bySize[size]) bySize[size] = { count: 0, total: new Decimal(0) };
            bySize[size].count++;
            bySize[size].total = bySize[size].total.plus(amount);

            const ym = c.date ? c.date.slice(0, 7) : null;
            if (ym) {
                if (!byMonth[ym]) byMonth[ym] = { count: 0, total: new Decimal(0) };
                byMonth[ym].count++;
                byMonth[ym].total = byMonth[ym].total.plus(amount);
            }
        }

        Object.values(byType).forEach(obj => { obj.total = obj.total.toFixed(2); });
        Object.values(bySize).forEach(obj => { obj.total = obj.total.toFixed(2); });
        Object.values(byMonth).forEach(obj => { obj.total = obj.total.toFixed(2); });

        // Sort candidates by total_raised desc
        candidateDetails.sort((a, b) =>
            new Decimal(b.totals.total_raised).minus(new Decimal(a.totals.total_raised)).toNumber()
        );

        const raceData = {
            id: raceId,
            office: raceInfo.office,
            district: raceInfo.district,
            totals: {
                total_raised: raceTotalRaised,
                total_contributions: allRaceContribs.length,
            },
            by_contributor_type: byType,
            by_contribution_size: bySize,
            by_month: byMonth,
            candidates: candidateDetails,
        };

        const racePath = path.join(racesDir, `${raceId}.json`);
        await writeFile(racePath, JSON.stringify(raceData, null, 2));

        racesList.push({
            id: raceId,
            office: raceInfo.office,
            district: raceInfo.district,
            total_raised: raceTotalRaised,
            total_contributions: allRaceContribs.length,
            candidate_count: candidateDetails.length,
        });
    }

    // Sort races by total_raised desc
    racesList.sort((a, b) =>
        new Decimal(b.total_raised).minus(new Decimal(a.total_raised)).toNumber()
    );

    await writeFile(path.join(PROCESSED_DIR, 'races-list.json'), JSON.stringify(racesList, null, 2));

    console.log(`✅ Saved races-list.json (${racesList.length} races)`);
    console.log(`✅ Saved ${racesList.length} per-race files to ${racesDir}`);
}

async function generateCommitteeSummaries(allContributions) {
    console.log('\nGenerating committee summaries...');

    // Only committee-type contributions have outgoing committee data
    const committeeContribs = allContributions.filter(c => c.contributor_type === 'committee');
    console.log(`  Found ${committeeContribs.length} committee contributions`);

    // Build a map of incoming contributions grouped by recipient_committee (normalized).
    // This captures individual/corporate/etc. donors flowing INTO a PAC or committee.
    const receiptsByNormalizedName = new Map();
    for (const contrib of allContributions) {
        const rcpt = contrib.recipient_committee;
        if (!rcpt) continue;
        const key = rcpt.toUpperCase().trim().replace(/\s+/g, ' ');
        if (!receiptsByNormalizedName.has(key)) {
            receiptsByNormalizedName.set(key, []);
        }
        receiptsByNormalizedName.get(key).push(contrib);
    }

    // Group by normalized contributor_name to avoid slug collisions from capitalization variants.
    // Key: uppercase-trimmed name (stable grouping); value: { displayName, contribs[] }
    // Display name is the first-seen variant (preserves original casing for readability).
    const byCommittee = new Map();
    for (const contrib of committeeContribs) {
        const name = contrib.contributor_name;
        if (!name) continue;
        const key = name.toUpperCase().trim().replace(/\s+/g, ' ');
        if (!byCommittee.has(key)) {
            byCommittee.set(key, { displayName: name, contribs: [] });
        }
        byCommittee.get(key).contribs.push(contrib);
    }

    console.log(`  Found ${byCommittee.size} unique committees`);

    const committeesDir = path.join(PROCESSED_DIR, 'committees');
    await mkdir(committeesDir, { recursive: true });

    const committeesList = [];

    for (const [, { displayName: name, contribs }] of byCommittee) {
        const id = slugify(name);
        const totalGiven = contribs
            .reduce((sum, c) => sum.plus(new Decimal(c.amount)), new Decimal(0))
            .toFixed(2);

        const candidatesSupported = new Set(contribs.map(c => c.candidate_name).filter(Boolean));

        // Build per-committee aggregates
        const bySize = {};
        const byMonth = {};
        for (const c of contribs) {
            const amount = new Decimal(c.amount);

            const size = c.contribution_size;
            if (!bySize[size]) bySize[size] = { count: 0, total: new Decimal(0) };
            bySize[size].count++;
            bySize[size].total = bySize[size].total.plus(amount);

            const ym = c.date ? c.date.slice(0, 7) : null;
            if (ym) {
                if (!byMonth[ym]) byMonth[ym] = { count: 0, total: new Decimal(0) };
                byMonth[ym].count++;
                byMonth[ym].total = byMonth[ym].total.plus(amount);
            }
        }

        // Serialize Decimal totals
        Object.values(bySize).forEach(obj => { obj.total = obj.total.toFixed(2); });
        Object.values(byMonth).forEach(obj => { obj.total = obj.total.toFixed(2); });

        // Build top recipients (by candidate_name)
        const recipientMap = new Map();
        for (const c of contribs) {
            if (!c.candidate_name) continue;
            if (!recipientMap.has(c.candidate_name)) {
                recipientMap.set(c.candidate_name, { count: 0, total: new Decimal(0) });
            }
            const entry = recipientMap.get(c.candidate_name);
            entry.count++;
            entry.total = entry.total.plus(new Decimal(c.amount));
        }
        const topRecipients = [...recipientMap.entries()]
            .map(([recipientName, data]) => ({
                id: slugify(recipientName),
                name: recipientName,
                total: data.total.toFixed(2),
                count: data.count,
            }))
            .sort((a, b) => new Decimal(b.total).minus(new Decimal(a.total)).toNumber())
            .slice(0, 20);

        // Build "Who Funds This Committee" receipts aggregate using the normalized key
        const normalizedKey = name.toUpperCase().trim().replace(/\s+/g, ' ');
        const incomingContribs = receiptsByNormalizedName.get(normalizedKey) || [];
        let receipts = null;
        if (incomingContribs.length > 0) {
            const totalRaised = incomingContribs
                .reduce((sum, c) => sum.plus(new Decimal(c.amount)), new Decimal(0))
                .toFixed(2);

            const uniqueDonors = new Set(
                incomingContribs.map(c => c.contributor_name).filter(Boolean)
            ).size;

            // Aggregate by contributor type
            const byContributorType = {};
            for (const c of incomingContribs) {
                const t = c.contributor_type || 'unknown';
                if (!byContributorType[t]) byContributorType[t] = { count: 0, total: new Decimal(0) };
                byContributorType[t].count++;
                byContributorType[t].total = byContributorType[t].total.plus(new Decimal(c.amount));
            }
            Object.values(byContributorType).forEach(obj => { obj.total = obj.total.toFixed(2); });

            // Top 10 donors by total amount
            const donorMap = new Map();
            for (const c of incomingContribs) {
                const donorName = c.contributor_name || '(Unknown)';
                if (!donorMap.has(donorName)) {
                    donorMap.set(donorName, { type: c.contributor_type, count: 0, total: new Decimal(0) });
                }
                const entry = donorMap.get(donorName);
                entry.count++;
                entry.total = entry.total.plus(new Decimal(c.amount));
            }
            const topDonors = [...donorMap.entries()]
                .map(([donorName, data]) => ({
                    name: donorName,
                    type: data.type,
                    total: data.total.toFixed(2),
                    count: data.count,
                }))
                .sort((a, b) => new Decimal(b.total).minus(new Decimal(a.total)).toNumber())
                .slice(0, 10);

            receipts = {
                total_raised: totalRaised,
                total_contributions: incomingContribs.length,
                unique_donors: uniqueDonors,
                by_contributor_type: byContributorType,
                top_donors: topDonors,
                contributions: incomingContribs,
            };
        }

        // Write per-committee file
        const committeeData = {
            id,
            name,
            totals: {
                total_given: totalGiven,
                total_contributions: contribs.length,
                candidates_supported: candidatesSupported.size,
            },
            by_contribution_size: bySize,
            by_month: byMonth,
            top_recipients: topRecipients,
            contributions: contribs,
            receipts,
        };

        const committeePath = path.join(committeesDir, `${id}.json`);
        await writeFile(committeePath, JSON.stringify(committeeData, null, 2));

        committeesList.push({
            id,
            name,
            total_given: totalGiven,
            total_contributions: contribs.length,
            candidates_supported: candidatesSupported.size,
        });
    }

    // Sort by total_given descending
    committeesList.sort((a, b) =>
        new Decimal(b.total_given).minus(new Decimal(a.total_given)).toNumber()
    );

    const listPath = path.join(PROCESSED_DIR, 'committees-list.json');
    await writeFile(listPath, JSON.stringify(committeesList, null, 2));

    console.log(`✅ Saved committees-list.json (${committeesList.length} committees)`);
    console.log(`✅ Saved ${committeesList.length} per-committee files to ${committeesDir}`);
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