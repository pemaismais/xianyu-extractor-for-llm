import { reputationCache, sellerCache, sellerItemsCache, sellerTotalCache } from './cache.js';

/**
 * Intercepts XMLHttpRequest (used by Alibaba's mtop.js library) to populate
 * reputationCache from mtop.taobao.idlemtopsearch responses.
 * Each item carries userFishShopLabel with "19条评价" / "好评率100%".
 */
export function installInterceptor() {
    const _origOpen = XMLHttpRequest.prototype.open;
    const _origSend = XMLHttpRequest.prototype.send;

    XMLHttpRequest.prototype.open = function (method, url, ...rest) {
        this._xianyuUrl = typeof url === 'string' ? url : '';
        // Log every mtop call so we can see what's happening on the personal page
        if (this._xianyuUrl.includes('mtop.idle')) {
            console.log('[xianyu] XHR open:', method, this._xianyuUrl.split('?')[0]);
        }
        return _origOpen.apply(this, [method, url, ...rest]);
    };

    XMLHttpRequest.prototype.send = function (...args) {
        if (this._xianyuUrl.includes('mtop.idle.web.user.page.head')) {
            console.log('[xianyu] intercepting user.page.head');
            this.addEventListener('load', function () {
                console.log('[xianyu] user.page.head response status:', this.status);
                try {
                    const json = JSON.parse(this.responseText);
                    const d = json?.data;
                    console.log('[xianyu] user.page.head data keys:', Object.keys(d ?? {}));
                    console.log('[xianyu] user.page.head baseInfo keys:', Object.keys(d?.baseInfo ?? {}));
                    const userId = d?.baseInfo?.userId ?? d?.baseInfo?.id ?? d?.userId
                        ?? new URLSearchParams(window.location.search).get('userId');
                    if (!userId) {
                        console.warn('[xianyu] user.page.head: no userId found, baseInfo:', JSON.stringify(d?.baseInfo ?? {}).slice(0, 300));
                        return;
                    }
                    sellerCache.set(String(userId), d);
                    // total items count lives in module.tabs.item.number
                    const total = d?.module?.tabs?.item?.number;
                    if (total !== undefined) {
                        sellerTotalCache.set(String(userId), Number(total));
                        console.log('[xianyu] seller total from page.head:', total);
                    }
                    console.log('[xianyu] seller profile cached:', userId);
                } catch (e) {
                    console.error('[xianyu] seller profile parse error:', e);
                }
            });
        }

        if (this._xianyuUrl.includes('mtop.idle.web.xyh.item.list')) {
            const capturedUrl = this._xianyuUrl;
            console.log('[xianyu] intercepting xyh.item.list, url:', capturedUrl.slice(0, 200));
            this.addEventListener('load', function () {
                console.log('[xianyu] xyh.item.list response status:', this.status);
                try {
                    const json = JSON.parse(this.responseText);
                    console.log('[xianyu] xyh.item.list data keys:', Object.keys(json?.data ?? {}));
                    const cardList = json?.data?.cardList ?? [];
                    console.log('[xianyu] xyh.item.list cardList length:', cardList.length);
                    if (!cardList.length) {
                        console.warn('[xianyu] xyh.item.list: empty cardList');
                        return;
                    }
                    // userId is in the URL's `data` query param as URL-encoded JSON
                    let userId = 'unknown';
                    const dataMatch = capturedUrl.match(/[?&]data=([^&]+)/);
                    if (dataMatch) {
                        try {
                            const parsed = JSON.parse(decodeURIComponent(dataMatch[1]));
                            console.log('[xianyu] xyh.item.list data param parsed:', parsed);
                            if (parsed?.userId) userId = String(parsed.userId);
                        } catch (parseErr) {
                            console.warn('[xianyu] xyh.item.list: failed to parse data param:', parseErr);
                        }
                    } else {
                        console.warn('[xianyu] xyh.item.list: no data= param in URL');
                    }
                    if (userId === 'unknown') {
                        // fallback: grab from current page URL
                        const pageMatch = window.location.search.match(/[?&]userId=(\d+)/);
                        if (pageMatch) userId = pageMatch[1];
                        console.log('[xianyu] xyh.item.list: userId from page URL:', userId);
                    }
                    const existing = sellerItemsCache.get(userId) ?? [];
                    sellerItemsCache.set(userId, existing.concat(cardList));
                    const newTotal = Number(json.data.totalCount);
                    if (newTotal > (sellerTotalCache.get(userId) ?? 0)) {
                        sellerTotalCache.set(userId, newTotal);
                    }
                    console.log('[xianyu] seller items cached:', userId, sellerItemsCache.get(userId).length, '/', sellerTotalCache.get(userId), 'itens');
                } catch (e) {
                    console.error('[xianyu] seller items parse error:', e);
                }
            });
        }

        if (this._xianyuUrl.includes('mtop.taobao.idlemtopsearch')) {
            this.addEventListener('load', function () {
                try {
                    const json = JSON.parse(this.responseText);
                    const list = json?.data?.resultList ?? [];

                    for (const entry of list) {
                        const ex = entry?.data?.item?.main?.exContent;
                        if (!ex?.itemId) continue;

                        let reviews = 0, approval = null;
                        for (const tag of (ex.userFishShopLabel?.tagList ?? [])) {
                            const c  = tag?.data?.content ?? '';
                            const rm = c.match(/(\d+)条评价/);
                            if (rm) reviews  = parseInt(rm[1]);
                            const am = c.match(/好评率(\d+)%/);
                            if (am) approval = parseInt(am[1]);
                        }

                        reputationCache.set(String(ex.itemId), { reviews, approval });
                    }

                    if (list.length > 0) {
                        console.log('[xianyu] cache:', reputationCache.size, 'itens');
                    }
                } catch (e) {
                    console.error('[xianyu] XHR parse error:', e);
                }
            });
        }

        return _origSend.apply(this, args);
    };
}
