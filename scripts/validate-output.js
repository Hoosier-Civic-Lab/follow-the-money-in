/**
 * Validate pipeline output files in data/processed/.
 *
 * Prints [PASS] / [FAIL] / [WARN] per check and exits non-zero on any failure.
 * Designed for agent self-verification after pipeline changes.
 *
 * Usage: node scripts/validate-output.js
 * Docs:  docs/design-docs/data-quirks.md
 */

import { readFile, access } from 'fs/promises';
import path from 'path';

const PROCESSED_DIR = 'data/processed';

const VALID_CONTRIBUTOR_TYPES = new Set(['individual', 'corporate', 'committee', 'self', 'unitemized']);
const VALID_CONTRIBUTION_SIZES = new Set(['small', 'medium', 'large', 'mega']);

let failures = 0;
let warnings = 0;

function pass(msg) {
  console.log(`[PASS] ${msg}`);
}

function fail(msg, docPointer) {
  failures++;
  const pointer = docPointer ? ` → ${docPointer}` : '';
  console.error(`[FAIL] ${msg}${pointer}`);
}

function warn(msg) {
  warnings++;
  console.log(`[WARN] ${msg}`);
}

async function fileExists(filepath) {
  try {
    await access(filepath);
    return true;
  } catch {
    return false;
  }
}

async function validateRequiredFiles() {
  const required = [
    'all-contributions.json',
    'summary-all-races.json',
    'metadata.json',
  ];
  let allPresent = true;
  for (const f of required) {
    const fp = path.join(PROCESSED_DIR, f);
    if (await fileExists(fp)) {
      pass(`Required file present: ${f}`);
    } else {
      fail(`Missing required file: ${f}`, 'docs/design-docs/data-quirks.md');
      allPresent = false;
    }
  }
  return allPresent;
}

async function validateContributions(contributions) {
  // Non-empty array
  if (!Array.isArray(contributions) || contributions.length === 0) {
    fail('all-contributions.json must be a non-empty array', 'docs/design-docs/data-quirks.md');
    return;
  }
  pass(`all-contributions.json is a non-empty array (${contributions.length} records)`);

  // Valid enum values
  let invalidType = 0;
  let invalidSize = 0;
  let negativeAmount = 0;
  let nullDate = 0;
  let stateValues = new Set();
  let unitemizedCount = 0;

  for (const record of contributions) {
    if (!VALID_CONTRIBUTOR_TYPES.has(record.contributor_type)) invalidType++;
    if (!VALID_CONTRIBUTION_SIZES.has(record.contribution_size)) invalidSize++;
    if (typeof record.amount !== 'number' || record.amount < 0) {
      negativeAmount++;
    }
    if (!record.date) nullDate++;
    if (record.address_state) stateValues.add(record.address_state);
    if (record.contributor_type === 'unitemized') unitemizedCount++;
  }

  if (invalidType === 0) {
    pass('All records have valid contributor_type enum');
  } else {
    fail(`${invalidType} records have invalid contributor_type (not in: ${[...VALID_CONTRIBUTOR_TYPES].join(', ')})`, 'docs/design-docs/data-quirks.md');
  }

  if (invalidSize === 0) {
    pass('All records have valid contribution_size enum');
  } else {
    fail(`${invalidSize} records have invalid contribution_size (not in: ${[...VALID_CONTRIBUTION_SIZES].join(', ')})`, 'docs/design-docs/data-quirks.md');
  }

  if (negativeAmount === 0) {
    pass('All records have non-negative numeric amount');
  } else {
    fail(`${negativeAmount} records have negative or non-numeric amount`, 'docs/design-docs/data-quirks.md');
  }

  // Warn if 100% unitemized (runaway misclassification)
  const unitemizedPct = contributions.length > 0
    ? (unitemizedCount / contributions.length) * 100
    : 0;
  warn(`${unitemizedPct.toFixed(1)}% of records are unitemized (expected ~90%; 100% indicates misclassification — docs/design-docs/data-quirks.md)`);

  if (unitemizedPct >= 99) {
    fail(`${unitemizedPct.toFixed(1)}% unitemized exceeds 99% threshold — possible runaway misclassification`, 'docs/design-docs/data-quirks.md#unitemized-bulk');
  }

  // Warn on null dates
  const nullDatePct = (nullDate / contributions.length) * 100;
  if (nullDatePct > 0) {
    warn(`${nullDatePct.toFixed(1)}% of records have null date (check CSV field-name fallback — docs/references/indiana-field-variants.md)`);
  }

  // Warn on distinct state values (high = normalization gap)
  warn(`${stateValues.size} distinct state values found (high count may indicate normalization gap — docs/references/state-codes.md)`);
}

