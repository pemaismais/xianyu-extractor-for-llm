import { ICON } from '../config.js';
import { sellerCache, sellerItemsCache, sellerTotalCache } from '../cache.js';
import { createDragContainer } from '../ui/container.js';
import { createExtractButton } from '../ui/base-button.js';
import { formatSellerForLLM } from '../core/format.js';

export function initPersonalPage() {
    const userId = new URLSearchParams(window.location.search).get('userId') ?? 'unknown';

    const { el: container, onContainerClick } = createDragContainer();
    const { btn, icon, btnText, sizeToggle } = createExtractButton('Extrair 0 de ...', container);

    function updateBtnText() {
        const cached = sellerItemsCache.get(userId)?.length ?? 0;
        const total  = sellerTotalCache.get(userId);
        btnText.textContent = total !== undefined
            ? `Extrair ${cached} de ${total}`
            : `Extrair ${cached} de ...`;
    }
    updateBtnText();
    const btnInterval = setInterval(updateBtnText, 500);

    const btnRow = document.createElement('div');
    btnRow.style.cssText = 'display: flex; justify-content: space-between; align-items: stretch; gap: 12px;';
    btnRow.appendChild(btn);

    const rightPill = document.createElement('div');
    rightPill.style.cssText = 'display: flex; align-items: stretch; background: #09090b; border: 1px solid #27272a; border-radius: 9999px; overflow: hidden; margin: 2px;';
    sizeToggle.style.borderLeft = 'none';
    rightPill.appendChild(sizeToggle);
    btnRow.appendChild(rightPill);

    container.appendChild(btnRow);
    document.body.appendChild(container);

    function handleExtract() {
        btnText.textContent = 'Extraindo...';
        btn.disabled = true;

        setTimeout(() => {
            try {
                console.log('[xianyu] personal extract — userId:', userId);
                console.log('[xianyu] sellerCache keys:', [...sellerCache.keys()]);
                console.log('[xianyu] sellerItemsCache keys:', [...sellerItemsCache.keys()]);
                const profile = sellerCache.get(userId) ?? null;
                const items   = sellerItemsCache.get(userId) ?? [];
                console.log('[xianyu] profile found:', !!profile, '| items found:', items.length);
                const formatted = formatSellerForLLM(profile, items, userId);

                if (typeof GM_setClipboard !== 'undefined') GM_setClipboard(formatted);
                else navigator.clipboard.writeText(formatted);

                btnText.textContent = 'Copiado';
                icon.src = ICON.check;
                console.log('=== VENDEDOR EXTRAÍDO ===\n', formatted);
            } catch (e) {
                console.error('Erro na extração:', e);
                btnText.textContent = 'Erro';
                icon.src = ICON.alert;
            }
            setTimeout(() => {
                updateBtnText();
                icon.src = ICON.copy;
                btn.disabled = false;
            }, 2000);
        }, 100);
    }

    onContainerClick(e => { if (btn.contains(e.target)) handleExtract(); });

    console.log('Xianyu/Goofish Extractor v2.0 (personal)');
}
