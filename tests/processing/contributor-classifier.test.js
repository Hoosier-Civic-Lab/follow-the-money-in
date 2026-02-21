import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { classifyContributor, classifyContributionSize } from '../../scripts/utils/contributor-classifier.js';

describe('classifyContributor — type classification', () => {
  it('returns "unitemized" when ContributorName is null/undefined', () => {
    assert.equal(classifyContributor({}), 'unitemized');
    assert.equal(classifyContributor({ ContributorName: null }), 'unitemized');
    assert.equal(classifyContributor({ ContributorName: '' }), 'unitemized');
  });

  it('returns "unitemized" when ContributorName contains the word "unitemized"', () => {
    assert.equal(classifyContributor({ ContributorName: 'Unitemized Contributions' }), 'unitemized');
    assert.equal(classifyContributor({ ContributorName: 'UNITEMIZED' }), 'unitemized');
  });

  it('returns "self" when ContributorName equals CandidateName', () => {
    const row = { ContributorName: 'Jane Smith', CandidateName: 'Jane Smith' };
    assert.equal(classifyContributor(row), 'self');
  });

  it('returns "corporate" for EntityType corporation/company', () => {
    assert.equal(classifyContributor({ ContributorName: 'Acme', EntityType: 'corporation' }), 'corporate');
    assert.equal(classifyContributor({ ContributorName: 'Acme', EntityType: 'company' }), 'corporate');
  });

  it('returns "committee" for EntityType committee/pac/party', () => {
    assert.equal(classifyContributor({ ContributorName: 'Friends for Progress', EntityType: 'committee' }), 'committee');
    assert.equal(classifyContributor({ ContributorName: 'Friends for Progress', EntityType: 'pac' }), 'committee');
    assert.equal(classifyContributor({ ContributorName: 'Friends for Progress', EntityType: 'party' }), 'committee');
  });

  it('returns "individual" for EntityType individual', () => {
    assert.equal(classifyContributor({ ContributorName: 'Jane Smith', EntityType: 'individual' }), 'individual');
  });

  it('returns "corporate" for LLC/Inc/Corp name patterns', () => {
    assert.equal(classifyContributor({ ContributorName: 'Acme LLC' }), 'corporate');
    assert.equal(classifyContributor({ ContributorName: 'TechCorp Inc' }), 'corporate');
    assert.equal(classifyContributor({ ContributorName: 'Big Corp' }), 'corporate');
    assert.equal(classifyContributor({ ContributorName: 'Holding Ltd' }), 'corporate');
    assert.equal(classifyContributor({ ContributorName: 'Smith & Associates' }), 'corporate');
  });

  it('returns "committee" for PAC name pattern', () => {
    assert.equal(classifyContributor({ ContributorName: 'Indiana PAC' }), 'committee');
  });

  it('returns "committee" for committee/fund name patterns', () => {
    assert.equal(classifyContributor({ ContributorName: 'Friends of the Committee' }), 'committee');
    assert.equal(classifyContributor({ ContributorName: 'Education Fund' }), 'committee');
  });

  it('defaults to "individual" for plain name', () => {
    assert.equal(classifyContributor({ ContributorName: 'John Doe' }), 'individual');
    assert.equal(classifyContributor({ ContributorName: 'Mary Johnson' }), 'individual');
  });
});

describe('classifyContributionSize — size thresholds', () => {
  it('returns "small" for amount < 100', () => {
    assert.equal(classifyContributionSize(0), 'small');
    assert.equal(classifyContributionSize(50), 'small');
    assert.equal(classifyContributionSize(99.99), 'small');
  });

  it('returns "medium" for 100 ≤ amount < 1000', () => {
    assert.equal(classifyContributionSize(100), 'medium');
    assert.equal(classifyContributionSize(500), 'medium');
    assert.equal(classifyContributionSize(999.99), 'medium');
  });

  it('returns "large" for 1000 ≤ amount < 10000', () => {
    assert.equal(classifyContributionSize(1000), 'large');
    assert.equal(classifyContributionSize(5000), 'large');
    assert.equal(classifyContributionSize(9999.99), 'large');
  });

  it('returns "mega" for amount ≥ 10000', () => {
    assert.equal(classifyContributionSize(10000), 'mega');
    assert.equal(classifyContributionSize(50000), 'mega');
    assert.equal(classifyContributionSize(1000000), 'mega');
  });

  it('boundary: 99.99 is small, 100 is medium', () => {
    assert.equal(classifyContributionSize(99.99), 'small');
    assert.equal(classifyContributionSize(100), 'medium');
  });

  it('boundary: 999.99 is medium, 1000 is large', () => {
    assert.equal(classifyContributionSize(999.99), 'medium');
    assert.equal(classifyContributionSize(1000), 'large');
  });

  it('boundary: 9999.99 is large, 10000 is mega', () => {
    assert.equal(classifyContributionSize(9999.99), 'large');
    assert.equal(classifyContributionSize(10000), 'mega');
  });
});