async function validateSummary(summary, contributions) {
  if (!summary || typeof summary !== 'object') {
    fail('summary-all-races.json must be a JSON object', 'docs/design-docs/data-quirks.md');
    return;
  }

  // totals.total_contributors matches contributions length
  if (contributions && Array.isArray(contributions)) {
    const declared = summary?.totals?.total_contributions;
    const actual = contributions.length;
    if (declared === actual) {
      pass(`summary.totals.total_contributors (${declared}) matches all-contributions.json length`);
    } else {
      fail(`summary.totals.total_contributions (${declared}) !== all-contributions.json length (${actual})`, 'docs/design-docs/data-quirks.md');
    }
  }

  // last_updated is valid ISO datetime
  const lastUpdated = summary?.last_updated;
  if (lastUpdated && !isNaN(Date.parse(lastUpdated))) {
    pass(`summary.last_updated is valid ISO datetime: ${lastUpdated}`);
  } else {
    fail(`summary.last_updated is missing or invalid: ${lastUpdated}`, 'docs/design-docs/data-quirks.md');
  }
}

async function validateMetadata(metadata) {
  if (!metadata || typeof metadata !== 'object') {
    fail('metadata.json must be a JSON object', 'docs/design-docs/data-quirks.md');
    return;
  }

  const lastUpdated = metadata?.last_updated;
  if (lastUpdated && !isNaN(Date.parse(lastUpdated))) {
    pass(`metadata.last_updated is valid ISO datetime: ${lastUpdated}`);
  } else {
    fail(`metadata.last_updated is missing or invalid: ${lastUpdated}`, 'docs/design-docs/data-quirks.md');
  }
}

async function main() {
  console.log('Validating pipeline output in data/processed/\n');

  const allPresent = await validateRequiredFiles();
  if (!allPresent) {
    console.log(`\n--- Validation incomplete: required files missing ---`);
    console.log(`Failures: ${failures}  Warnings: ${warnings}`);
    process.exit(1);
  }

  console.log('');

  // Load files
  const [contribs, summary, metadata] = await Promise.all([
    readFile(path.join(PROCESSED_DIR, 'all-contributions.json'), 'utf-8').then(JSON.parse),
    readFile(path.join(PROCESSED_DIR, 'summary-all-races.json'), 'utf-8').then(JSON.parse),
    readFile(path.join(PROCESSED_DIR, 'metadata.json'), 'utf-8').then(JSON.parse),
  ]);

  console.log('--- all-contributions.json ---');
  await validateContributions(contribs);

  console.log('\n--- summary-all-races.json ---');
  await validateSummary(summary, contribs);

  console.log('\n--- metadata.json ---');
  await validateMetadata(metadata);

  console.log(`\n${'─'.repeat(50)}`);
  if (failures === 0) {
    console.log(`Validation PASSED  (${warnings} warning(s))`);
  } else {
    console.error(`Validation FAILED  (${failures} failure(s), ${warnings} warning(s))`);
    process.exit(1);
  }
}

main().catch(err => {
  console.error('[FAIL] Unexpected error during validation:', err.message);
  process.exit(1);
});
