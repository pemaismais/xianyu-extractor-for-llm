import { snapPosition } from '../utils/snap.js';
import { getStorage, setStorage } from '../utils/storage.js';

/**
 * Creates the fixed draggable wrapper that holds all button UI.
 * Children that call e.stopPropagation() on mousedown will suppress drag.
 *
 * @returns {{ el: HTMLDivElement, onContainerClick: (cb: (e: MouseEvent) => void) => void }}
 */
export function createDragContainer() {
    const savedPos = getStorage('btnPos', null);

    const el = document.createElement('div');
    const baseStyle = `
        position: fixed; z-index: 99999; cursor: grab; user-select: none;
        transition: left 0.15s ease, top 0.15s ease;
        background: #18181b; border: 1px solid #27272a;
        border-radius: 16px; padding: 16px; min-width: 320px;
        display: flex; flex-direction: column; gap: 16px;
        box-shadow: 0 10px 25px rgba(0,0,0,0.5); font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    `;
    el.style.cssText = savedPos
        ? `${baseStyle} top: ${savedPos.top}px; left: ${savedPos.left}px;`
        : `${baseStyle} top: 80px; right: 20px;`;

    let isDragging = false, hasDragged = false;
    let startX = 0, startY = 0, startLeft = 0, startTop = 0;
    const clickCallbacks = [];

    el.addEventListener('mousedown', e => {
        isDragging = true;
        hasDragged = false;
        el.style.cursor = 'grabbing';
        startX = e.clientX;
        startY = e.clientY;
        const rect = el.getBoundingClientRect();
        startLeft = rect.left;
        startTop  = rect.top;
        e.preventDefault();
    });

    document.addEventListener('mousemove', e => {
        if (!isDragging) return;
        const dx = e.clientX - startX, dy = e.clientY - startY;
        if (Math.abs(dx) > 3 || Math.abs(dy) > 3) hasDragged = true;
        el.style.transition = 'none';
        el.style.left  = (startLeft + dx) + 'px';
        el.style.top   = (startTop  + dy) + 'px';
        el.style.right = 'auto';
    });

    document.addEventListener('mouseup', e => {
        if (!isDragging) return;
        isDragging = false;
        el.style.cursor = 'grab';
        el.style.transition = 'left 0.15s ease, top 0.15s ease';
        const rect    = el.getBoundingClientRect();
        const snapped = snapPosition(rect.left, rect.top, rect.width, rect.height);
        el.style.left = snapped.left + 'px';
        el.style.top  = snapped.top  + 'px';
        setStorage('btnPos', snapped);
        if (!hasDragged) clickCallbacks.forEach(cb => cb(e));
    });

    window.addEventListener('resize', () => {
        const rect    = el.getBoundingClientRect();
        const snapped = snapPosition(rect.left, rect.top, rect.width, rect.height);
        el.style.left = snapped.left + 'px';
        el.style.top  = snapped.top  + 'px';
    });

    return {
        el,
        /** @param {(e: MouseEvent) => void} cb */
        onContainerClick: (cb) => clickCallbacks.push(cb),
    };
}
