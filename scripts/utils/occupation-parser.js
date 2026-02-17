/**
* Parse occupation into category
* @param {string} occupation - Free-text occupation field
* @returns {string} - Category or 'unknown'/'other'
*/
export function parseOccupation(occupation) {
    if (!occupation || occupation.trim() === '') {
    return 'unknown';
    }
    
    const occ = occupation.toLowerCase().trim();
    
    // Legal
    if (/\b(attorney|lawyer|legal|counsel|law firm)\b/.test(occ)) {
    return 'legal';
    }
    
    // Medical
    if (/\b(doctor|physician|md|surgeon|dentist|medical|healthcare|nurse)\b/.test(occ)) {
    return 'medical';
    }
    
    // Business
    if (/\b(ceo|president|owner|executive|entrepreneur|business owner)\b/.test(occ)) {
    return 'business';
    }
    
    // Finance
    if (/\b(banker|accountant|cpa|financial|investment|wealth management)\b/.test(occ)) {
    return 'finance';
    }
    
    // Education
    if (/\b(teacher|professor|educator|principal|school)\b/.test(occ)) {
    return 'education';
    }
    
    // Real Estate
    if (/\b(realtor|real estate|developer|property)\b/.test(occ)) {
    return 'real_estate';
    }
    
    // Retired
    if (/\b(retired)\b/.test(occ)) {
    return 'retired';
    }
    
    // Homemaker
    if (/\b(homemaker|stay at home|stay-at-home)\b/.test(occ)) {
    return 'homemaker';
    }
    
    // Technology
    if (/\b(software|engineer|developer|tech|programmer|it)\b/.test(occ)) {
    return 'technology';
    }
    
    // Government
    if (/\b(government|federal|state employee|public)\b/.test(occ)) {
    return 'government';
    }
    
    // Agriculture
    if (/\b(farmer|agriculture|farming)\b/.test(occ)) {
    return 'agriculture';
    }
    
    // Labor
    if (/\b(union|labor|trade|construction worker)\b/.test(occ)) {
    return 'labor';
    }

    // Student
    if (/\b(student|intern)\b/.test(occ)) {
    return 'student';
    }
    
    // If we get here, couldn't categorize
    return 'other';
}