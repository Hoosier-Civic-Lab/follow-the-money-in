import { readFile, writeFile } from 'fs/promises';
import path from 'path';
import Decimal from 'decimal.js';

const PROCESSED_DIR = 'data/processed';

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
    
    return summary;
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