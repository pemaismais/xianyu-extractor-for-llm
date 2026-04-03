const banner = `\
// ==UserScript==
// @name         Xianyu/Goofish Product Extractor for LLM
// @namespace    http://tampermonkey.net/
// @version      2.0
// @description  Extrai produtos da busca e páginas individuais do Goofish formatado para análise com LLM
// @author       pemaismais
// @homepage     https://github.com/pemaismais/xianyu-extractor-for-llm
// @homepageURL  https://github.com/pemaismais/xianyu-extractor-for-llm
// @match        https://www.goofish.com/search*
// @match        https://goofish.com/search*
// @match        https://www.goofish.com/item*
// @match        https://goofish.com/item*
// @match        https://www.goofish.com/personal*
// @match        https://goofish.com/personal*
// @grant        GM_setClipboard
// @grant        GM_notification
// @grant        GM_setValue
// @grant        GM_getValue
// @run-at       document-start
// ==/UserScript==
`;

/** @type {import('rollup').RollupOptions} */
export default {
    input: 'src/main.js',
    output: {
        file: 'xianyu-extractor.user.js',
        format: 'iife',
        banner,
        generatedCode: { constBindings: true },
    },
};
