import { parseCSVFile } from './utils/csv-parser.js';
import { classifyContributor, classifyContributionSize } from './utils/contributor-classifier.js';
import { parseOccupation } from './utils/occupation-parser.js';
import { writeFile, mkdir } from 'fs/promises';
import { readdir } from 'fs/promises';
import path from 'path';
import Decimal from 'decimal.js';

const RAW_DIR = 'data/raw';
const PROCESSED_DIR = 'data/processed';
//const CURRENT_YEAR = new Date().getFullYear();

async function processIndianaContributions(filepath) {
    console.log(`Processing ${filepath}...`);
    
    const rows = await parseCSVFile(filepath);
    console.log(`  Loaded ${rows.length} rows`);

    // Exclude amended/superseded records (Amended=1 marks the old entry in a correction pair)
    const currentRows = rows.filter(row => row.Amended !== '1');
    console.log(`  ${rows.length - currentRows.length} amended records excluded, ${currentRows.length} current records retained`);

    const processed = currentRows.map((row, index) => {
    // TODO: Adjust field names based on actual CSV structure from Day 2
    const contribution = {
        id: `contrib-${Date.now()}-${index}`,
        date: row.Date || row.ContributionDate,
        amount: parseFloat(row.Amount || row.ContributionAmount || 0),
        candidate_name: row.CandidateName || row.Candidate,
        contributor_name: row.ContributorName || row.Contributor || row.Name,
        contributor_type: classifyContributor(row),
        contribution_size: classifyContributionSize(parseFloat(row.Amount || 0)),
        occupation: row.Occupation || null,
        occupation_category: row.Occupation ? parseOccupation(row.Occupation) : 'unknown',
        address_city: row.City || null,
        address_state: row.State || null,
        address_zip: row.Zip || null,
        source: 'indiana'
    };
    
    return contribution;
    });
    
    console.log(`  Processed ${processed.length} current contributions`);
    return processed;
}

async function processData() {
    console.log('Processing campaign finance data...\n');
    
    // Ensure processed directory exists
    await mkdir(PROCESSED_DIR, { recursive: true });
    await mkdir(path.join(PROCESSED_DIR, 'races'), { recursive: true });
    
    // Find Indiana CSV files
    const files = await readdir(RAW_DIR);
    const contributionFiles = files.filter(f => 
    f.includes('contributions') && f.endsWith('.csv')
    );
    
    console.log(`Found ${contributionFiles.length} contribution files to process\n`);
    
    // Process each file
    let allContributions = [];
    
    for (const file of contributionFiles) {
    const filepath = path.join(RAW_DIR, file);
    const contributions = await processIndianaContributions(filepath);
    allContributions = allContributions.concat(contributions);
    }
    
    console.log(`\nTotal contributions processed: ${allContributions.length}`);
    
    // For Phase 0, just save all contributions to a single file
    // In later phases, we'll split by race
    const outputPath = path.join(PROCESSED_DIR, 'all-contributions.json');
    await writeFile(
    outputPath,
    JSON.stringify(allContributions, null, 2)
    );
    
    console.log(`✅ Saved to ${outputPath}`);
    
    // Generate basic stats
    const stats = {
    total_contributions: allContributions.length,
    total_amount: allContributions.reduce((sum, c) => sum.plus(new Decimal(c.amount)), new Decimal(0)).toNumber(),
    by_type: {},
    by_size: {},
    by_occupation: {}
    };
    
    allContributions.forEach(c => {
    stats.by_type[c.contributor_type] = (stats.by_type[c.contributor_type] || 0) + 1;
    stats.by_size[c.contribution_size] = (stats.by_size[c.contribution_size] || 0) + 1;
    stats.by_occupation[c.occupation_category] = (stats.by_occupation[c.occupation_category] || 0) + 1;
    });
    
    console.log('\nBasic Statistics:');
    console.log(`  Total Amount: $${stats.total_amount.toLocaleString()}`);
    console.log(`  By Type:`, stats.by_type);
    console.log(`  By Size:`, stats.by_size);
    console.log(`  By Occupation:`, stats.by_occupation);
    
    return stats;
}

// Run if called directly
//if (import.meta.url === `file://${process.argv[1]}`) {
    processData()
    .then(() => {
        console.log('\n✅ Data processing complete');
        process.exit(0);
    })
    .catch(error => {
        console.error('\n❌ Data processing failed:', error);
        console.error(error.stack);
        process.exit(1);
    });
//}

export { processData };