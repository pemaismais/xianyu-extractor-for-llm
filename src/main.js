import { installInterceptor } from './interceptor.js';
import { initSearchPage } from './pages/search.js';
import { initItemPage } from './pages/item.js';
import { initPersonalPage } from './pages/personal.js';

// Phase 1 — runs immediately at document-start, before any page scripts.
installInterceptor();

// Phase 2 — init UI after DOM is ready.
function boot() {
    const path = window.location.pathname;
    if (path.includes('/search'))        initSearchPage();
    else if (path.includes('/item'))     initItemPage();
    else if (path.includes('/personal')) initPersonalPage();
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
} else {
    boot();
}
