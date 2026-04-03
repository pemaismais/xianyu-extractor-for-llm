/** @param {string} key @param {*} fallback */
export const getStorage = (key, fallback = null) =>
    typeof GM_getValue !== 'undefined' ? GM_getValue(key, fallback) : fallback;

/** @param {string} key @param {*} value */
export const setStorage = (key, value) => {
    if (typeof GM_setValue !== 'undefined') GM_setValue(key, value);
};
