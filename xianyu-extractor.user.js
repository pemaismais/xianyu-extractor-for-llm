// ==UserScript==
// @name         Xianyu/Goofish Product Extractor for LLM
// @namespace    http://tampermonkey.net/
// @version      1.2
// @description  Extrai produtos da busca e páginas individuais do Goofish formatado para análise com LLM
// @author       https://github.com/pemaismais
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

    // Configurações de snap
    const MARGIN = 12;
    const SNAP_THRESHOLD = 60;

    // Função para snap nos cantos/bordas
    function snapPosition(left, top, width, height) {
        const vw = window.innerWidth;
        const vh = window.innerHeight;

        // Snap horizontal
        if (left < SNAP_THRESHOLD) {
            left = MARGIN;
        } else if (left + width > vw - SNAP_THRESHOLD) {
            left = vw - width - MARGIN;
        }

        // Snap vertical
        if (top < SNAP_THRESHOLD) {
            top = MARGIN;
        } else if (top + height > vh - SNAP_THRESHOLD) {
            top = vh - height - MARGIN;
        }

        // Garantir que não saia da tela
        left = Math.max(MARGIN, Math.min(left, vw - width - MARGIN));
        top = Math.max(MARGIN, Math.min(top, vh - height - MARGIN));

        return { left, top };
    }

    // Recuperar posição salva
    const savedPos = typeof GM_getValue !== 'undefined'
        ? GM_getValue('btnPos', null)
        : null;

    const btnContainer = document.createElement('div');
    btnContainer.style.cssText = savedPos
        ? `position: fixed; top: ${savedPos.top}px; left: ${savedPos.left}px; z-index: 99999; cursor: grab; user-select: none; transition: left 0.15s ease, top 0.15s ease;`
        : `position: fixed; top: 80px; right: 20px; z-index: 99999; cursor: grab; user-select: none; transition: left 0.15s ease, top 0.15s ease;`;

    const btn = document.createElement('button');
    btn.style.cssText = `
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 10px 16px;
        background: #1a1a1a;
        color: #e0e0e0;
        border: 1px solid #333;
        border-radius: 6px;
        cursor: pointer;
        font-size: 13px;
        font-weight: 500;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        transition: background 0.2s ease, border-color 0.2s ease;
    `;

    // Detectar tipo de página
    const isSearchPage = window.location.pathname.includes('/search');
    const isItemPage = window.location.pathname.includes('/item');

    const icon = document.createElement('img');
    icon.src = 'https://api.iconify.design/mdi:content-copy.svg?color=%23e0e0e0';
    icon.style.cssText = 'width: 18px; height: 18px;';

    const btnText = document.createElement('span');
    btnText.textContent = isItemPage ? 'Copiar Produto' : 'Extrair Produtos';

    btn.appendChild(icon);
    btn.appendChild(btnText);
    btnContainer.appendChild(btn);
    document.body.appendChild(btnContainer);

    btn.addEventListener('mouseenter', () => {
        btn.style.background = '#2a2a2a';
        btn.style.borderColor = '#444';
    });
    btn.addEventListener('mouseleave', () => {
        btn.style.background = '#1a1a1a';
        btn.style.borderColor = '#333';
    });

    // Arrastar
    let isDragging = false;
    let startX, startY, startLeft, startTop;

    btnContainer.addEventListener('mousedown', (e) => {
        if (e.target === btn || btn.contains(e.target)) {
            isDragging = true;
            btnContainer.style.cursor = 'grabbing';
            startX = e.clientX;
            startY = e.clientY;
            const rect = btnContainer.getBoundingClientRect();
            startLeft = rect.left;
            startTop = rect.top;
            e.preventDefault();
        }
    });
    document.addEventListener('mousemove', (e) => {
        if (!isDragging) return;
        btnContainer.style.transition = 'none'; // Desativa transição durante arrasto
        const dx = e.clientX - startX;
        const dy = e.clientY - startY;
        btnContainer.style.left = (startLeft + dx) + 'px';
        btnContainer.style.top = (startTop + dy) + 'px';
        btnContainer.style.right = 'auto';
    });

    document.addEventListener('mouseup', () => {
        if (isDragging) {
            isDragging = false;
            btnContainer.style.cursor = 'grab';

            // Snap para borda mais próxima
            const rect = btnContainer.getBoundingClientRect();
            const snapped = snapPosition(rect.left, rect.top, rect.width, rect.height);

            btnContainer.style.left = snapped.left + 'px';
            btnContainer.style.top = snapped.top + 'px';

            // Salvar posição
            if (typeof GM_setValue !== 'undefined') {
                GM_setValue('btnPos', { top: snapped.top, left: snapped.left });
            }
        }
    });

    // Detectar clique vs arrasto
    let clickStart = 0;
    let clickPos = { x: 0, y: 0 };

    btn.addEventListener('mousedown', (e) => {
        clickStart = Date.now();
        clickPos = { x: e.clientX, y: e.clientY };
    });

    btn.addEventListener('mouseup', (e) => {
        const elapsed = Date.now() - clickStart;
        const moved = Math.abs(e.clientX - clickPos.x) + Math.abs(e.clientY - clickPos.y);
        if (elapsed < 200 && moved < 5) {
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

    // Extração de página de item individual
    function extractSingleItem() {
        const item = {
            url: window.location.href
        };

        // Nome do vendedor
        const sellerNameEl = document.querySelector('.item-user-info-nick--rtpDhkmQ');
        item.vendedor_nome = safeText(sellerNameEl);

        // Informações do vendedor (localização, tempo, vendas, etc)
        const sellerInfoContainer = document.querySelector('.item-user-info-intro--ZN1A0_8Y');
        if (sellerInfoContainer) {
            const infoLabels = sellerInfoContainer.querySelectorAll('.item-user-info-label--NLTMHARN');
            const infos = safeTextAll(infoLabels);
            if (infos.length > 0) {
                item.vendedor_info = infos.join(', ');
            }
        }

        // Preço
        const priceEl = document.querySelector('.price--OEWLbcxC');
        item.preco = safeText(priceEl);

        // Título/Descrição do produto
        const titleContainer = document.querySelector('.main--Nu33bWl6');
        if (titleContainer) {
            // Pega todo o texto, substitui <br> por quebras de linha
            const descEl = titleContainer.querySelector('.desc--GaIUKUQY');
            if (descEl) {
                // Clona para manipular
                const clone = descEl.cloneNode(true);
                // Substitui br por marcador
                clone.querySelectorAll('br').forEach(br => {
                    br.replaceWith(' | ');
                });
                let text = clone.textContent?.trim() || '';
                // Remove pipes duplicados e no final
                text = text.replace(/\s*\|\s*\|\s*/g, ' | ').replace(/\s*\|\s*$/, '').trim();
                item.descricao = text;
            }
        }

        // Tags/Atributos do produto
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
                    if (label && value) {
                        attributes.push(`${label}: ${value}`);
                    }
                }
            });
            if (attributes.length > 0) {
                item.atributos = attributes;
            }
        }

        // Visualizações e interessados
        const wantEl = document.querySelector('.want--ecByv3Sr');
        if (wantEl) {
            const wantText = safeText(wantEl);
            if (wantText) {
                item.engajamento = wantText;
            }
        }

        return item;
    }

    // Formatar item individual para LLM
    function formatSingleItemForLLM(item) {
        let output = `# Produto Xianyu/Goofish\n\n`;
        output += `Data: ${new Date().toLocaleString('pt-BR')}\n\n`;
        output += `---\n\n`;

        output += `## Informações do Produto\n\n`;
        if (item.descricao) output += `Descrição: ${item.descricao}\n`;
        if (item.preco) output += `Preço: ${item.preco}\n`;
        if (item.atributos && item.atributos.length > 0) {
            output += `Atributos: ${item.atributos.join(', ')}\n`;
        }
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
                const product = {
                    index: index + 1,
                    url: productEl.href || null
                };

                // Título
                const titleSpan = productEl.querySelector('.main-title--sMrtWSJa');
                if (titleSpan) {
                    const titleClone = titleSpan.cloneNode(true);
                    titleClone.querySelectorAll('img').forEach(img => img.remove());
                    product.titulo = titleClone.textContent?.trim() || null;
                }

                // Tags
                const row2 = productEl.querySelector('.row2-wrap-cpv--_dKW4c6D');
                if (row2) {
                    const tagSpans = row2.querySelectorAll('div > span');
                    const tags = safeTextAll(tagSpans);
                    if (tags.length > 0) {
                        product.tags = tags;
                    }
                }

                // Preço
                const priceEl = productEl.querySelector('.number--NKh1vXWM');
                product.preco = safeText(priceEl);

                // Promoção
                const promoDiv = productEl.querySelector('.price-desc--hxYyq3i3');
                if (promoDiv) {
                    const promoText = safeText(promoDiv);
                    if (promoText) {
                        product.promocao = promoText;
                    }
                }

                // Vendedor
                const sellerEl = productEl.querySelector('.seller-text--Rr2Y3EbB');
                product.vendedor = safeText(sellerEl);

                // Tag do vendedor
                const sellerTagEl = productEl.querySelector('.credit-container--w3dcSvoi span');
                const sellerTag = safeText(sellerTagEl);
                if (sellerTag) {
                    product.vendedor_tag = sellerTag;
                }

                if (product.titulo || product.preco) {
                    products.push(product);
                }

            } catch (e) {
                console.error(`Erro ao extrair produto ${index + 1}:`, e);
            }
        });

        return products;
    }

    // Formato em .md
    function formatForLLM(products, searchQuery) {
        if (!products || products.length === 0) {
            return "Nenhum produto encontrado na página.";
        }

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
                let formatted;
                let count;

                if (isItemPage) {
                    // Página de item individual
                    const item = extractSingleItem();
                    formatted = formatSingleItemForLLM(item);
                    count = 1;
                } else {
                    // Página de busca
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

                if (typeof GM_notification !== 'undefined') {
                    GM_notification({
                        title: 'Extração Concluída',
                        text: isItemPage ? 'Produto copiado!' : `${count} produtos copiados!`,
                        timeout: 3000
                    });
                }

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
                if (!isItemPage) {
                    updateProductCount();
                }
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

    // Só atualiza contador em página de busca
    if (isSearchPage) {
        setInterval(updateProductCount, 2000);
        setTimeout(updateProductCount, 1000);
    }

    // Reajustar ao redimensionar janela
    window.addEventListener('resize', () => {
        const rect = btnContainer.getBoundingClientRect();
        const snapped = snapPosition(rect.left, rect.top, rect.width, rect.height);
        btnContainer.style.left = snapped.left + 'px';
        btnContainer.style.top = snapped.top + 'px';
    });

    console.log(`Xianyu/Goofish Extractor carregado (${isItemPage ? 'página de item' : 'página de busca'})`);
})();
