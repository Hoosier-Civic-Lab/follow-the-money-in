/**
 * Indiana election calendar — hardcoded primary and general election dates.
 * Used to classify contributions into campaign phases.
 */

export const INDIANA_ELECTIONS = {
    2018: { primary: '2018-05-08', general: '2018-11-06' },
    2020: { primary: '2020-06-02', general: '2020-11-03' },
    2022: { primary: '2022-05-03', general: '2022-11-08' },
    2024: { primary: '2024-05-07', general: '2024-11-05' },
    2026: { primary: '2026-05-05', general: '2026-11-03' },
};

/**
 * Determine which campaign phase a contribution date falls into.
 * Primary phase: on or before the primary election date.
 * General phase: after the primary and on or before the general election date.
 *
 * @param {string} dateStr  ISO date string e.g. '2024-03-15'
 * @param {number} year     Election cycle year
 * @returns {'primary' | 'general' | 'unknown'}
 */
export function getPhase(dateStr, year) {
    if (!dateStr || !year) return 'unknown';
    const election = INDIANA_ELECTIONS[year];
    if (!election) return 'unknown';

    const date = dateStr.slice(0, 10); // normalize to YYYY-MM-DD
    if (date <= election.primary) return 'primary';
    if (date <= election.general) return 'general';
    return 'unknown';
}

/**
 * Get the phase boundary dates for a given election year.
 *
 * @param {number} year
 * @returns {{ primaryDate: string, generalDate: string } | null}
 */
export function getPhaseBoundaries(year) {
    const election = INDIANA_ELECTIONS[year];
    if (!election) return null;
    return { primaryDate: election.primary, generalDate: election.general };
}

/**
 * Filter a by_month map to only include months within a phase.
 * by_month is { 'YYYY-MM': { count, total } }
 *
 * @param {Object} byMonth
 * @param {'primary' | 'general' | 'all'} phase
 * @param {number} year  Election cycle year
 * @returns {Object}  Filtered by_month entries
 */
export function filterByMonthForPhase(byMonth, phase, year) {
    if (!byMonth || phase === 'all') return byMonth;
    const bounds = getPhaseBoundaries(year);
    if (!bounds) return byMonth;

    const { primaryDate, generalDate } = bounds;
    const primaryYM = primaryDate.slice(0, 7);  // YYYY-MM
    const generalYM = generalDate.slice(0, 7);

    return Object.fromEntries(
        Object.entries(byMonth).filter(([ym]) => {
            if (phase === 'primary') return ym <= primaryYM;
            if (phase === 'general') return ym > primaryYM && ym <= generalYM;
            return true;
        })
    );
}
