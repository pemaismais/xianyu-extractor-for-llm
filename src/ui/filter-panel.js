export function createFilterPanel() {
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
