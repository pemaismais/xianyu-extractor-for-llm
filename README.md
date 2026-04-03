# Xianyu/Goofish Extractor for LLM

Userscript para extrair produtos do Xianyu (闲鱼) / Goofish em formato otimizado para análise com LLMs.

## Funcionalidades

- Extrai produtos de páginas de busca (múltiplos itens)
- Extrai detalhes de páginas de produto individual
- **Filtro por reputação do vendedor** — mínimo de aprovação (%) e avaliações
- Dados de reputação enriquecidos no output (aprovação, nº de avaliações)
- Filtros salvos entre sessões via storage do ScriptCat/Tampermonkey
- Botão arrastável com snap nas bordas
- Copia automaticamente para o clipboard

## Instalação

1. Instale o [ScriptCat](https://docs.scriptcat.org/) (recomendado) ou [Tampermonkey](https://www.tampermonkey.net/) / [Violentmonkey](https://violentmonkey.github.io/)
2. Clique em [instalar script](https://github.com/pemaismais/xianyu-extractor-for-llm/raw/main/xianyu-extractor.user.js)
3. Confirme a instalação

## Uso

### Página de busca

Acesse uma busca como `goofish.com/search?q=x99` e clique em **"Extrair X Produtos"**.

#### Filtro por reputação

Clique no ícone de funil para abrir o painel de filtro:

- **Aprovação mínima** — oculta vendedores abaixo do % definido (ex: `95`)
- **Avaliações mínimas** — oculta vendedores com poucas avaliações (ex: `50`)

Os valores são salvos automaticamente e reaplicados na próxima visita. O botão fica azul quando há um filtro ativo. A extração inclui apenas os produtos visíveis.

### Página de produto

Acesse qualquer página de item e clique em **"Copiar Produto"**.

## Dados extraídos

### Busca

| Campo | Descrição |
|---|---|
| Título | Título do anúncio |
| Preço | Preço atual |
| Tags | Tags do produto |
| Promoção | Desconto ou promoção ativa |
| Vendedor | Nome do vendedor |
| Nível | Tag de reputação exibida no card |
| Aprovação | % de avaliações positivas (via API) |
| Avaliações | Número total de avaliações (via API) |
| Link | URL do produto |

### Produto individual

- Descrição completa
- Preço e atributos (marca, condição, etc.)
- Engajamento (interessados, visualizações)
- Informações do vendedor

## Exemplo de output (busca com filtro)

```
# Resultados Xianyu/Goofish

Busca: x99 (filtro: aprovação ≥ 95% / avaliações ≥ 50)
Total: 12 produtos
Data: 03/04/2026, 14:32:00

---

## Produto 1

Título: X99主板 DDR4 LGA2011-3 支持E5-2678 V3
Preço: ¥158
Tags: 轻微使用痕迹
Vendedor: loja_tech
Nível: 卖家信用极好
Aprovação: 98%
Avaliações: 1066
Link: https://www.goofish.com/item?id=...
```

## Desenvolvimento

```bash
npm install
npm run build   # gera xianyu-extractor.user.js
npm run dev     # watch mode
```

Estrutura em `src/` com módulos ES, bundled pelo Rollup para um único arquivo IIFE.

## Licença

MIT
