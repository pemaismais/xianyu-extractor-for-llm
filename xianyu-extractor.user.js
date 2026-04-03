// ==UserScript==
// @name         Xianyu/Goofish Product Extractor for LLM
// @namespace    http://tampermonkey.net/
// @version      2.0
// @description  Extrai produtos da busca e páginas individuais do Goofish formatado para análise com LLM
// @author       pemaismais
// @homepage     https://github.com/pemaismais/xianyu-extractor-for-llm
// @homepageURL  https://github.com/pemaismais/xianyu-extractor-for-llm
// @match        https://www.goofish.com/search*
// @match        https://goofish.com/search*
// @match        https://www.goofish.com/item*
// @match        https://goofish.com/item*
// @grant        GM_setClipboard
// @grant        GM_notification
// @grant        GM_setValue
// @grant        GM_getValue
// @run-at       document-start
// ==/UserScript==
(function () {
    'use strict';

    /** @type {Map<string, { reviews: number, approval: number | null }>} */
    const reputationCache = new Map();

    /**
     * Intercepts XMLHttpRequest (used by Alibaba's mtop.js library) to populate
     * reputationCache from mtop.taobao.idlemtopsearch responses.
     * Each item carries userFishShopLabel with "19条评价" / "好评率100%".
     */
    function installInterceptor() {
        const _origOpen = XMLHttpRequest.prototype.open;
        const _origSend = XMLHttpRequest.prototype.send;

        XMLHttpRequest.prototype.open = function (method, url, ...rest) {
            this._xianyuUrl = typeof url === 'string' ? url : '';
            return _origOpen.apply(this, [method, url, ...rest]);
        };

        XMLHttpRequest.prototype.send = function (...args) {
            if (this._xianyuUrl.includes('mtop.taobao.idlemtopsearch')) {
                this.addEventListener('load', function () {
                    try {
                        const json = JSON.parse(this.responseText);
                        const list = json?.data?.resultList ?? [];

                        for (const entry of list) {
                            const ex = entry?.data?.item?.main?.exContent;
                            if (!ex?.itemId) continue;

                            let reviews = 0, approval = null;
                            for (const tag of (ex.userFishShopLabel?.tagList ?? [])) {
                                const c  = tag?.data?.content ?? '';
                                const rm = c.match(/(\d+)条评价/);
                                if (rm) reviews  = parseInt(rm[1]);
                                const am = c.match(/好评率(\d+)%/);
                                if (am) approval = parseInt(am[1]);
                            }

                            reputationCache.set(String(ex.itemId), { reviews, approval });
                        }

                        if (list.length > 0) {
                            console.log('[xianyu] cache:', reputationCache.size, 'itens');
                        }
                    } catch (e) {
                        console.error('[xianyu] XHR parse error:', e);
                    }
                });
            }

            return _origSend.apply(this, args);
        };
    }

    const MARGIN         = 12;
    const SNAP_THRESHOLD = 60;

    const SIZES = {
        small:  { padding: '6px 10px',  fontSize: '11px', iconSize: '14px', gap: '5px',  minWidth: '120px' },
        medium: { padding: '10px 16px', fontSize: '13px', iconSize: '18px', gap: '8px',  minWidth: '170px' },
        large:  { padding: '14px 22px', fontSize: '15px', iconSize: '22px', gap: '10px', minWidth: '200px' },
    };
    const SIZE_ORDER = ['small', 'medium', 'large'];

    const ICON = {
        copy:   'https://api.iconify.design/mdi:content-copy.svg?color=%23e0e0e0',
        check:  'https://api.iconify.design/mdi:check.svg?color=%2322c55e',
        alert:  'https://api.iconify.design/mdi:alert-circle.svg?color=%23ef4444',
        resize: 'https://api.iconify.design/mdi:resize.svg?color=%23e0e0e0',
        filter: 'https://api.iconify.design/mdi:filter-outline.svg?color=%23e0e0e0',
    };

    const SELECTORS = {
        listContainer: '.feeds-list-container--UkIMBPNk',
        // item page
        sellerName:    '.item-user-info-nick--rtpDhkmQ',
        sellerInfo:    '.item-user-info-intro--ZN1A0_8Y',
        sellerLabel:   '.item-user-info-label--NLTMHARN',
        price:         '.price--OEWLbcxC',
        mainContainer: '.main--Nu33bWl6',
        desc:          '.desc--GaIUKUQY',
        labels:        '.labels--ndhPFgp8',
        labelItem:     '.item--qI9ENIfp',
        labelKey:      '.label--ejJeaTRV',
        labelValue:    '.value--EyQBSInp',
        want:          '.want--ecByv3Sr',
        // search cards
        cardTitle:     '.main-title--sMrtWSJa',
        cardRow2:      '.row2-wrap-cpv--_dKW4c6D',
        cardPrice:     '.number--NKh1vXWM',
        cardPromo:     '.price-desc--hxYyq3i3',
        cardSeller:    '.seller-text--Rr2Y3EbB',
        cardSellerTag: '.credit-container--w3dcSvoi span',
    };

    /** @param {Element | null} el */
    const safeText = (el) => el?.textContent?.trim() || null;

    /** @param {NodeList | Element[] | null} els */
    const safeTextAll = (els) =>
        Array.from(els ?? []).map(el => el.textContent?.trim()).filter(Boolean);

    /**
     * Extracts the item ID from a search result card's href.
     * e.g. https://www.goofish.com/item?id=891100424551 → "891100424551"
     * @param {HTMLAnchorElement} anchor
     * @returns {string | null}
     */
    function getItemIdFromCard(anchor) {
        try { return new URL(anchor.href).searchParams.get('id'); }
        catch (_) { return null; }
    }

    const getListContainer = () =>
        document.querySelector(SELECTORS.listContainer);

    /**
     * Returns a snapped position keeping the element inside the viewport
     * with a soft margin. Snaps to the nearest edge when close enough.
     *
     * @param {number} left
     * @param {number} top
     * @param {number} width
     * @param {number} height
     * @returns {{ left: number, top: number }}
     */
    function snapPosition(left, top, width, height) {
        const vw = window.innerWidth, vh = window.innerHeight;

        if (left < SNAP_THRESHOLD)                left = MARGIN;
        else if (left + width > vw - SNAP_THRESHOLD) left = vw - width - MARGIN;

        if (top < SNAP_THRESHOLD)                 top = MARGIN;
        else if (top + height > vh - SNAP_THRESHOLD) top = vh - height - MARGIN;

        return {
            left: Math.max(MARGIN, Math.min(left, vw - width - MARGIN)),
            top:  Math.max(MARGIN, Math.min(top,  vh - height - MARGIN)),
        };
    }

    /** @param {string} key @param {*} fallback */
    const getStorage$1 = (key, fallback = null) =>
        typeof GM_getValue !== 'undefined' ? GM_getValue(key, fallback) : fallback;

    /** @param {string} key @param {*} value */
    const setStorage$1 = (key, value) => {
        if (typeof GM_setValue !== 'undefined') GM_setValue(key, value);
    };

    /**
     * Creates the fixed draggable wrapper that holds all button UI.
     * Children that call e.stopPropagation() on mousedown will suppress drag.
     *
     * @returns {{ el: HTMLDivElement, onContainerClick: (cb: (e: MouseEvent) => void) => void }}
     */
    function createDragContainer() {
        const savedPos = getStorage$1('btnPos', null);

        const el = document.createElement('div');
        el.style.cssText = savedPos
            ? `position: fixed; top: ${savedPos.top}px; left: ${savedPos.left}px; z-index: 99999; cursor: grab; user-select: none; transition: left 0.15s ease, top 0.15s ease;`
            : `position: fixed; top: 80px; right: 20px; z-index: 99999; cursor: grab; user-select: none; transition: left 0.15s ease, top 0.15s ease;`;

        let isDragging = false, hasDragged = false;
        let startX = 0, startY = 0, startLeft = 0, startTop = 0;
        const clickCallbacks = [];

        el.addEventListener('mousedown', e => {
            isDragging = true;
            hasDragged = false;
            el.style.cursor = 'grabbing';
            startX = e.clientX;
            startY = e.clientY;
            const rect = el.getBoundingClientRect();
            startLeft = rect.left;
            startTop  = rect.top;
            e.preventDefault();
        });

        document.addEventListener('mousemove', e => {
            if (!isDragging) return;
            const dx = e.clientX - startX, dy = e.clientY - startY;
            if (Math.abs(dx) > 3 || Math.abs(dy) > 3) hasDragged = true;
            el.style.transition = 'none';
            el.style.left  = (startLeft + dx) + 'px';
            el.style.top   = (startTop  + dy) + 'px';
            el.style.right = 'auto';
        });

        document.addEventListener('mouseup', e => {
            if (!isDragging) return;
            isDragging = false;
            el.style.cursor = 'grab';
            el.style.transition = 'left 0.15s ease, top 0.15s ease';
            const rect    = el.getBoundingClientRect();
            const snapped = snapPosition(rect.left, rect.top, rect.width, rect.height);
            el.style.left = snapped.left + 'px';
            el.style.top  = snapped.top  + 'px';
            setStorage$1('btnPos', snapped);
            if (!hasDragged) clickCallbacks.forEach(cb => cb(e));
        });

        window.addEventListener('resize', () => {
            const rect    = el.getBoundingClientRect();
            const snapped = snapPosition(rect.left, rect.top, rect.width, rect.height);
            el.style.left = snapped.left + 'px';
            el.style.top  = snapped.top  + 'px';
        });

        return {
            el,
            /** @param {(e: MouseEvent) => void} cb */
            onContainerClick: (cb) => clickCallbacks.push(cb),
        };
    }

    /**
     * Creates the shared extract button + size toggle pair used by both pages.
     * The filter button (search-only) is inserted between btn and sizeToggle by the caller.
     *
     * @param {string} label  Initial button text
     * @returns {{
     *   btn: HTMLButtonElement,
     *   icon: HTMLImageElement,
     *   btnText: HTMLSpanElement,
     *   sizeToggle: HTMLButtonElement,
     * }}
     */
    function createExtractButton(label) {
        let currentSizeIndex = (() => {
            const idx = SIZE_ORDER.indexOf(getStorage$1('btnSize', null));
            return idx !== -1 ? idx : 1;
        })();

        // ── Main button ──
        const btn = document.createElement('button');
        btn.style.cssText = `
        display: flex; align-items: center; gap: 8px;
        padding: 10px 16px;
        background: #1a1a1a; color: #e0e0e0;
        border: 1px solid #333; border-right: none;
        border-radius: 6px 0 0 6px;
        cursor: pointer; font-size: 13px; font-weight: 500;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        transition: background 0.2s ease, border-color 0.2s ease;
    `;
        const icon = document.createElement('img');
        icon.src = ICON.copy;
        icon.style.cssText = 'width: 18px; height: 18px;';
        const btnText = document.createElement('span');
        btnText.textContent = label;
        btn.appendChild(icon);
        btn.appendChild(btnText);
        btn.addEventListener('mouseenter', () => { btn.style.background = '#2a2a2a'; btn.style.borderColor = '#444'; });
        btn.addEventListener('mouseleave', () => { btn.style.background = '#1a1a1a'; btn.style.borderColor = '#333'; });

        // ── Size toggle ──
        const sizeToggle = document.createElement('button');
        sizeToggle.title = 'Mudar tamanho';
        sizeToggle.style.cssText = `
        display: flex; align-items: center; justify-content: center;
        padding: 0 10px;
        background: #1a1a1a;
        border: 1px solid #333;
        border-radius: 0 6px 6px 0;
        cursor: pointer; opacity: 0.9;
        transition: opacity 0.2s, background 0.2s, transform 0.15s ease;
    `;
        const sizeIconEl = document.createElement('img');
        sizeIconEl.src = ICON.resize;
        sizeIconEl.style.cssText = 'width: 14px; height: 14px; pointer-events: none;';
        sizeToggle.appendChild(sizeIconEl);
        sizeToggle.addEventListener('mouseenter', () => { sizeToggle.style.opacity = '1';   sizeToggle.style.background = '#2a2a2a'; });
        sizeToggle.addEventListener('mouseleave', () => { sizeToggle.style.opacity = '0.9'; sizeToggle.style.background = '#1a1a1a'; });
        // Prevent drag from starting when clicking the toggle
        sizeToggle.addEventListener('mousedown', e => e.stopPropagation());

        function applySize(key) {
            const s = SIZES[key];
            btn.style.padding  = s.padding;
            btn.style.fontSize = s.fontSize;
            btn.style.gap      = s.gap;
            btn.style.minWidth = s.minWidth;
            icon.style.width   = s.iconSize;
            icon.style.height  = s.iconSize;
        }
        applySize(SIZE_ORDER[currentSizeIndex]);

        let sizeChanging = false;
        sizeToggle.addEventListener('click', e => {
            e.stopPropagation();
            if (sizeChanging) return;
            sizeChanging = true;
            currentSizeIndex = (currentSizeIndex + 1) % SIZE_ORDER.length;
            const newSize = SIZE_ORDER[currentSizeIndex];
            sizeToggle.style.transform = 'scale(0.9)';
            btn.style.transition  = 'all 0.3s ease';
            icon.style.transition = 'all 0.3s ease';
            applySize(newSize);
            setStorage$1('btnSize', newSize);
            setTimeout(() => { sizeToggle.style.transform = 'scale(1)'; }, 150);
            setTimeout(() => {
                sizeChanging = false;
                btn.style.transition  = 'background 0.2s ease, border-color 0.2s ease';
                icon.style.transition = '';
            }, 400);
        });

        return { btn, icon, btnText, sizeToggle };
    }

    /**
     * Creates the filter panel DOM. Event wiring happens in pages/search.js.
     *
     * @returns {{
     *   panel: HTMLDivElement,
     *   minApprovalInput: HTMLInputElement,
     *   minReviewsInput: HTMLInputElement,
     *   applyBtn: HTMLButtonElement,
     *   clearBtn: HTMLButtonElement,
     *   status: HTMLDivElement,
     * }}
     */
    function createFilterPanel() {
        const panel = document.createElement('div');
        panel.style.cssText = `
        position: absolute;
        top: calc(100% + 6px);
        right: 0;
        background: #1a1a1a;
        border: 1px solid #333;
        border-radius: 6px;
        padding: 12px 14px;
        min-width: 260px;
        display: none;
        flex-direction: column;
        gap: 10px;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        box-shadow: 0 4px 16px rgba(0,0,0,0.5);
    `;
        // Prevent drag from starting inside the panel
        panel.addEventListener('mousedown', e => e.stopPropagation());

        const INPUT_STYLE = `
        background: #2a2a2a; color: #e0e0e0;
        border: 1px solid #444; border-radius: 4px;
        padding: 4px 8px; font-size: 12px;
        width: 68px; text-align: right; outline: none;
        font-family: inherit;
    `;

        function makeRow(labelText, inputEl, suffix = '') {
            const row = document.createElement('div');
            row.style.cssText = 'display: flex; align-items: center; justify-content: space-between; gap: 8px;';
            const label = document.createElement('span');
            label.style.cssText = 'font-size: 12px; color: #aaa; white-space: nowrap;';
            label.textContent = labelText;
            const wrap = document.createElement('div');
            wrap.style.cssText = 'display: flex; align-items: center; gap: 4px;';
            wrap.appendChild(inputEl);
            if (suffix) {
                const s = document.createElement('span');
                s.style.cssText = 'font-size: 12px; color: #666;';
                s.textContent = suffix;
                wrap.appendChild(s);
            }
            row.appendChild(label);
            row.appendChild(wrap);
            return row;
        }

        const minApprovalInput = document.createElement('input');
        minApprovalInput.type = 'number';
        minApprovalInput.min = '0';
        minApprovalInput.max = '100';
        minApprovalInput.placeholder = '—';
        minApprovalInput.style.cssText = INPUT_STYLE;

        const minReviewsInput = document.createElement('input');
        minReviewsInput.type = 'number';
        minReviewsInput.min = '0';
        minReviewsInput.placeholder = '—';
        minReviewsInput.style.cssText = INPUT_STYLE;

        const actionRow = document.createElement('div');
        actionRow.style.cssText = 'display: flex; gap: 6px;';

        const applyBtn = document.createElement('button');
        applyBtn.textContent = 'Aplicar filtro';
        applyBtn.style.cssText = `
        flex: 1; padding: 6px; background: #2563eb; color: #fff;
        border: none; border-radius: 4px; font-size: 12px; font-weight: 500;
        cursor: pointer; font-family: inherit; transition: background 0.2s;
    `;
        applyBtn.addEventListener('mouseenter', () => applyBtn.style.background = '#1d4ed8');
        applyBtn.addEventListener('mouseleave', () => applyBtn.style.background = '#2563eb');
        applyBtn.addEventListener('click', e => e.stopPropagation());

        const clearBtn = document.createElement('button');
        clearBtn.textContent = 'Limpar';
        clearBtn.style.cssText = `
        flex: 1; padding: 6px; background: #2a2a2a; color: #aaa;
        border: 1px solid #444; border-radius: 4px; font-size: 12px;
        cursor: pointer; font-family: inherit; transition: background 0.2s;
    `;
        clearBtn.addEventListener('mouseenter', () => clearBtn.style.background = '#333');
        clearBtn.addEventListener('mouseleave', () => clearBtn.style.background = '#2a2a2a');
        clearBtn.addEventListener('click', e => e.stopPropagation());

        const status = document.createElement('div');
        status.style.cssText = 'font-size: 11px; color: #555; text-align: center;';

        actionRow.appendChild(applyBtn);
        actionRow.appendChild(clearBtn);
        panel.appendChild(makeRow('Aprovação mínima',  minApprovalInput, '%'));
        panel.appendChild(makeRow('Avaliações mínimas', minReviewsInput));
        panel.appendChild(actionRow);
        panel.appendChild(status);

        return { panel, minApprovalInput, minReviewsInput, applyBtn, clearBtn, status };
    }

    /** Extracts all relevant data from the item detail page. */
    function extractSingleItem() {
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
    function extractProducts() {
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

    /** @param {object} item */
    function formatSingleItemForLLM(item) {
        let out = `# Produto Xianyu/Goofish\n\nData: ${new Date().toLocaleString('pt-BR')}\n\n---\n\n## Informações do Produto\n\n`;
        if (item.descricao)         out += `Descrição: ${item.descricao}\n`;
        if (item.preco)             out += `Preço: ${item.preco}\n`;
        if (item.atributos?.length) out += `Atributos: ${item.atributos.join(', ')}\n`;
        if (item.engajamento)       out += `Engajamento: ${item.engajamento}\n`;
        if (item.url)               out += `Link: ${item.url}\n`;
        out += `\n## Informações do Vendedor\n\n`;
        if (item.vendedor_nome) out += `Nome: ${item.vendedor_nome}\n`;
        if (item.vendedor_info) out += `Info: ${item.vendedor_info}\n`;
        return out;
    }

    /**
     * @param {object[]} products
     * @param {string} searchQuery
     * @param {{ minApproval: string|null, minReviews: string|null } | null} filterMeta
     */
    function formatForLLM(products, searchQuery, filterMeta = null) {
        if (!products?.length) return 'Nenhum produto encontrado na página.';

        const filterInfo = filterMeta
            ? ` (filtro: aprovação ≥ ${filterMeta.minApproval ?? '—'}% / avaliações ≥ ${filterMeta.minReviews ?? '—'})`
            : '';

        let out = `# Resultados Xianyu/Goofish\n\n`;
        out += `Busca: ${searchQuery}${filterInfo}\n`;
        out += `Total: ${products.length} produtos\n`;
        out += `Data: ${new Date().toLocaleString('pt-BR')}\n\n---\n\n`;

        for (const p of products) {
            out += `## Produto ${p.index}\n\n`;
            if (p.titulo)                   out += `Título: ${p.titulo}\n`;
            if (p.preco)                    out += `Preço: ¥${p.preco}\n`;
            if (p.promocao)                 out += `Promoção: ${p.promocao}\n`;
            if (p.tags?.length)             out += `Tags: ${p.tags.join(', ')}\n`;
            if (p.vendedor)                 out += `Vendedor: ${p.vendedor}\n`;
            if (p.vendedor_tag)             out += `Nível: ${p.vendedor_tag}\n`;
            if (p.aprovacao  !== undefined) out += `Aprovação: ${p.aprovacao}%\n`;
            if (p.avaliacoes !== undefined) out += `Avaliações: ${p.avaliacoes}\n`;
            if (p.url)                      out += `Link: ${p.url}\n`;
            out += '\n';
        }
        return out;
    }

    /**
     * Hides cards that do not meet the criteria.
     * Cards with no cache data pass by default (benefit of the doubt).
     *
     * @param {number | null} minApproval  Minimum approval % (0–100), or null to skip check
     * @param {number | null} minReviews   Minimum review count, or null to skip check
     * @returns {{ shown: number, total: number }}
     */
    function applyFilter(minApproval, minReviews) {
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
    function clearFilter() {
        getListContainer()
            ?.querySelectorAll(':scope > a')
            .forEach(c => { c.style.display = ''; });
    }

    function initSearchPage() {
        let filterActive    = false;
        let filterPanelOpen = false;

        // ── Structure ──
        const { el: container, onContainerClick } = createDragContainer();
        const { btn, icon, btnText, sizeToggle }  = createExtractButton('Extrair Produtos');

        const btnRow = document.createElement('div');
        btnRow.style.cssText = 'display: flex; align-items: stretch;';

        // ── Filter button ──
        const filterBtn = document.createElement('button');
        filterBtn.title = 'Filtrar por reputação';
        filterBtn.style.cssText = `
        display: flex; align-items: center; justify-content: center;
        padding: 0 10px;
        background: #1a1a1a;
        border: 1px solid #333; border-right: none;
        cursor: pointer; opacity: 0.9;
        transition: opacity 0.2s, background 0.2s;
    `;
        const filterIconEl = document.createElement('img');
        filterIconEl.src = ICON.filter;
        filterIconEl.style.cssText = 'width: 14px; height: 14px; pointer-events: none;';
        filterBtn.appendChild(filterIconEl);
        filterBtn.addEventListener('mouseenter', () => { filterBtn.style.opacity = '1';   if (!filterActive) filterBtn.style.background = '#2a2a2a'; });
        filterBtn.addEventListener('mouseleave', () => { filterBtn.style.opacity = '0.9'; if (!filterActive) filterBtn.style.background = '#1a1a1a'; });
        filterBtn.addEventListener('mousedown',  e  => e.stopPropagation());

        const { panel: filterPanel, minApprovalInput, minReviewsInput, applyBtn, clearBtn, status: filterStatus } = createFilterPanel();

        // Restaura valores salvos anteriormente
        const savedApproval = getStorage$1('filterMinApproval', '');
        const savedReviews  = getStorage$1('filterMinReviews',  '');
        if (savedApproval !== '') minApprovalInput.value = savedApproval;
        if (savedReviews  !== '') minReviewsInput.value  = savedReviews;

        // ── Assemble ──
        btnRow.appendChild(btn);
        btnRow.appendChild(filterBtn);
        btnRow.appendChild(sizeToggle);
        container.appendChild(btnRow);
        container.appendChild(filterPanel);
        document.body.appendChild(container);

        // ── Filter panel toggle ──
        filterBtn.addEventListener('click', e => {
            e.stopPropagation();
            filterPanelOpen = !filterPanelOpen;
            filterPanel.style.display = filterPanelOpen ? 'flex' : 'none';
            if (filterPanelOpen) updateFilterStatus();
        });
        document.addEventListener('click', e => {
            if (filterPanelOpen && !container.contains(e.target)) {
                filterPanelOpen = false;
                filterPanel.style.display = 'none';
            }
        });

        // ── Filter logic ──
        function updateFilterStatus() {
            if (!filterActive) {
                filterStatus.textContent = `Cache: ${reputationCache.size} itens`;
                return;
            }
            const lc = getListContainer();
            if (!lc) return;
            const cards   = lc.querySelectorAll(':scope > a');
            let   visible = 0;
            cards.forEach(c => { if (c.style.display !== 'none') visible++; });
            filterStatus.textContent = `${visible} de ${cards.length} visíveis`;
        }

        function getFilterValues() {
            return {
                minA: minApprovalInput.value !== '' ? parseInt(minApprovalInput.value) : null,
                minR: minReviewsInput.value  !== '' ? parseInt(minReviewsInput.value)  : null,
            };
        }

        function doApplyFilter() {
            const { minA, minR } = getFilterValues();
            if (minA === null && minR === null) { doClearFilter(); return; }
            filterActive = true;
            filterBtn.style.background = '#1e3a5f';
            filterBtn.title = 'Filtro ativo — clique para editar';
            setStorage$1('filterMinApproval', minApprovalInput.value);
            setStorage$1('filterMinReviews',  minReviewsInput.value);
            applyFilter(minA, minR);
            updateFilterStatus();
            updateProductCount();
        }

        function doClearFilter() {
            filterActive = false;
            filterBtn.style.background = '#1a1a1a';
            filterBtn.title = 'Filtrar por reputação';
            setStorage$1('filterMinApproval', '');
            setStorage$1('filterMinReviews',  '');
            minApprovalInput.value = '';
            minReviewsInput.value  = '';
            clearFilter();
            updateFilterStatus();
            updateProductCount();
        }

        applyBtn.addEventListener('click', doApplyFilter);
        clearBtn.addEventListener('click', doClearFilter);

        // Re-apply filter when new cards arrive via infinite scroll.
        // The 300ms delay lets the fetch interceptor populate the cache first.
        function attachObserver() {
            const lc = getListContainer();
            if (lc) {
                // Auto-apply on first load if the user had saved filter values
                if (minApprovalInput.value !== '' || minReviewsInput.value !== '') {
                    setTimeout(doApplyFilter, 300);
                }
                new MutationObserver(() => {
                    if (!filterActive) return;
                    setTimeout(doApplyFilter, 300);
                }).observe(lc, { childList: true });
            } else {
                setTimeout(attachObserver, 1000);
            }
        }
        attachObserver();

        // ── Product count label ──
        function updateProductCount() {
            const lc = getListContainer();
            if (!lc) return;
            const all = lc.querySelectorAll(':scope > a');
            let visible = 0;
            all.forEach(c => { if (c.style.display !== 'none') visible++; });
            btnText.textContent = filterActive
                ? `Extrair ${visible} de ${all.length}`
                : `Extrair ${all.length} Produtos`;
        }

        // ── Extract ──
        function handleExtract() {
            btnText.textContent = 'Extraindo...';
            btn.disabled = true;

            setTimeout(() => {
                try {
                    const products   = extractProducts();
                    const { minA, minR } = getFilterValues();
                    const filterMeta = filterActive
                        ? { minApproval: minA, minReviews: minR }
                        : null;
                    const query     = new URLSearchParams(window.location.search).get('q') || 'desconhecido';
                    const formatted = formatForLLM(products, query, filterMeta);

                    if (typeof GM_setClipboard !== 'undefined') GM_setClipboard(formatted);
                    else navigator.clipboard.writeText(formatted);

                    btnText.textContent = `${products?.length ?? 0} copiados`;
                    icon.src = ICON.check;
                    console.log('=== PRODUTOS EXTRAÍDOS ===\n', formatted);
                } catch (e) {
                    console.error('Erro na extração:', e);
                    btnText.textContent = 'Erro';
                    icon.src = ICON.alert;
                }
                setTimeout(() => {
                    btn.disabled = false;
                    icon.src = ICON.copy;
                    updateProductCount();
                }, 2000);
            }, 100);
        }

        onContainerClick(e => { if (btn.contains(e.target)) handleExtract(); });

        setInterval(updateProductCount, 2000);
        setTimeout(updateProductCount, 1000);

        console.log('Xianyu/Goofish Extractor v2.0 (busca)');
    }

    function initItemPage() {
        const { el: container, onContainerClick } = createDragContainer();
        const { btn, icon, btnText, sizeToggle }  = createExtractButton('Copiar Produto');

        const btnRow = document.createElement('div');
        btnRow.style.cssText = 'display: flex; align-items: stretch;';
        btnRow.appendChild(btn);
        btnRow.appendChild(sizeToggle);
        container.appendChild(btnRow);
        document.body.appendChild(container);

        function handleExtract() {
            btnText.textContent = 'Extraindo...';
            btn.disabled = true;

            setTimeout(() => {
                try {
                    const item      = extractSingleItem();
                    const formatted = formatSingleItemForLLM(item);

                    if (typeof GM_setClipboard !== 'undefined') GM_setClipboard(formatted);
                    else navigator.clipboard.writeText(formatted);

                    btnText.textContent = 'Copiado';
                    icon.src = ICON.check;
                    console.log('=== PRODUTO EXTRAÍDO ===\n', formatted);
                } catch (e) {
                    console.error('Erro na extração:', e);
                    btnText.textContent = 'Erro';
                    icon.src = ICON.alert;
                }
                setTimeout(() => {
                    btnText.textContent = 'Copiar Produto';
                    icon.src = ICON.copy;
                    btn.disabled = false;
                }, 2000);
            }, 100);
        }

        onContainerClick(e => { if (btn.contains(e.target)) handleExtract(); });

        console.log('Xianyu/Goofish Extractor v2.0 (item)');
    }

    // Phase 1 — runs immediately at document-start, before any page scripts.
    installInterceptor();

    // Phase 2 — init UI after DOM is ready.
    function boot() {
        const path = window.location.pathname;
        if (path.includes('/search'))   initSearchPage();
        else if (path.includes('/item')) initItemPage();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', boot);
    } else {
        boot();
    }

})();
