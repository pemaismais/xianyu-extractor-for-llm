/** @param {object|null} profile @param {string} userId */
function formatProfileSection(profile, userId) {
    let out = '';
    if (profile) {
        const b    = profile.baseInfo ?? profile;
        const base = profile.module?.base ?? {};
        const shop = profile.module?.shop ?? {};

        const displayName = base.displayName ?? b.nickName;
        if (displayName)                       out += `Nome: ${displayName}\n`;
        if (b.userId ?? b.id)                  out += `ID: ${b.userId ?? b.id}\n`;
        if (b.zhiFuBaoVerified)                out += `Alipay verificado: sim\n`;
        const city = b.city ?? b.province;
        if (city)                              out += `Localização: ${city}\n`;

        // Shop / reputation
        if (shop.level)                        out += `Nível da loja: ${shop.level}\n`;
        if (shop.score !== undefined)          out += `Score: ${shop.score}\n`;
        if (shop.nextLevelNeedScore !== undefined) out += `Faltam para próximo nível: ${shop.nextLevelNeedScore} pts\n`;
        if (shop.praiseRatio !== undefined)    out += `Aprovação: ${shop.praiseRatio}%\n`;
        if (shop.reviewNum !== undefined)      out += `Avaliações: ${shop.reviewNum}\n`;
    } else {
        out += `Perfil não disponível\n`;
    }
    out += `Link: https://www.goofish.com/personal?userId=${userId}\n`;
    return out;
}

/**
 * @param {object|null} profile  — sellerCache entry (mtop.idle.web.user.page.head data)
 * @param {object[]} items       — sellerItemsCache entries (mtop.idle.web.xyh.item.list cardList)
 * @param {string} userId
 */
export function formatSellerForLLM(profile, items, userId) {
    let out = `# Vendedor Xianyu/Goofish\n\nData: ${new Date().toLocaleString('pt-BR')}\n\n---\n\n`;

    out += `## Perfil do Vendedor\n\n`;
    out += formatProfileSection(profile, userId);

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

/**
 * @param {object[]} reviews — sellerReviewsCache entries (cardList values)
 * @param {object|null} profile
 * @param {string} userId
 */
export function formatSellerReviewsForLLM(reviews, profile, userId) {
    let out = `# Avaliações do Vendedor\n\nData: ${new Date().toLocaleString('pt-BR')}\n\n---\n\n`;
    out += `## Perfil do Vendedor\n\n`;
    out += formatProfileSection(profile, userId);
    out += `\n---\n\n## Avaliações (${reviews.length})\n\n`;

    if (!reviews.length) {
        out += `Nenhuma avaliação capturada (abra a aba de avaliações para carregar)\n`;
        return out;
    }


    reviews.forEach((card, i) => {
        const d = card?.cardData ?? card;
        out += `### Avaliação ${i + 1}\n\n`;
        if (d.raterUserNick)  out += `Avaliador: ${d.raterUserNick}\n`;
        if (d.gmtCreateStr)   out += `Data: ${d.gmtCreateStr}\n`;
        if (d.ipAddress)      out += `Local: ${d.ipAddress}\n`;
        const sentiment = d.rate === 1 ? 'Positiva' : d.rate === 0 ? 'Neutra' : 'Negativa';
        out += `Tipo: ${sentiment}\n`;
        if (d.feedback)       out += `Comentário: ${d.feedback}\n`;
        const tags = (d.idleCustomWordContents ?? []).map(t => t.content).filter(Boolean);
        if (tags.length)      out += `Tags: ${tags.join(', ')}\n`;
        out += '\n';
    });

    return out;
}

/** @param {object} item */
export function formatSingleItemForLLM(item, profile = null) {
    let out = `# Produto Xianyu/Goofish\n\nData: ${new Date().toLocaleString('pt-BR')}\n\n---\n\n## Informações do Produto\n\n`;
    if (item.descricao)         out += `Descrição: ${item.descricao}\n`;
    if (item.preco)             out += `Preço: ${item.preco}\n`;
    if (item.atributos?.length) out += `Atributos: ${item.atributos.join(', ')}\n`;
    if (item.engajamento)       out += `Engajamento: ${item.engajamento}\n`;
    if (item.url)               out += `Link: ${item.url}\n`;
    out += `\n## Informações do Vendedor\n\n`;
    if (profile) {
        out += formatProfileSection(profile, item.vendedor_id);
    } else {
        if (item.vendedor_nome)                    out += `Nome: ${item.vendedor_nome}\n`;
        if (item.vendedor_id)                      out += `ID: ${item.vendedor_id}\n`;
        if (item.vendedor_aprovacao !== undefined)  out += `Aprovação: ${item.vendedor_aprovacao}%\n`;
        if (item.vendedor_vendidos !== undefined)   out += `Itens vendidos: ${item.vendedor_vendidos}\n`;
        if (item.vendedor_dias !== undefined)       out += `Dias na plataforma: ${item.vendedor_dias}\n`;
        if (item.vendedor_location)                out += `Localização: ${item.vendedor_location}\n`;
        if (item.vendedor_id) out += `Link: https://www.goofish.com/personal?userId=${item.vendedor_id}\n`;
    }
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
