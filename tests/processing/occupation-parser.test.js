import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { parseOccupation } from '../../scripts/utils/occupation-parser.js';

describe('parseOccupation — null/empty inputs', () => {
  it('returns "unknown" for null', () => {
    assert.equal(parseOccupation(null), 'unknown');
  });

  it('returns "unknown" for undefined', () => {
    assert.equal(parseOccupation(undefined), 'unknown');
  });

  it('returns "unknown" for empty string', () => {
    assert.equal(parseOccupation(''), 'unknown');
  });

  it('returns "unknown" for whitespace-only string', () => {
    assert.equal(parseOccupation('   '), 'unknown');
  });
});

describe('parseOccupation — case-insensitive matching', () => {
  it('matches legal occupations case-insensitively', () => {
    assert.equal(parseOccupation('Attorney'), 'legal');
    assert.equal(parseOccupation('ATTORNEY'), 'legal');
    assert.equal(parseOccupation('attorney at law'), 'legal');
    assert.equal(parseOccupation('Lawyer'), 'legal');
  });

  it('matches medical occupations case-insensitively', () => {
    assert.equal(parseOccupation('Doctor'), 'medical');
    assert.equal(parseOccupation('PHYSICIAN'), 'medical');
    assert.equal(parseOccupation('Nurse Practitioner'), 'medical');
  });

  it('matches business occupations case-insensitively', () => {
    assert.equal(parseOccupation('CEO'), 'business');
    assert.equal(parseOccupation('Business Owner'), 'business');
    assert.equal(parseOccupation('OWNER'), 'business');
  });

  it('matches finance occupations', () => {
    assert.equal(parseOccupation('Accountant'), 'finance');
    assert.equal(parseOccupation('CPA'), 'finance');
    assert.equal(parseOccupation('Financial Advisor'), 'finance');
  });

  it('matches education occupations', () => {
    assert.equal(parseOccupation('Teacher'), 'education');
    assert.equal(parseOccupation('Professor'), 'education');
  });

  it('matches real estate occupations', () => {
    assert.equal(parseOccupation('Realtor'), 'real_estate');
    assert.equal(parseOccupation('Real Estate Agent'), 'real_estate');
  });

  it('matches retired', () => {
    assert.equal(parseOccupation('Retired'), 'retired');
    assert.equal(parseOccupation('RETIRED'), 'retired');
  });

  it('matches homemaker', () => {
    assert.equal(parseOccupation('Homemaker'), 'homemaker');
    assert.equal(parseOccupation('Stay at home parent'), 'homemaker');
  });

  it('matches technology occupations', () => {
    assert.equal(parseOccupation('Software Engineer'), 'technology');
    assert.equal(parseOccupation('IT Consultant'), 'technology');
  });

  it('matches government occupations', () => {
    assert.equal(parseOccupation('Government Employee'), 'government');
  });

  it('matches agriculture occupations', () => {
    assert.equal(parseOccupation('Farmer'), 'agriculture');
  });

  it('matches labor occupations', () => {
    assert.equal(parseOccupation('Union Worker'), 'labor');
  });

  it('matches student', () => {
    assert.equal(parseOccupation('Student'), 'student');
  });
});

describe('parseOccupation — unrecognized values', () => {
  it('returns "other" for unrecognized occupations', () => {
    assert.equal(parseOccupation('Astronaut'), 'other');
    assert.equal(parseOccupation('Zookeeper'), 'other');
    assert.equal(parseOccupation('XYZ123'), 'other');
  });
});
