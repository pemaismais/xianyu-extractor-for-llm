# Xianyu/Goofish Extractor for LLM

Userscript para extrair produtos do Xianyu (闲鱼) / Goofish em formato otimizado para análise com LLMs.

## Funcionalidades

- Extrai produtos de páginas de busca (múltiplos itens)
- Extrai detalhes de páginas de produto individual
- Formata em Markdown limpo para LLMs
- Botão flat e arrastável
- Copia automaticamente para o clipboard

## Instalação

1. Instale o [ScriptCat](https://docs.scriptcat.org/) (recomendado) ou [Tampermonkey](https://www.tampermonkey.net/) / [Violentmonkey](https://violentmonkey.github.io/)
2. Clique em [instalar script](https://github.com/pemaismais/xianyu-extractor-for-llm/raw/main/xianyu-extractor.user.js)
3. Confirme a instalação

## Uso

### Página de busca

Acesse uma busca como `goofish.com/search?q=x99` e clique no botão "Extrair X Produtos".

### Página de produto

Acesse qualquer página de item e clique em "Copiar Produto".

## Dados extraídos

### Busca

- Título, preço, tags, promoções
- Nome e reputação do vendedor
- Link do produto

### Produto individual

- Descrição completa
- Preço e atributos (marca, condição, etc)
- Engajamento (interessados, visualizações)
- Informações do vendedor (local, tempo na plataforma, vendas, avaliação)

## Exemplo de output

```
# Produto Xianyu/Goofish

Data: 31/03/2026, 15:00:00

---

## Informações do Produto

Descrição: X99主板 DDR4 | 已测试 | 退货邮费自理
Preço: ¥158
Atributos: 品牌: Intel/英特尔, 成色: 轻微使用痕迹
Engajamento: 167人想要 4610浏览
Link: https://www.goofish.com/item?id=...

## Informações do Vendedor

Nome: loja_tech
Info: 佛山, 来闲鱼1年, 卖出714件宝贝, 好评率98%
```

## Licença

MIT
