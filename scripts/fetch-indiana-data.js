import axios from 'axios';
import { createWriteStream, existsSync } from 'fs';
import fs from 'fs';
import { mkdir } from 'fs/promises';
import { pipeline } from 'stream/promises';
import path from 'path';
import AdmZip from 'adm-zip';

const DATA_DIR = 'data/raw';
const CURRENT_YEAR = new Date().getFullYear();
const PREVIOUS_YEAR = CURRENT_YEAR - 1;

// TODO: Update these URLs based on Day 2 research
const INDIANA_URLS = {
    contributions_current: `https://campaignfinance.in.gov/PublicSite/Docs/BulkDataDownloads/${CURRENT_YEAR}_ContributionData.csv.zip`,
    contributions_previous: `https://campaignfinance.in.gov/PublicSite/Docs/BulkDataDownloads/${PREVIOUS_YEAR}_ContributionData.csv.zip`,
};

async function downloadFile(url, filename) {
    console.log(`Downloading ${filename}...`);
    try {
        const response = await axios({
            method: 'GET',
            url: url,
            responseType: 'stream'
        });
        const filepath = path.join(DATA_DIR, filename);
        const writer = createWriteStream(filepath);
        await pipeline(response.data, writer);
        console.log(`✅ Downloaded ${filename}`);

        // Unzip the file if it is a .zip
        if (filename.endsWith('.zip')) {
            try {
                const zip = new AdmZip(filepath);
                const zipEntries = zip.getEntries();
                if (zipEntries.length === 0) {
                    throw new Error('Zip file is empty');
                }
                // Extract the first CSV file found
                const csvEntry = zipEntries.find(e => e.entryName.endsWith('.csv'));
                if (!csvEntry) {
                    throw new Error('No CSV file found in zip');
                }
                const csvFilename = filename.replace(/\.zip$/, '');
                const csvPath = path.join(DATA_DIR, csvFilename);
                // Only extract if not already present
                if (!existsSync(csvPath)) {
                    zip.extractEntryTo(csvEntry.entryName, DATA_DIR, false, true);
                    // Rename to match expected output (strip .zip)
                    const extractedPath = path.join(DATA_DIR, csvEntry.entryName);
                    if (extractedPath !== csvPath) {
                        // If the extracted file name is different, rename it
                        await fs.promises.rename(extractedPath, csvPath);
                    }
                }
                console.log(`✅ Unzipped to ${csvFilename}`);
            } catch (unzipErr) {
                console.error(`❌ Failed to unzip ${filename}:`, unzipErr.message);
                return false;
            }
        }
        return true;
    } catch (error) {
        console.error(`❌ Failed to download ${filename}:`, error.message);
        return false;
    }
}

async function fetchIndianaData() {
    console.log('Fetching Indiana campaign finance data...\n');
    
    // Ensure raw data directory exists
    await mkdir(DATA_DIR, { recursive: true });
    
    // Download files
    const results = await Promise.all([
    downloadFile(INDIANA_URLS.contributions_current, `indiana-contributions-${CURRENT_YEAR}.csv.zip`),
    downloadFile(INDIANA_URLS.contributions_previous, `indiana-contributions-${PREVIOUS_YEAR}.csv.zip`),
    ]);
    
    const successCount = results.filter(Boolean).length;
    console.log(`\nCompleted: ${successCount}/${results.length} files downloaded successfully`);
    
    if (successCount === 0) {
    throw new Error('Failed to download any Indiana data files');
    }
}

// Run if called directly
//if (import.meta.url === `file://${process.argv[1]}`) {
    fetchIndianaData()
    .then(() => {
        console.log('\n✅ Indiana data fetch complete');
        process.exit(0);
    })
    .catch(error => {
        console.error('\n❌ Indiana data fetch failed:', error.message);
        process.exit(1);
    });
//}

export { fetchIndianaData };