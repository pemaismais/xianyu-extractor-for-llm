/**
 * @param {object|null} profile  — sellerCache entry (mtop.idle.web.user.page.head data)
 * @param {object[]} items       — sellerItemsCache entries (mtop.idle.web.xyh.item.list cardList)
 * @param {string} userId
 */
export function formatSellerForLLM(profile, items, userId) {
    let out = `# Vendedor Xianyu/Goofish\n\nData: ${new Date().toLocaleString('pt-BR')}\n\n---\n\n`;

    out += `## Perfil do Vendedor\n\n`;
    if (profile) {
        // data.baseInfo contains the seller details
        const b = profile.baseInfo ?? profile;
        if (b.nickName)    out += `Nome: ${b.nickName}\n`;
        if (b.userId ?? b.id) out += `ID: ${b.userId ?? b.id}\n`;
        if (b.sellerCredit?.level)  out += `Nível: ${b.sellerCredit.level}\n`;
        if (b.sellerCredit?.score)  out += `Score: ${b.sellerCredit.score}\n`;
        if (b.goodRatePercentage !== undefined) out += `Aprovação: ${b.goodRatePercentage}%\n`;
        if (b.evaluateCnt !== undefined)        out += `Avaliações: ${b.evaluateCnt}\n`;
        if (b.zhiFuBaoVerified)    out += `Alipay verificado: sim\n`;
        const city = b.city ?? b.province;
        if (city) out += `Localização: ${city}\n`;
    } else {
        out += `Perfil não disponível (página ainda não carregou o dado)\n`;
    }
    out += `Link: https://www.goofish.com/personal?userId=${userId}\n`;

    out += `\n---\n\n## Produtos à Venda (${items.length})\n\n`;

    if (!items.length) {
        out += `Nenhum produto capturado (role a página para carregar os itens)\n`;
        return out;
    }

    items.forEach((card, i) => {
        const d = card?.cardData ?? card;
        const itemId   = d?.detailParams?.itemId;
        const title    = d?.title;
        const price    = d?.priceInfo?.price;
        const shipping = d?.detailParams?.postInfo;
        const origPrice = d?.itemLabelDataVO?.labelData?.r3?.tagList?.[0]?.data?.content;
        const freshness = d?.itemLabelDataVO?.labelData?.r2?.tagList?.[0]?.data?.content;

        out += `### Item ${i + 1}\n\n`;
        if (title)      out += `Título: ${title}\n`;
        if (price)      out += `Preço: ¥${price}\n`;
        if (origPrice)  out += `Preço original: ${origPrice}\n`;
        if (shipping)   out += `Frete: ${shipping}\n`;
        if (freshness)  out += `Publicação: ${freshness}\n`;
        if (itemId)     out += `Link: https://www.goofish.com/item?id=${itemId}\n`;
        out += '\n';
    });

    return out;
}

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
