import { reputationCache } from './cache.js';

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
        return _origOpen.apply(this, [method, url, ...rest]);
    };

    XMLHttpRequest.prototype.send = function (...args) {
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
