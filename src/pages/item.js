import { ICON } from '../config.js';
import { sellerCache } from '../cache.js';
import { createDragContainer } from '../ui/container.js';
import { createExtractButton } from '../ui/base-button.js';
import { extractSingleItem } from '../core/extract.js';
import { formatSingleItemForLLM } from '../core/format.js';

export function initItemPage() {
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
                const profile   = item.vendedor_id ? (sellerCache.get(item.vendedor_id) ?? null) : null;
                const formatted = formatSingleItemForLLM(item, profile);

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
