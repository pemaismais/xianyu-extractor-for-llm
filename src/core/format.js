/** @param {object} item */
export function formatSingleItemForLLM(item) {
    let out = `# Produto Xianyu/Goofish\n\nData: ${new Date().toLocaleString('pt-BR')}\n\n---\n\n## Informações do Produto\n\n`;
    if (item.descricao)         out += `Descrição: ${item.descricao}\n`;
    if (item.preco)             out += `Preço: ${item.preco}\n`;
    if (item.atributos?.length) out += `Atributos: ${item.atributos.join(', ')}\n`;
    if (item.engajamento)       out += `Engajamento: ${item.engajamento}\n`;
    if (item.url)               out += `Link: ${item.url}\n`;
    out += `\n## Informações do Vendedor\n\n`;
    if (item.vendedor_nome) out += `Nome: ${item.vendedor_nome}\n`;
    if (item.vendedor_info) out += `Info: ${item.vendedor_info}\n`;
    return out;
}

/**
 * @param {object[]} products
 * @param {string} searchQuery
 * @param {{ minApproval: string|null, minReviews: string|null } | null} filterMeta
 */
export function formatForLLM(products, searchQuery, filterMeta = null) {
    if (!products?.length) return 'Nenhum produto encontrado na página.';

    const filterInfo = filterMeta
        ? ` (filtro: aprovação ≥ ${filterMeta.minApproval ?? '—'}% / avaliações ≥ ${filterMeta.minReviews ?? '—'})`
        : '';

    let out = `# Resultados Xianyu/Goofish\n\n`;
    out += `Busca: ${searchQuery}${filterInfo}\n`;
    out += `Total: ${products.length} produtos\n`;
    out += `Data: ${new Date().toLocaleString('pt-BR')}\n\n---\n\n`;

    for (const p of products) {
        out += `## Produto ${p.index}\n\n`;
        if (p.titulo)                   out += `Título: ${p.titulo}\n`;
        if (p.preco)                    out += `Preço: ¥${p.preco}\n`;
        if (p.promocao)                 out += `Promoção: ${p.promocao}\n`;
        if (p.tags?.length)             out += `Tags: ${p.tags.join(', ')}\n`;
        if (p.vendedor)                 out += `Vendedor: ${p.vendedor}\n`;
        if (p.vendedor_tag)             out += `Nível: ${p.vendedor_tag}\n`;
        if (p.aprovacao  !== undefined) out += `Aprovação: ${p.aprovacao}%\n`;
        if (p.avaliacoes !== undefined) out += `Avaliações: ${p.avaliacoes}\n`;
        if (p.url)                      out += `Link: ${p.url}\n`;
        out += '\n';
    }
    return out;
}
