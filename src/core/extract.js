import { reputationCache, lastSellerUserId } from '../cache.js';
import { safeText, safeTextAll, getItemIdFromCard, getListContainer } from '../utils/dom.js';
import { SELECTORS } from '../config.js';

/** Extracts all relevant data from the item detail page. */
export function extractSingleItem() {
    const item = { url: window.location.href };

    item.vendedor_nome = safeText(document.querySelector(SELECTORS.sellerName));

    const sellerInfoEl = document.querySelector(SELECTORS.sellerInfo);
    if (sellerInfoEl) {
        const labels = safeTextAll(sellerInfoEl.querySelectorAll(SELECTORS.sellerLabel));
        for (const text of labels) {
            if (!item.vendedor_location) {
                const loc = text.match(/^[\u4e00-\u9fa5]{2,}/);
                if (loc && !text.includes('天') && !text.includes('件') && !text.includes('%'))
                    item.vendedor_location = loc[0];
            }
            const dias = text.match(/来闲鱼(\d+)天/);
            if (dias) item.vendedor_dias = parseInt(dias[1]);
            const vendidos = text.match(/卖出(\d+)件/);
            if (vendidos) item.vendedor_vendidos = parseInt(vendidos[1]);
            const aprovacao = text.match(/好评率(\d+)%/);
            if (aprovacao) item.vendedor_aprovacao = parseInt(aprovacao[1]);
        }
    }

    // Find seller userId: try DOM link first, fall back to last intercepted
    const sellerLink = document.querySelector('a[href*="personal?"]') ?? document.querySelector('a[href*="userId="]');
    if (sellerLink) {
        const m = sellerLink.href.match(/[?&]userId=(\d+)/);
        if (m) item.vendedor_id = m[1];
    }
    if (!item.vendedor_id && lastSellerUserId) {
        item.vendedor_id = lastSellerUserId;
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
