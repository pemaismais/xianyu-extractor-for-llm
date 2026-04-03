import { reputationCache } from '../cache.js';
import { safeText, safeTextAll, getItemIdFromCard, getListContainer } from '../utils/dom.js';
import { SELECTORS } from '../config.js';

/** Extracts all relevant data from the item detail page. */
export function extractSingleItem() {
    const item = { url: window.location.href };

    item.vendedor_nome = safeText(document.querySelector(SELECTORS.sellerName));

    const sellerInfoEl = document.querySelector(SELECTORS.sellerInfo);
    if (sellerInfoEl) {
        const infos = safeTextAll(sellerInfoEl.querySelectorAll(SELECTORS.sellerLabel));
        if (infos.length) item.vendedor_info = infos.join(', ');
    }

    item.preco = safeText(document.querySelector(SELECTORS.price));

    const mainEl = document.querySelector(SELECTORS.mainContainer);
    if (mainEl) {
        const descEl = mainEl.querySelector(SELECTORS.desc);
        if (descEl) {
            const clone = descEl.cloneNode(true);
            clone.querySelectorAll('br').forEach(br => br.replaceWith(' | '));
            item.descricao = (clone.textContent?.trim() ?? '')
                .replace(/\s*\|\s*\|\s*/g, ' | ')
                .replace(/\s*\|\s*$/, '')
                .trim() || null;
        }
    }

    const labelsEl = document.querySelector(SELECTORS.labels);
    if (labelsEl) {
        const attrs = [];
        labelsEl.querySelectorAll(SELECTORS.labelItem).forEach(li => {
            const l = safeText(li.querySelector(SELECTORS.labelKey));
            const v = safeText(li.querySelector(SELECTORS.labelValue));
            if (l && v) attrs.push(`${l}: ${v}`);
        });
        if (attrs.length) item.atributos = attrs;
    }

    const wantText = safeText(document.querySelector(SELECTORS.want));
    if (wantText) item.engajamento = wantText;

    return item;
}

/**
 * Extracts all visible (non-filtered) products from the search page.
 * Enriches each product with reputation data from reputationCache when available.
 * @returns {object[] | null}
 */
export function extractProducts() {
    const lc = getListContainer();
    if (!lc) { alert('Container de produtos não encontrado.'); return null; }

    const products = [];
    let visibleIndex = 0;

    lc.querySelectorAll(':scope > a').forEach(card => {
        if (card.style.display === 'none') return;
        try {
            visibleIndex++;
            const product = { index: visibleIndex, url: card.href || null };

            const titleSpan = card.querySelector(SELECTORS.cardTitle);
            if (titleSpan) {
                const clone = titleSpan.cloneNode(true);
                clone.querySelectorAll('img').forEach(img => img.remove());
                product.titulo = clone.textContent?.trim() || null;
            }

            const row2 = card.querySelector(SELECTORS.cardRow2);
            if (row2) {
                const tags = safeTextAll(row2.querySelectorAll('div > span'));
                if (tags.length) product.tags = tags;
            }

            product.preco    = safeText(card.querySelector(SELECTORS.cardPrice));
            const promoText  = safeText(card.querySelector(SELECTORS.cardPromo));
            if (promoText) product.promocao = promoText;

            product.vendedor = safeText(card.querySelector(SELECTORS.cardSeller));
            const sellerTag  = safeText(card.querySelector(SELECTORS.cardSellerTag));
            if (sellerTag) product.vendedor_tag = sellerTag;

            // Enrich with reputation from intercepted API response
            const rep = reputationCache.get(getItemIdFromCard(card) ?? '');
            if (rep) {
                if (rep.approval !== null) product.aprovacao  = rep.approval;
                if (rep.reviews  > 0)     product.avaliacoes  = rep.reviews;
            }

            if (product.titulo || product.preco) products.push(product);
        } catch (e) {
            console.error(`Erro ao extrair produto ${visibleIndex}:`, e);
        }
    });

    return products;
}
