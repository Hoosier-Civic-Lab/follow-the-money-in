import { writeFile } from 'fs/promises';
import path from 'path';

const PROCESSED_DIR = 'data/processed';

async function updateMetadata() {
    console.log('Updating metadata...\n');
    
    const metadata = {
    last_updated: new Date().toISOString(),
    last_updated_readable: new Date().toLocaleString('en-US', {
        timeZone: 'America/Indiana/Indianapolis',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    }),
    next_scheduled_update: getNextSunday(),
    data_sources: [
        {
        name: 'Indiana Campaign Finance',
        url: 'https://campaignfinance.in.gov',
        last_checked: new Date().toISOString()
        },
        {
        name: 'Federal Election Commission',
        url: 'https://www.fec.gov',
        last_checked: new Date().toISOString()
        }
    ],
    version: '0.1.0',
    phase: 'Phase 0 - Data Pipeline Setup'
    };
    
    const metadataPath = path.join(PROCESSED_DIR, 'metadata.json');
    await writeFile(metadataPath, JSON.stringify(metadata, null, 2));
    
    console.log(`✅ Saved metadata to ${metadataPath}`);
    console.log(`  Last Updated: ${metadata.last_updated_readable}`);
    console.log(`  Next Update: ${metadata.next_scheduled_update}`);
    
    return metadata;
}

function getNextSunday() {
    const now = new Date();
    const dayOfWeek = now.getDay();
    const daysUntilSunday = dayOfWeek === 0 ? 7 : 7 - dayOfWeek;
    const nextSunday = new Date(now);
    nextSunday.setDate(now.getDate() + daysUntilSunday);
    nextSunday.setHours(2, 0, 0, 0); // 2 AM
    
    return nextSunday.toISOString();
}

// Run if called directly
//if (import.meta.url === `file://${process.argv[1]}`) {
    updateMetadata()
    .then(() => {
        console.log('\n✅ Metadata update complete');
        process.exit(0);
    })
    .catch(error => {
        console.error('\n❌ Metadata update failed:', error);
        process.exit(1);
    });
//}

export { updateMetadata };