/**
 * Integration tests: validate live data/processed/ files.
 *
 * These tests read actual pipeline output and assert schema + cross-file
 * consistency. They are skipped gracefully if data/processed/ does not yet
 * exist (e.g. fresh clone with no pipeline run).
 *
 * Run with: node --test tests/integration/
 * Or via:   npm test
 */

import { describe, it, before } from 'node:test';
import assert from 'node:assert/strict';
import { readFile, access } from 'fs/promises';
import path from 'path';

const PROCESSED_DIR = 'data/processed';
const SAMPLE_SIZE = 100; // avoid reading full 35 MB dataset into assertions

const VALID_CONTRIBUTOR_TYPES = new Set(['individual', 'corporate', 'committee', 'self', 'unitemized']);
const VALID_CONTRIBUTION_SIZES = new Set(['small', 'medium', 'large', 'mega']);

async function fileExists(fp) {
  try { await access(fp); return true; } catch { return false; }
}

let contributions = null;
let summary = null;
let metadata = null;
let dataAvailable = false;

before(async () => {
  const contribPath = path.join(PROCESSED_DIR, 'all-contributions.json');
  const summaryPath = path.join(PROCESSED_DIR, 'summary-all-races.json');
  const metaPath = path.join(PROCESSED_DIR, 'metadata.json');

  if (!(await fileExists(contribPath)) ||
      !(await fileExists(summaryPath)) ||
      !(await fileExists(metaPath))) {
    console.log('[integration] data/processed/ not populated — skipping integration tests');
    dataAvailable = false;
    return;
  }

  [contributions, summary, metadata] = await Promise.all([
    readFile(contribPath, 'utf-8').then(JSON.parse),
    readFile(summaryPath, 'utf-8').then(JSON.parse),
    readFile(metaPath, 'utf-8').then(JSON.parse),
  ]);
  dataAvailable = true;
});

describe('all-contributions.json schema', () => {
  it('is a non-empty array', () => {
    if (!dataAvailable) return;
    assert.ok(Array.isArray(contributions), 'Expected array');
    assert.ok(contributions.length > 0, 'Expected non-empty array');
  });

  it('first 100 records have required fields', () => {
    if (!dataAvailable) return;
    const sample = contributions.slice(0, SAMPLE_SIZE);
    const requiredFields = ['id', 'amount', 'contributor_type', 'contribution_size', 'source'];
    for (const record of sample) {
      for (const field of requiredFields) {
        assert.ok(field in record, `Record missing required field: ${field}`);
      }
    }
  });

  it('first 100 records have valid contributor_type enum', () => {
    if (!dataAvailable) return;
    const sample = contributions.slice(0, SAMPLE_SIZE);
    for (const record of sample) {
      assert.ok(
        VALID_CONTRIBUTOR_TYPES.has(record.contributor_type),
        `Invalid contributor_type "${record.contributor_type}" in record ${record.id}`
      );
    }
  });

  it('first 100 records have valid contribution_size enum', () => {
    if (!dataAvailable) return;
    const sample = contributions.slice(0, SAMPLE_SIZE);
    for (const record of sample) {
      assert.ok(
        VALID_CONTRIBUTION_SIZES.has(record.contribution_size),
        `Invalid contribution_size "${record.contribution_size}" in record ${record.id}`
      );
    }
  });

  it('first 100 records have non-negative numeric amount', () => {
    if (!dataAvailable) return;
    const sample = contributions.slice(0, SAMPLE_SIZE);
    for (const record of sample) {
      assert.ok(typeof record.amount === 'number', `amount not a number in record ${record.id}`);
      assert.ok(record.amount >= 0, `Negative amount in record ${record.id}: ${record.amount}`);
    }
  });

  it('source field is "indiana" or "fec" on sampled records', () => {
    if (!dataAvailable) return;
    const validSources = new Set(['indiana', 'fec']);
    const sample = contributions.slice(0, SAMPLE_SIZE);
    for (const record of sample) {
      assert.ok(
        validSources.has(record.source),
        `Unexpected source "${record.source}" in record ${record.id}`
      );
    }
  });
});

describe('summary-all-races.json schema', () => {
  it('has totals object with required keys', () => {
    if (!dataAvailable) return;
    assert.ok(summary.totals, 'Missing summary.totals');
    assert.ok('total_raised' in summary.totals, 'Missing totals.total_raised');
    assert.ok('total_contributions' in summary.totals, 'Missing totals.total_contributions');
    assert.ok('total_itemized' in summary.totals, 'Missing totals.total_itemized');
    assert.ok('total_unitemized' in summary.totals, 'Missing totals.total_unitemized');
  });

  it('total_contributors matches all-contributions.json length', () => {
    if (!dataAvailable) return;
    assert.equal(
      summary.totals.total_contributions,
      contributions.length,
      'summary.totals.total_contributions does not match array length'
    );
  });

  it('total_itemized + total_unitemized equals total_contributors', () => {
    if (!dataAvailable) return;
    assert.equal(
      summary.totals.total_itemized + summary.totals.total_unitemized,
      summary.totals.total_contributions,
      'itemized + unitemized should equal total_contributions'
    );
  });

  it('last_updated is valid ISO datetime', () => {
    if (!dataAvailable) return;
    assert.ok(summary.last_updated, 'Missing summary.last_updated');
    assert.ok(!isNaN(Date.parse(summary.last_updated)), `Invalid ISO date: ${summary.last_updated}`);
  });
});

describe('metadata.json schema', () => {
  it('has last_updated field', () => {
    if (!dataAvailable) return;
    assert.ok(metadata.last_updated, 'Missing metadata.last_updated');
  });

  it('last_updated is valid ISO datetime', () => {
    if (!dataAvailable) return;
    assert.ok(!isNaN(Date.parse(metadata.last_updated)), `Invalid ISO date: ${metadata.last_updated}`);
  });
});
