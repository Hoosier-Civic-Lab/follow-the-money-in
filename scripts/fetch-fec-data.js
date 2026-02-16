import axios from 'axios';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';
import 'dotenv/config';

const FEC_API_KEY = process.env.FEC_API_KEY;
const BASE_URL = 'https://api.open.fec.gov/v1';
const DATA_DIR = 'data/raw';
const CURRENT_YEAR = new Date().getFullYear();

if (!FEC_API_KEY) {
    console.error('❌ FEC_API_KEY not found in environment variables');
    console.error('   Create a .env file with your API key');
    process.exit(1);
}

async function fetchFECCandidates(office, cycle = CURRENT_YEAR) {
    console.log(`Fetching ${office} candidates for ${cycle}...`);
    
    try {
    const response = await axios.get(`${BASE_URL}/candidates/`, {
        params: {
        api_key: FEC_API_KEY,
        office: office,
        state: 'IN',
        cycle: cycle,
        per_page: 100
        }
    });
    
    const count = response.data.results.length;
    console.log(`  Found ${count} candidates`);
    
    return response.data.results;
    } catch (error) {
    console.error(`  ❌ Error fetching ${office} candidates:`, error.message);
    return [];
    }
}

async function fetchCommitteeDetails(committeeId) {
    try {
    const response = await axios.get(`${BASE_URL}/committee/${committeeId}/`, {
        params: {
        api_key: FEC_API_KEY
        }
    });
    
    return response.data.results[0];
    } catch (error) {
    console.error(`  ❌ Error fetching committee ${committeeId}:`, error.message);
    return null;
    }
}

async function fetchFECData() {
    console.log('Fetching FEC data for Indiana federal races...\n');
    
    // Ensure raw data directory exists
    await mkdir(DATA_DIR, { recursive: true });
    
    // Fetch candidates
    const [senateCandidates, houseCandidates] = await Promise.all([
    fetchFECCandidates('S', CURRENT_YEAR),
    fetchFECCandidates('H', CURRENT_YEAR)
    ]);
    
    const allCandidates = [...senateCandidates, ...houseCandidates];
    
    console.log(`\nTotal candidates found: ${allCandidates.length}`);
    
    // Save candidate data
    const outputPath = path.join(DATA_DIR, `fec-candidates-${CURRENT_YEAR}.json`);
    await writeFile(
    outputPath,
    JSON.stringify(allCandidates, null, 2)
    );
    
    console.log(`✅ Saved to ${outputPath}`);
    
    // Optional: Fetch committee details for principal committees
    console.log('\nFetching committee details...');
    const committeeDetails = [];
    
    for (const candidate of allCandidates.slice(0, 10)) { // Limit to first 10 for Phase 0
    if (candidate.principal_committees && candidate.principal_committees.length > 0) {
        const committeeId = candidate.principal_committees[0].committee_id;
        const details = await fetchCommitteeDetails(committeeId);
        if (details) {
        committeeDetails.push(details);
        }
        
        // Rate limit: 1 request per 100ms (600/min, well under 1000/hour)
        await new Promise(resolve => setTimeout(resolve, 100));
    }
    }
    
    const committeePath = path.join(DATA_DIR, `fec-committees-${CURRENT_YEAR}.json`);
    await writeFile(
    committeePath,
    JSON.stringify(committeeDetails, null, 2)
    );
    
    console.log(`✅ Saved ${committeeDetails.length} committee details to ${committeePath}`);
    
    return { candidates: allCandidates, committees: committeeDetails };
}

// Run if called directly
//if (import.meta.url === `file://${process.argv[1]}`) {
    fetchFECData()
    .then(() => {
        console.log('\n✅ FEC data fetch complete');
        process.exit(0);
    })
    .catch(error => {
        console.error('\n❌ FEC data fetch failed:', error.message);
        process.exit(1);
    });
//}

export { fetchFECData };