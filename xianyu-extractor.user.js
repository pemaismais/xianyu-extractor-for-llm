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

    const MARGIN = 12;
    const SNAP_THRESHOLD = 60;

    const SIZES = {
        medium: { scale: '1' },
        large:  { scale: '1.25' },
    };
    const SIZE_ORDER = ['medium', 'large'];

    const ICON = {
        copy: 'https://api.iconify.design/mdi:content-copy.svg?color=%2318181b', // Preto para círculo branco
        check: 'https://api.iconify.design/mdi:check.svg?color=%2322c55e',
        alert: 'https://api.iconify.design/mdi:alert-circle.svg?color=%23ef4444',
        resize: 'https://api.iconify.design/heroicons:arrows-pointing-out.svg?color=%23a1a1aa', // Cinza claro
        filter: 'https://api.iconify.design/heroicons-outline:filter.svg?color=%23facc15', // Amarelo
    };

    const SELECTORS = {
        listContainer: '.feeds-list-container--UkIMBPNk',
        // item page
        sellerName: '.item-user-info-nick--rtpDhkmQ',
        sellerInfo: '.item-user-info-intro--ZN1A0_8Y',
        sellerLabel: '.item-user-info-label--NLTMHARN',
        price: '.price--OEWLbcxC',
        mainContainer: '.main--Nu33bWl6',
        desc: '.desc--GaIUKUQY',
        labels: '.labels--ndhPFgp8',
        labelItem: '.item--qI9ENIfp',
        labelKey: '.label--ejJeaTRV',
        labelValue: '.value--EyQBSInp',
        want: '.want--ecByv3Sr',
        // search cards
        cardTitle: '.main-title--sMrtWSJa',
        cardRow2: '.row2-wrap-cpv--_dKW4c6D',
        cardPrice: '.number--NKh1vXWM',
        cardPromo: '.price-desc--hxYyq3i3',
        cardSeller: '.seller-text--Rr2Y3EbB',
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
    const getStorage = (key, fallback = null) =>
        typeof GM_getValue !== 'undefined' ? GM_getValue(key, fallback) : fallback;

    /** @param {string} key @param {*} value */
    const setStorage = (key, value) => {
        if (typeof GM_setValue !== 'undefined') GM_setValue(key, value);
    };

    /**
     * Creates the fixed draggable wrapper that holds all button UI.
     * Children that call e.stopPropagation() on mousedown will suppress drag.
     *
     * @returns {{ el: HTMLDivElement, onContainerClick: (cb: (e: MouseEvent) => void) => void }}
     */
    function createDragContainer() {
        const savedPos = getStorage('btnPos', null);

        const el = document.createElement('div');
        const baseStyle = `
        position: fixed; z-index: 99999; cursor: grab; user-select: none;
        transition: left 0.15s ease, top 0.15s ease;
        background: #18181b; border: 1px solid #27272a;
        border-radius: 16px; padding: 16px; min-width: 320px;
        display: flex; flex-direction: column; gap: 16px;
        box-shadow: 0 10px 25px rgba(0,0,0,0.5); font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    `;
        el.style.cssText = savedPos
            ? `${baseStyle} top: ${savedPos.top}px; left: ${savedPos.left}px;`
            : `${baseStyle} top: 80px; right: 20px;`;

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
            setStorage('btnPos', snapped);
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
    function createExtractButton(label, container) {
        let currentSizeIndex = (() => {
            const idx = SIZE_ORDER.indexOf(getStorage('btnSize', null));
            return idx !== -1 ? idx : 0;
        })();

        // ── Main button ──
        const btn = document.createElement('button');
        btn.style.cssText = `
        display: flex; align-items: center; justify-content: center;
        background: #09090b; color: #f4f4f5;
        border: 1px solid #27272a;
        border-radius: 9999px;
        cursor: pointer; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
        transition: background 0.2s ease, border-color 0.2s ease;
        padding: 10px 20px; font-size: 15px; font-weight: bold; gap: 10px; min-width: 180px;
    `;
        const iconWrap = document.createElement('div');
        iconWrap.style.cssText = 'display: flex; align-items: center; justify-content: center; background: white; border-radius: 50%; width: 28px; height: 28px;';
        const icon = document.createElement('img');
        icon.src = ICON.copy;
        icon.style.cssText = 'width: 16px; height: 16px;';
        iconWrap.appendChild(icon);

        const btnText = document.createElement('span');
        btnText.textContent = label;
        btn.appendChild(iconWrap);
        btn.appendChild(btnText);
        btn.addEventListener('mouseenter', () => { btn.style.background = '#18181b'; btn.style.borderColor = '#3f3f46'; });
        btn.addEventListener('mouseleave', () => { btn.style.background = '#09090b'; btn.style.borderColor = '#27272a'; });

        // ── Size toggle ──
        const sizeToggle = document.createElement('button');
        sizeToggle.title = 'Mudar tamanho';
        sizeToggle.style.cssText = `
        display: flex; align-items: center; justify-content: center;
        padding: 0 15px; height: 100%;
        background: transparent;
        border: none;
        border-left: 1px solid #27272a;
        cursor: pointer; opacity: 0.8;
        transition: opacity 0.2s, background 0.2s, transform 0.15s ease;
    `;
        const sizeIconEl = document.createElement('img');
        sizeIconEl.src = ICON.resize;
        sizeIconEl.style.cssText = 'width: 20px; height: 20px; pointer-events: none;';
        sizeToggle.appendChild(sizeIconEl);
        sizeToggle.addEventListener('mouseenter', () => { sizeToggle.style.opacity = '1'; });
        sizeToggle.addEventListener('mouseleave', () => { sizeToggle.style.opacity = '0.8'; });
        // Prevent drag from starting when clicking the toggle
        sizeToggle.addEventListener('mousedown', e => e.stopPropagation());

        function applySize(key) {
            const s = SIZES[key];
            if (container) {
                container.style.transform = `scale(${s.scale})`;
                container.style.transformOrigin = 'top right';
            }
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
            btn.style.transition = 'all 0.3s ease';
            icon.style.transition = 'all 0.3s ease';
            applySize(newSize);
            setStorage('btnSize', newSize);
            setTimeout(() => { sizeToggle.style.transform = 'scale(1)'; }, 150);
            setTimeout(() => {
                sizeChanging = false;
                btn.style.transition = 'background 0.2s ease, border-color 0.2s ease';
                icon.style.transition = '';
            }, 400);
        });

        return { btn, icon, btnText, sizeToggle };
    }

    function createFilterPanel() {
        const wrapper = document.createElement('div');
        wrapper.style.cssText = `
        display: none;
        flex-direction: column;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    `;
        wrapper.addEventListener('mousedown', e => e.stopPropagation());

        const separator1 = document.createElement('div');
        separator1.style.cssText = 'height: 1px; background: #27272a; width: 100%; margin-bottom: 16px;';
        wrapper.appendChild(separator1);

        const inputsRow = document.createElement('div');
        inputsRow.style.cssText = 'display: flex; gap: 16px; margin-bottom: 16px;';

        const INPUT_STYLE = `
        background: #09090b; color: #f4f4f5;
        border: 1px solid #27272a; border-radius: 8px;
        padding: 12px; font-size: 14px;
        width: 100%; outline: none; font-weight: 500; box-sizing: border-box;
        font-family: inherit; transition: border-color 0.2s;
    `;
        const LABEL_STYLE = `
        display: block; font-size: 13px; color: #a1a1aa; font-weight: 500; margin-bottom: 8px;
    `;

        function makeCol(labelText, inputEl, suffix = '') {
            const col = document.createElement('div');
            col.style.cssText = 'flex: 1; display: flex; flex-direction: column;';
            const label = document.createElement('label');
            label.style.cssText = LABEL_STYLE;
            label.textContent = labelText;
            col.appendChild(label);

            if (suffix) {
                const wrap = document.createElement('div');
                wrap.style.cssText = 'position: relative; width: 100%;';
                inputEl.style.paddingRight = '28px';
                wrap.appendChild(inputEl);
                const s = document.createElement('span');
                s.style.cssText = 'position: absolute; right: 12px; top: 50%; transform: translateY(-50%); color: #52525b; font-size: 14px; font-weight: 500; pointer-events: none;';
                s.textContent = suffix;
                wrap.appendChild(s);
                col.appendChild(wrap);
            } else {
                col.appendChild(inputEl);
            }
            return col;
        }

        const styleOverrides = document.createElement('style');
        styleOverrides.textContent = `
        .xyu-no-spin::-webkit-outer-spin-button,
        .xyu-no-spin::-webkit-inner-spin-button {
            -webkit-appearance: none;
            margin: 0;
        }
        .xyu-no-spin[type="number"] {
            -moz-appearance: textfield;
        }
    `;
        wrapper.appendChild(styleOverrides);

        const minApprovalInput = document.createElement('input');
        minApprovalInput.className = 'xyu-no-spin';
        minApprovalInput.type = 'number'; minApprovalInput.min = '0'; minApprovalInput.max = '100';
        minApprovalInput.placeholder = '—'; minApprovalInput.style.cssText = INPUT_STYLE;
        minApprovalInput.addEventListener('focus', () => minApprovalInput.style.borderColor = '#52525b');
        minApprovalInput.addEventListener('blur', () => minApprovalInput.style.borderColor = '#27272a');

        const minReviewsInput = document.createElement('input');
        minReviewsInput.className = 'xyu-no-spin';
        minReviewsInput.type = 'number'; minReviewsInput.min = '0';
        minReviewsInput.placeholder = '—'; minReviewsInput.style.cssText = INPUT_STYLE;
        minReviewsInput.addEventListener('focus', () => minReviewsInput.style.borderColor = '#52525b');
        minReviewsInput.addEventListener('blur', () => minReviewsInput.style.borderColor = '#27272a');

        inputsRow.appendChild(makeCol('Aprovação mínima', minApprovalInput, '%'));
        inputsRow.appendChild(makeCol('Avaliações mínimas', minReviewsInput));
        wrapper.appendChild(inputsRow);

        const separator2 = document.createElement('div');
        separator2.style.cssText = 'height: 1px; background: #27272a; width: calc(100% + 32px); margin-left: -16px; margin-bottom: 16px;';
        wrapper.appendChild(separator2);

        const actionRow = document.createElement('div');
        actionRow.style.cssText = 'display: flex; align-items: center; justify-content: space-between; gap: 16px;';

        const statusWrap = document.createElement('div');
        statusWrap.style.cssText = 'display: flex; align-items: center; gap: 8px; flex: 1;';
        const statusDot = document.createElement('div');
        statusDot.style.cssText = 'width: 6px; height: 6px; border-radius: 50%; background: #3f3f46; transition: background 0.2s, box-shadow 0.2s;';
        const status = document.createElement('div');
        status.style.cssText = 'font-size: 13px; color: #a1a1aa; font-weight: 500;';
        statusWrap.appendChild(statusDot);
        statusWrap.appendChild(status);

        const rightActions = document.createElement('div');
        rightActions.style.cssText = 'display: flex; align-items: center; gap: 16px;';

        const clearBtn = document.createElement('button');
        clearBtn.textContent = 'Limpar';
        clearBtn.style.cssText = `
        background: transparent; color: #a1a1aa; border: none; font-size: 14px; font-weight: 600; cursor: pointer; padding: 0; transition: color 0.2s;
    `;
        clearBtn.addEventListener('mouseenter', () => clearBtn.style.color = '#f4f4f5');
        clearBtn.addEventListener('mouseleave', () => clearBtn.style.color = '#a1a1aa');

        const applyBtn = document.createElement('button');
        applyBtn.textContent = 'Aplicar filtro';
        applyBtn.style.cssText = `
        background: #facc15; color: #18181b; border: none; border-radius: 8px; font-size: 14px; font-weight: 600; cursor: pointer; padding: 10px 16px; transition: background 0.2s;
    `;
        applyBtn.addEventListener('mouseenter', () => applyBtn.style.background = '#eab308');
        applyBtn.addEventListener('mouseleave', () => applyBtn.style.background = '#facc15');

        minApprovalInput.addEventListener('keydown', e => { if (e.key === 'Enter') applyBtn.click(); });
        minReviewsInput.addEventListener('keydown', e => { if (e.key === 'Enter') applyBtn.click(); });

        rightActions.appendChild(clearBtn);
        rightActions.appendChild(applyBtn);
        actionRow.appendChild(statusWrap);
        actionRow.appendChild(rightActions);
        wrapper.appendChild(actionRow);

        return { panel: wrapper, minApprovalInput, minReviewsInput, applyBtn, clearBtn, status, statusDot };
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
        let filterActive = false;
        let filterPanelOpen = false;

        // ── Structure ──
        const { el: container, onContainerClick } = createDragContainer();
        const { btn, icon, btnText, sizeToggle } = createExtractButton('Extrair Produtos', container);

        const btnRow = document.createElement('div');
        btnRow.style.cssText = 'display: flex; justify-content: space-between; align-items: stretch; gap: 12px;';

        const rightPill = document.createElement('div');
        rightPill.style.cssText = 'display: flex; align-items: stretch; background: #09090b; border: 1px solid #27272a; border-radius: 9999px; overflow: hidden; margin: 2px;';

        // ── Filter button ──
        const filterBtn = document.createElement('button');
        filterBtn.title = 'Filtrar por reputação';
        filterBtn.style.cssText = `
        display: flex; align-items: center; justify-content: center;
        padding: 0 15px; height: 100%;
        background: transparent;
        border: none;
        cursor: pointer; opacity: 0.8;
        transition: opacity 0.2s, background 0.2s;
    `;
        const filterIconEl = document.createElement('img');
        filterIconEl.src = ICON.filter;
        filterIconEl.style.cssText = 'width: 20px; height: 20px; pointer-events: none; filter: grayscale(1) brightness(2); transition: all 0.2s;';
        filterBtn.appendChild(filterIconEl);
        filterBtn.addEventListener('mouseenter', () => { filterBtn.style.opacity = '1'; });
        filterBtn.addEventListener('mouseleave', () => { filterBtn.style.opacity = '0.8'; });
        filterBtn.addEventListener('mousedown', e => e.stopPropagation());

        const { panel: filterPanel, minApprovalInput, minReviewsInput, applyBtn, clearBtn, status: filterStatus, statusDot } = createFilterPanel();

        // Restaura valores salvos anteriormente
        const savedApproval = getStorage('filterMinApproval', '');
        const savedReviews = getStorage('filterMinReviews', '');
        if (savedApproval !== '') minApprovalInput.value = savedApproval;
        if (savedReviews !== '') minReviewsInput.value = savedReviews;

        // ── Assemble ──
        rightPill.appendChild(filterBtn);
        rightPill.appendChild(sizeToggle);
        btnRow.appendChild(btn);
        btnRow.appendChild(rightPill);
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
            const cards = lc.querySelectorAll(':scope > a');
            let visible = 0;
            cards.forEach(c => { if (c.style.display !== 'none') visible++; });
            filterStatus.textContent = `${visible} de ${cards.length} visíveis`;
        }

        function getFilterValues() {
            return {
                minA: minApprovalInput.value !== '' ? parseInt(minApprovalInput.value) : null,
                minR: minReviewsInput.value !== '' ? parseInt(minReviewsInput.value) : null,
            };
        }

        function doApplyFilter() {
            const { minA, minR } = getFilterValues();
            if (minA === null && minR === null) { doClearFilter(); return; }
            filterActive = true;
            filterBtn.style.background = 'rgba(250, 204, 21, 0.1)';
            filterIconEl.style.filter = 'none';
            statusDot.style.background = '#facc15';
            statusDot.style.boxShadow = '0 0 8px #facc15';
            filterBtn.title = 'Filtro ativo — clique para editar';
            setStorage('filterMinApproval', minApprovalInput.value);
            setStorage('filterMinReviews', minReviewsInput.value);
            applyFilter(minA, minR);
            updateFilterStatus();
            updateProductCount();
        }

        function doClearFilter() {
            filterActive = false;
            filterBtn.style.background = 'transparent';
            filterIconEl.style.filter = 'grayscale(1) brightness(2)';
            statusDot.style.background = '#3f3f46';
            statusDot.style.boxShadow = 'none';
            filterBtn.title = 'Filtrar por reputação';
            setStorage('filterMinApproval', '');
            setStorage('filterMinReviews', '');
            minApprovalInput.value = '';
            minReviewsInput.value = '';
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
                    const products = extractProducts();
                    const { minA, minR } = getFilterValues();
                    const filterMeta = filterActive
                        ? { minApproval: minA, minReviews: minR }
                        : null;
                    const query = new URLSearchParams(window.location.search).get('q') || 'desconhecido';
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
        const { btn, icon, btnText, sizeToggle } = createExtractButton('Copiar Produto', container);

        const btnRow = document.createElement('div');
        btnRow.style.cssText = 'display: flex; justify-content: space-between; align-items: stretch; gap: 12px;';
        btnRow.appendChild(btn);

        const rightPill = document.createElement('div');
        rightPill.style.cssText = 'display: flex; align-items: stretch; background: #09090b; border: 1px solid #27272a; border-radius: 9999px; overflow: hidden; margin: 2px;';
        
        sizeToggle.style.borderLeft = 'none'; // remove border as it is the only element in the pill
        rightPill.appendChild(sizeToggle);
        
        btnRow.appendChild(rightPill);
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
