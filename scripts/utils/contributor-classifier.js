/**
* Classify contributor type based on row data
* @param {object} row - Contribution row
* @returns {string} - individual|corporate|committee|self|unitemized
*/
export function classifyContributor(row) {
    // Handle unitemized contributions
    if (!row.ContributorName || row.ContributorName.toLowerCase().includes('unitemized')) {
    return 'unitemized';
    }
    
    // Check if self-contribution
    if (row.ContributorName === row.CandidateName) {
    return 'self';
    }
    
    // Check entity type field (if available)
    const entityType = (row.EntityType || '').toLowerCase();
    if (entityType === 'corporation' || entityType === 'company') {
    return 'corporate';
    }
    if (entityType === 'committee' || entityType === 'pac' || entityType === 'party') {
    return 'committee';
    }
    if (entityType === 'individual') {
    return 'individual';
    }
    
    // Pattern matching on name
    const name = row.ContributorName.toLowerCase();
    
    // Corporate indicators
    const corporatePatterns = [
    /\b(inc|llc|corp|corporation|company|ltd|limited)\b/,
    /(& associates|and associates|& sons|and sons)/,
    /\bpac\b/
    ];
    
    for (const pattern of corporatePatterns) {
    if (pattern.test(name)) {
        return name.includes('pac') ? 'committee' : 'corporate';
    }
    }
    
    // Committee indicators
    if (name.includes('committee') || name.includes('fund')) {
    return 'committee';
    }
    
    // Default to individual
    return 'individual';
}

/**
* Determine contribution size category
* @param {number} amount - Contribution amount
* @returns {string} - small|medium|large|mega
*/
export function classifyContributionSize(amount) {
    if (amount < 100) return 'small';
    if (amount < 1000) return 'medium';
    if (amount < 10000) return 'large';
    return 'mega';
}