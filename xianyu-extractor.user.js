// ==UserScript==
// @name         Xianyu/Goofish Product Extractor for LLM
// @namespace    http://tampermonkey.net/
// @version      1.3
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
// ==/UserScript==

(function () {
    'use strict';

    // Detectar tipo de página
    const isSearchPage = window.location.pathname.includes('/search');
    const isItemPage = window.location.pathname.includes('/item');

    // Configurações de snap
    const MARGIN = 12;
    const SNAP_THRESHOLD = 60;

    function snapPosition(left, top, width, height) {
        const vw = window.innerWidth;
        const vh = window.innerHeight;

        if (left < SNAP_THRESHOLD) {
            left = MARGIN;
        } else if (left + width > vw - SNAP_THRESHOLD) {
            left = vw - width - MARGIN;
        }

        if (top < SNAP_THRESHOLD) {
            top = MARGIN;
        } else if (top + height > vh - SNAP_THRESHOLD) {
            top = vh - height - MARGIN;
        }

        left = Math.max(MARGIN, Math.min(left, vw - width - MARGIN));
        top = Math.max(MARGIN, Math.min(top, vh - height - MARGIN));

        return { left, top };
    }

    // Configurações de tamanho
    const SIZES = {
        small: { padding: '6px 10px', fontSize: '11px', iconSize: '14px', gap: '5px', minWidth: '120px' },
        medium: { padding: '10px 16px', fontSize: '13px', iconSize: '18px', gap: '8px', minWidth: '170px' },
        large: { padding: '14px 22px', fontSize: '15px', iconSize: '22px', gap: '10px', minWidth: '200px' }
    };
    const SIZE_ORDER = ['small', 'medium', 'large'];

    // Recuperar configurações salvas
    const savedPos = typeof GM_getValue !== 'undefined' ? GM_getValue('btnPos', null) : null;
    const savedSize = typeof GM_getValue !== 'undefined' ? GM_getValue('btnSize', null) : null;

    let currentSizeIndex = 1;
    if (savedSize !== null) {
        const idx = SIZE_ORDER.indexOf(savedSize);
        if (idx !== -1) currentSizeIndex = idx;
    }

    // Container
    const btnContainer = document.createElement('div');
    btnContainer.style.cssText = savedPos
        ? `position: fixed; top: ${savedPos.top}px; left: ${savedPos.left}px; z-index: 99999; cursor: grab; user-select: none; transition: left 0.15s ease, top 0.15s ease; display: flex; align-items: stretch;`
        : `position: fixed; top: 80px; right: 20px; z-index: 99999; cursor: grab; user-select: none; transition: left 0.15s ease, top 0.15s ease; display: flex; align-items: stretch;`;

    // Botão principal
    const btn = document.createElement('button');
    btn.style.cssText = `
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 10px 16px;
        background: #1a1a1a;
        color: #e0e0e0;
        border: 1px solid #333;
        border-right: none;
        border-radius: 6px 0 0 6px;
        cursor: pointer;
        font-size: 13px;
        font-weight: 500;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        transition: background 0.2s ease, border-color 0.2s ease;
    `;

    // Ícone e texto
    const icon = document.createElement('img');
    icon.src = 'https://api.iconify.design/mdi:content-copy.svg?color=%23e0e0e0';
    icon.style.cssText = 'width: 18px; height: 18px;';

    const btnText = document.createElement('span');
    btnText.textContent = isItemPage ? 'Copiar Produto' : 'Extrair Produtos';

    btn.appendChild(icon);
    btn.appendChild(btnText);

    // Toggle de tamanho
    const sizeToggle = document.createElement('button');
    sizeToggle.style.cssText = `
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 0 10px;
        background: #1a1a1a;
        border: 1px solid #333;
        border-radius: 0 6px 6px 0;
        cursor: pointer;
        opacity: 0.9;
        transition: opacity 0.2s, background 0.2s, transform 0.15s ease;
    `;

    const sizeIcon = document.createElement('img');
    sizeIcon.src = 'https://api.iconify.design/mdi:resize.svg?color=%23e0e0e0';
    sizeIcon.style.cssText = 'width: 14px; height: 14px;';
    sizeToggle.appendChild(sizeIcon);

    // Montar estrutura
    btnContainer.appendChild(btn);
    btnContainer.appendChild(sizeToggle);
    document.body.appendChild(btnContainer);

    // Aplicar tamanho
    function applySize(sizeKey) {
        const size = SIZES[sizeKey];
        btn.style.padding = size.padding;
        btn.style.fontSize = size.fontSize;
        btn.style.gap = size.gap;
        btn.style.minWidth = size.minWidth;
        icon.style.width = size.iconSize;
        icon.style.height = size.iconSize;
    }
    applySize(SIZE_ORDER[currentSizeIndex]);

    // Hover do botão principal
    btn.addEventListener('mouseenter', () => {
        btn.style.background = '#2a2a2a';
        btn.style.borderColor = '#444';
    });
    btn.addEventListener('mouseleave', () => {
        btn.style.background = '#1a1a1a';
        btn.style.borderColor = '#333';
    });

    // Hover do toggle
    sizeToggle.addEventListener('mouseenter', () => {
        sizeToggle.style.opacity = '1';
        sizeToggle.style.background = '#2a2a2a';
    });
    sizeToggle.addEventListener('mouseleave', () => {
        sizeToggle.style.opacity = '0.9';
        sizeToggle.style.background = '#1a1a1a';
    });

    // Toggle de tamanho
    let sizeChanging = false;
    sizeToggle.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();

        if (sizeChanging) return;
        sizeChanging = true;

        currentSizeIndex = (currentSizeIndex + 1) % SIZE_ORDER.length;
        const newSize = SIZE_ORDER[currentSizeIndex];

        sizeToggle.style.transform = 'scale(0.9)';
        btn.style.transition = 'all 0.3s ease';
        icon.style.transition = 'all 0.3s ease';

        applySize(newSize);

        if (typeof GM_setValue !== 'undefined') {
            GM_setValue('btnSize', newSize);
        }

        setTimeout(() => {
            sizeToggle.style.transform = 'scale(1)';
        }, 150);

        setTimeout(() => {
            sizeChanging = false;
            btn.style.transition = 'background 0.2s ease, border-color 0.2s ease';
            icon.style.transition = '';
        }, 400);
    });

    // Impedir que o toggle inicie arrasto
    sizeToggle.addEventListener('mousedown', (e) => {
        e.stopPropagation();
    });

    // Arrastar
    let isDragging = false;
    let hasDragged = false;
    let startX, startY, startLeft, startTop;

    btnContainer.addEventListener('mousedown', (e) => {
        if (sizeToggle.contains(e.target)) return;

        isDragging = true;
        hasDragged = false;
        btnContainer.style.cursor = 'grabbing';
        startX = e.clientX;
        startY = e.clientY;
        const rect = btnContainer.getBoundingClientRect();
        startLeft = rect.left;
        startTop = rect.top;
        e.preventDefault();
    });

    document.addEventListener('mousemove', (e) => {
        if (!isDragging) return;

        const dx = e.clientX - startX;
        const dy = e.clientY - startY;

        if (Math.abs(dx) > 3 || Math.abs(dy) > 3) {
            hasDragged = true;
        }

        btnContainer.style.transition = 'none';
        btnContainer.style.left = (startLeft + dx) + 'px';
        btnContainer.style.top = (startTop + dy) + 'px';
        btnContainer.style.right = 'auto';
    });

    document.addEventListener('mouseup', (e) => {
        if (!isDragging) return;

        isDragging = false;
        btnContainer.style.cursor = 'grab';
        btnContainer.style.transition = 'left 0.15s ease, top 0.15s ease';

        // Snap para borda
        const rect = btnContainer.getBoundingClientRect();
        const snapped = snapPosition(rect.left, rect.top, rect.width, rect.height);
        btnContainer.style.left = snapped.left + 'px';
        btnContainer.style.top = snapped.top + 'px';

        if (typeof GM_setValue !== 'undefined') {
            GM_setValue('btnPos', { top: snapped.top, left: snapped.left });
        }

        // Se não arrastou, é um clique
        if (!hasDragged && btn.contains(e.target)) {
            handleExtract();
        }
    });

    // Funções de extração
    function safeText(element) {
        if (!element) return null;
        return element.textContent?.trim() || null;
    }

    function safeTextAll(elements) {
        if (!elements || elements.length === 0) return [];
        return Array.from(elements)
            .map(el => el.textContent?.trim())
            .filter(text => text && text.length > 0);
    }

    function extractSingleItem() {
        const item = { url: window.location.href };

        const sellerNameEl = document.querySelector('.item-user-info-nick--rtpDhkmQ');
        item.vendedor_nome = safeText(sellerNameEl);

        const sellerInfoContainer = document.querySelector('.item-user-info-intro--ZN1A0_8Y');
        if (sellerInfoContainer) {
            const infoLabels = sellerInfoContainer.querySelectorAll('.item-user-info-label--NLTMHARN');
            const infos = safeTextAll(infoLabels);
            if (infos.length > 0) item.vendedor_info = infos.join(', ');
        }

        const priceEl = document.querySelector('.price--OEWLbcxC');
        item.preco = safeText(priceEl);

        const titleContainer = document.querySelector('.main--Nu33bWl6');
        if (titleContainer) {
            const descEl = titleContainer.querySelector('.desc--GaIUKUQY');
            if (descEl) {
                const clone = descEl.cloneNode(true);
                clone.querySelectorAll('br').forEach(br => br.replaceWith(' | '));
                let text = clone.textContent?.trim() || '';
                text = text.replace(/\s*\|\s*\|\s*/g, ' | ').replace(/\s*\|\s*$/, '').trim();
                item.descricao = text;
            }
        }

        const labelsContainer = document.querySelector('.labels--ndhPFgp8');
        if (labelsContainer) {
            const labelItems = labelsContainer.querySelectorAll('.item--qI9ENIfp');
            const attributes = [];
            labelItems.forEach(labelItem => {
                const labelEl = labelItem.querySelector('.label--ejJeaTRV');
                const valueEl = labelItem.querySelector('.value--EyQBSInp');
                if (labelEl && valueEl) {
                    const label = safeText(labelEl);
                    const value = safeText(valueEl);
                    if (label && value) attributes.push(`${label}: ${value}`);
                }
            });
            if (attributes.length > 0) item.atributos = attributes;
        }

        const wantEl = document.querySelector('.want--ecByv3Sr');
        if (wantEl) {
            const wantText = safeText(wantEl);
            if (wantText) item.engajamento = wantText;
        }

        return item;
    }

    function formatSingleItemForLLM(item) {
        let output = `# Produto Xianyu/Goofish\n\n`;
        output += `Data: ${new Date().toLocaleString('pt-BR')}\n\n`;
        output += `---\n\n`;
        output += `## Informações do Produto\n\n`;
        if (item.descricao) output += `Descrição: ${item.descricao}\n`;
        if (item.preco) output += `Preço: ${item.preco}\n`;
        if (item.atributos && item.atributos.length > 0) output += `Atributos: ${item.atributos.join(', ')}\n`;
        if (item.engajamento) output += `Engajamento: ${item.engajamento}\n`;
        if (item.url) output += `Link: ${item.url}\n`;
        output += `\n## Informações do Vendedor\n\n`;
        if (item.vendedor_nome) output += `Nome: ${item.vendedor_nome}\n`;
        if (item.vendedor_info) output += `Info: ${item.vendedor_info}\n`;
        return output;
    }

    function extractProducts() {
        const products = [];
        const listContainer = document.querySelector('.feeds-list-container--UkIMBPNk');

        if (!listContainer) {
            alert('Container de produtos não encontrado.');
            return null;
        }

        const productLinks = listContainer.querySelectorAll(':scope > a');

        productLinks.forEach((productEl, index) => {
            try {
                const product = { index: index + 1, url: productEl.href || null };

                const titleSpan = productEl.querySelector('.main-title--sMrtWSJa');
                if (titleSpan) {
                    const titleClone = titleSpan.cloneNode(true);
                    titleClone.querySelectorAll('img').forEach(img => img.remove());
                    product.titulo = titleClone.textContent?.trim() || null;
                }

                const row2 = productEl.querySelector('.row2-wrap-cpv--_dKW4c6D');
                if (row2) {
                    const tagSpans = row2.querySelectorAll('div > span');
                    const tags = safeTextAll(tagSpans);
                    if (tags.length > 0) product.tags = tags;
                }

                const priceEl = productEl.querySelector('.number--NKh1vXWM');
                product.preco = safeText(priceEl);

                const promoDiv = productEl.querySelector('.price-desc--hxYyq3i3');
                if (promoDiv) {
                    const promoText = safeText(promoDiv);
                    if (promoText) product.promocao = promoText;
                }

                const sellerEl = productEl.querySelector('.seller-text--Rr2Y3EbB');
                product.vendedor = safeText(sellerEl);

                const sellerTagEl = productEl.querySelector('.credit-container--w3dcSvoi span');
                const sellerTag = safeText(sellerTagEl);
                if (sellerTag) product.vendedor_tag = sellerTag;

                if (product.titulo || product.preco) products.push(product);
            } catch (e) {
                console.error(`Erro ao extrair produto ${index + 1}:`, e);
            }
        });

        return products;
    }

    function formatForLLM(products, searchQuery) {
        if (!products || products.length === 0) return "Nenhum produto encontrado na página.";

        let output = `# Resultados Xianyu/Goofish\n\n`;
        output += `Busca: ${searchQuery}\n`;
        output += `Total: ${products.length} produtos\n`;
        output += `Data: ${new Date().toLocaleString('pt-BR')}\n\n`;
        output += `---\n\n`;

        products.forEach(p => {
            output += `## Produto ${p.index}\n\n`;
            if (p.titulo) output += `Título: ${p.titulo}\n`;
            if (p.preco) output += `Preço: ¥${p.preco}\n`;
            if (p.promocao) output += `Promoção: ${p.promocao}\n`;
            if (p.tags && p.tags.length > 0) output += `Tags: ${p.tags.join(', ')}\n`;
            if (p.vendedor) output += `Vendedor: ${p.vendedor}\n`;
            if (p.vendedor_tag) output += `Reputação: ${p.vendedor_tag}\n`;
            if (p.url) output += `Link: ${p.url}\n`;
            output += `\n`;
        });

        return output;
    }

    function getSearchQuery() {
        const urlParams = new URLSearchParams(window.location.search);
        return urlParams.get('q') || 'desconhecido';
    }

    function handleExtract() {
        btnText.textContent = 'Extraindo...';
        btn.disabled = true;

        setTimeout(() => {
            try {
                let formatted, count;

                if (isItemPage) {
                    const item = extractSingleItem();
                    formatted = formatSingleItemForLLM(item);
                    count = 1;
                } else {
                    const products = extractProducts();
                    const searchQuery = getSearchQuery();
                    formatted = formatForLLM(products, searchQuery);
                    count = products.length;
                }

                if (typeof GM_setClipboard !== 'undefined') {
                    GM_setClipboard(formatted);
                } else {
                    navigator.clipboard.writeText(formatted);
                }

                btnText.textContent = isItemPage ? 'Copiado' : `${count} copiados`;
                icon.src = 'https://api.iconify.design/mdi:check.svg?color=%2322c55e';

                console.log('=== PRODUTO(S) EXTRAÍDO(S) ===');
                console.log(formatted);

            } catch (e) {
                console.error('Erro na extração:', e);
                btnText.textContent = 'Erro';
                icon.src = 'https://api.iconify.design/mdi:alert-circle.svg?color=%23ef4444';
            }

            setTimeout(() => {
                btnText.textContent = isItemPage ? 'Copiar Produto' : 'Extrair Produtos';
                icon.src = 'https://api.iconify.design/mdi:content-copy.svg?color=%23e0e0e0';
                btn.disabled = false;
                if (!isItemPage) updateProductCount();
            }, 2000);
        }, 100);
    }

    function updateProductCount() {
        const listContainer = document.querySelector('.feeds-list-container--UkIMBPNk');
        if (listContainer) {
            const count = listContainer.querySelectorAll(':scope > a').length;
            btnText.textContent = `Extrair ${count} Produtos`;
        }
    }

    if (isSearchPage) {
        setInterval(updateProductCount, 2000);
        setTimeout(updateProductCount, 1000);
    }

    window.addEventListener('resize', () => {
        const rect = btnContainer.getBoundingClientRect();
        const snapped = snapPosition(rect.left, rect.top, rect.width, rect.height);
        btnContainer.style.left = snapped.left + 'px';
        btnContainer.style.top = snapped.top + 'px';
    });

    console.log(`Xianyu/Goofish Extractor carregado (${isItemPage ? 'página de item' : 'página de busca'})`);
})();
