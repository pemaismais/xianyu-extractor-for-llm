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
    el.style.cssText = savedPos
        ? `position: fixed; top: ${savedPos.top}px; left: ${savedPos.left}px; z-index: 99999; cursor: grab; user-select: none; transition: left 0.15s ease, top 0.15s ease;`
        : `position: fixed; top: 80px; right: 20px; z-index: 99999; cursor: grab; user-select: none; transition: left 0.15s ease, top 0.15s ease;`;

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
