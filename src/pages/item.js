import { ICON } from '../config.js';
import { createDragContainer } from '../ui/container.js';
import { createExtractButton } from '../ui/base-button.js';
import { extractSingleItem } from '../core/extract.js';
import { formatSingleItemForLLM } from '../core/format.js';

export function initItemPage() {
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
