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
export function createExtractButton(label, container) {
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
