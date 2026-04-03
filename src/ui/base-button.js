import { ICON, SIZE_ORDER, SIZES } from '../config.js';
import { getStorage, setStorage } from '../utils/storage.js';

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
export function createExtractButton(label) {
    let currentSizeIndex = (() => {
        const idx = SIZE_ORDER.indexOf(getStorage('btnSize', null));
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
        setStorage('btnSize', newSize);
        setTimeout(() => { sizeToggle.style.transform = 'scale(1)'; }, 150);
        setTimeout(() => {
            sizeChanging = false;
            btn.style.transition  = 'background 0.2s ease, border-color 0.2s ease';
            icon.style.transition = '';
        }, 400);
    });

    return { btn, icon, btnText, sizeToggle };
}
