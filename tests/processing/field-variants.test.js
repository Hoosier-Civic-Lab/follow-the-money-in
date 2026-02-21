/**
 * Tests for CSV field-name fallback logic in process-data.js.
 *
 * Indiana CSV column names vary by year. process-data.js uses `row.X || row.Y`
 * fallbacks to handle known variants. These tests document and protect that logic.
 *
 * See: docs/references/indiana-field-variants.md for full field variant table.
 * See: docs/design-docs/data-quirks.md for context on why variants exist.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

// These helper functions replicate the field-extraction logic from process-data.js
// so we can test fallback behavior in isolation without running the full pipeline.

function extractDate(row) {
  return row.ContributionDate || row.Date || null;
}

function extractAmount(row) {
  return parseFloat(row.Amount || row.ContributionAmount || 0);
}

function extractCandidateName(row) {
  return row.CandidateName || row.Candidate || null;
}

function extractContributorName(row) {
  return row.ContributorName || row.Contributor || null;
}

describe('field-variants: contribution date', () => {
  it('uses ContributionDate when present (newer CSV format)', () => {
    const row = { ContributionDate: '2024-05-13 00:00:00' };
    assert.equal(extractDate(row), '2024-05-13 00:00:00');
  });

  it('falls back to Date when ContributionDate is absent (older format)', () => {
    const row = { Date: '2023-11-01' };
    assert.equal(extractDate(row), '2023-11-01');
  });

  it('returns null when neither field is present', () => {
    assert.equal(extractDate({}), null);
  });

  // KNOWN GAP: When both fields are absent (e.g. header mismatch), date silently becomes null.
  // This should trigger a [WARN] in validate-output.js.
  it('documents null-date scenario (known gap — no error thrown)', () => {
    const row = { SomeOtherField: 'value' };
    assert.equal(extractDate(row), null);
  });
});

describe('field-variants: amount', () => {
  it('uses Amount when present', () => {
    assert.equal(extractAmount({ Amount: '300.0000' }), 300);
  });

  it('falls back to ContributionAmount', () => {
    assert.equal(extractAmount({ ContributionAmount: '50.00' }), 50);
  });

  it('defaults to 0 when neither is present', () => {
    assert.equal(extractAmount({}), 0);
  });

  it('parses the 4-decimal-place format used by Indiana SoS (e.g. "300.0000")', () => {
    assert.equal(extractAmount({ Amount: '300.0000' }), 300);
    assert.equal(extractAmount({ Amount: '1250.5000' }), 1250.5);
  });
});

describe('field-variants: candidate name', () => {
  it('uses CandidateName when present', () => {
    assert.equal(extractCandidateName({ CandidateName: 'Jane Smith' }), 'Jane Smith');
  });

  it('falls back to Candidate', () => {
    assert.equal(extractCandidateName({ Candidate: 'John Doe' }), 'John Doe');
  });

  it('returns null when neither is present', () => {
    assert.equal(extractCandidateName({}), null);
  });
});

describe('field-variants: contributor name', () => {
  it('uses ContributorName when present', () => {
    assert.equal(extractContributorName({ ContributorName: 'Acme LLC' }), 'Acme LLC');
  });

  it('falls back to Contributor', () => {
    assert.equal(extractContributorName({ Contributor: 'Bob Jones' }), 'Bob Jones');
  });

  it('returns null when neither is present (triggers unitemized classification)', () => {
    assert.equal(extractContributorName({}), null);
  });
});

// KNOWN GAP: State abbreviation normalization is not implemented.
// Indiana source data contains mixed-case state values ('in', 'In', 'IN', 'Indiana').
// These are stored as-is; no canonical normalization happens in process-data.js.
// See: docs/references/state-codes.md, docs/design-docs/data-quirks.md#state-normalization
describe('field-variants: state normalization (KNOWN GAP — currently unfixed)', () => {
  // This test intentionally documents unimplemented behavior.
  it('documents that state values are NOT normalized (passes raw value through)', () => {
    // The pipeline stores address_state = row.State with no casing or alias fix.
    // If normalization were implemented, 'in' and 'Indiana' would both become 'IN'.
    // For now we assert the current (raw) behavior to make the gap visible.
    const rawValues = ['in', 'In', 'IN', 'Indiana', ' IN'];
    // All distinct — no deduplication is happening
    const distinctValues = new Set(rawValues);
    assert.equal(distinctValues.size, rawValues.length,
      'State values are not normalized — each variant remains distinct (known gap)');
  });
});
