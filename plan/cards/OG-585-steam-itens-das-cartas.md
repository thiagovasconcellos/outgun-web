# OG-585 — Steam: definição dos itens das cartas gerada do catálogo e cartas fora da Steam

| Campo | Valor |
|---|---|
| Épico | E18 |
| Tipo | Feature |
| Prioridade | Must |
| Estimativa | 3 pts |
| Sprint | S62 |
| Status | Em revisão |
| Dependências | OG-583 |
| Regras de negócio | RN-CRT-10, D-95 |
| Skills | `outgun-card-workflow` |

> Origem: pedido do PO em 2026-11-05 (cartas também no inventário da Steam, só a imagem, sem texto). Decisão D-95.

## História
Como moderador, quero que cada carta vire um item do inventário Steam sem trabalho manual, e poder deixar uma carta fora da Steam.

## Contexto
- Steam Inventory Service: definições de item em JSON, enviadas no Steamworks (Inventory Service → Item Definitions).

## Escopo
- `legend_cards.steam` (padrão sim) e o interruptor "Enviar para a Steam" na ficha do painel.
- `node dist/cli.js cards steam-itemdefs ARQUIVO`: gera o JSON das definições a partir das cartas ativas com `steam`: `itemdefid` = 1000 + id da carta, `type: item`, `name` = nick, `tags` com a classe, `icon_url`/`icon_url_large` = a imagem do OG-583, `tradable: false`, `marketable: false`, sem `description` (D-95).
- Envio do JSON ao Steamworks e publicação (feito pelo agente pelo navegador, com o PO).

## Critérios de aceite
- [x] O JSON passa no validador do Steamworks.
- [x] Carta fora da Steam não sai no JSON.

## Notas de implementação
- `legend_cards.steam` e o botão "Inventário Steam: sim/não" na ficha do painel (`PUT /admin/cards/:id/steam`).
- `node dist/cli.js cards steam-itemdefs ARQUIVO`: itemdefid 1000+id, nome = nick, cor do nome da classe, etiqueta da classe, imagem do OG-583 (`?r=revisão`), não trocável nem vendável, sem descrição. **Envio no Steamworks (Inventory Service) depois da chave e do deploy.**
