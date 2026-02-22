/**
 * Copy data/processed/ into dist/data/processed/ for local preview.
 * In CI this is done by a shell step; this script exists for local use.
 *
 * Usage: node scripts/copy-data-to-dist.js
 */
import { cpSync, existsSync } from 'fs';
import path from 'path';

const src = 'data/processed';
const dest = path.join('dist', 'data', 'processed');

if (!existsSync(src)) {
    console.error(`❌ ${src} does not exist — run the data pipeline first (npm run update:all)`);
    process.exit(1);
}

cpSync(src, dest, { recursive: true });
console.log(`✅ Copied ${src} → ${dest}`);
