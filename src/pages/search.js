import { ICON } from '../config.js';
import { reputationCache } from '../cache.js';
import { getListContainer } from '../utils/dom.js';
import { createDragContainer } from '../ui/container.js';
import { createExtractButton } from '../ui/base-button.js';
import { createFilterPanel } from '../ui/filter-panel.js';
import { extractProducts } from '../core/extract.js';
import { formatForLLM } from '../core/format.js';
import { applyFilter, clearFilter } from '../core/filter.js';
import { getStorage, setStorage } from '../utils/storage.js';

export function initSearchPage() {
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
    const savedApproval = getStorage('filterMinApproval', '');
    const savedReviews  = getStorage('filterMinReviews',  '');
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
        setStorage('filterMinApproval', minApprovalInput.value);
        setStorage('filterMinReviews',  minReviewsInput.value);
        applyFilter(minA, minR);
        updateFilterStatus();
        updateProductCount();
    }

    function doClearFilter() {
        filterActive = false;
        filterBtn.style.background = '#1a1a1a';
        filterBtn.title = 'Filtrar por reputação';
        setStorage('filterMinApproval', '');
        setStorage('filterMinReviews',  '');
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
