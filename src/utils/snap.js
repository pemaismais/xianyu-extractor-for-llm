import { MARGIN, SNAP_THRESHOLD } from '../config.js';

/**
 * Returns a snapped position keeping the element inside the viewport
 * with a soft margin. Snaps to the nearest edge when close enough.
 *
 * @param {number} left
 * @param {number} top
 * @param {number} width
 * @param {number} height
 * @returns {{ left: number, top: number }}
 */
export function snapPosition(left, top, width, height) {
    const vw = window.innerWidth, vh = window.innerHeight;

    if (left < SNAP_THRESHOLD)                left = MARGIN;
    else if (left + width > vw - SNAP_THRESHOLD) left = vw - width - MARGIN;

    if (top < SNAP_THRESHOLD)                 top = MARGIN;
    else if (top + height > vh - SNAP_THRESHOLD) top = vh - height - MARGIN;

    return {
        left: Math.max(MARGIN, Math.min(left, vw - width - MARGIN)),
        top:  Math.max(MARGIN, Math.min(top,  vh - height - MARGIN)),
    };
}
