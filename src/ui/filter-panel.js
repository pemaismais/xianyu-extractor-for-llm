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
export function createFilterPanel() {
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
