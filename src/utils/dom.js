import { SELECTORS } from '../config.js';

/** @param {Element | null} el */
export const safeText = (el) => el?.textContent?.trim() || null;

/** @param {NodeList | Element[] | null} els */
export const safeTextAll = (els) =>
    Array.from(els ?? []).map(el => el.textContent?.trim()).filter(Boolean);

/**
 * Extracts the item ID from a search result card's href.
 * e.g. https://www.goofish.com/item?id=891100424551 → "891100424551"
 * @param {HTMLAnchorElement} anchor
 * @returns {string | null}
 */
export function getItemIdFromCard(anchor) {
    try { return new URL(anchor.href).searchParams.get('id'); }
    catch (_) { return null; }
}

export const getListContainer = () =>
    document.querySelector(SELECTORS.listContainer);
