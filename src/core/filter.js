import { reputationCache } from '../cache.js';
import { getListContainer, getItemIdFromCard } from '../utils/dom.js';

/**
 * Hides cards that do not meet the criteria.
 * Cards with no cache data pass by default (benefit of the doubt).
 *
 * @param {number | null} minApproval  Minimum approval % (0–100), or null to skip check
 * @param {number | null} minReviews   Minimum review count, or null to skip check
 * @returns {{ shown: number, total: number }}
 */
export function applyFilter(minApproval, minReviews) {
    const lc = getListContainer();
    if (!lc) return { shown: 0, total: 0 };

    let shown = 0, total = 0;
    lc.querySelectorAll(':scope > a').forEach(card => {
        total++;
        const rep  = reputationCache.get(getItemIdFromCard(card) ?? '');
        let   pass = true;
        if (rep) {
            if (minApproval != null && (rep.approval == null || rep.approval < minApproval)) pass = false;
            if (minReviews  != null && rep.reviews < minReviews)                             pass = false;
        }
        card.style.display = pass ? '' : 'none';
        if (pass) shown++;
    });

    return { shown, total };
}

/** Restores all hidden cards. */
export function clearFilter() {
    getListContainer()
        ?.querySelectorAll(':scope > a')
        .forEach(c => { c.style.display = ''; });
}
