# OG-583 — Cartas de Jogador: imagem PNG de cada carta gerada pelo servidor com o modelo do jogo

| Campo | Valor |
|---|---|
| Épico | E18 |
| Tipo | Feature |
| Prioridade | Must |
| Estimativa | 3 pts |
| Sprint | S62 |
| Status | Pronto |
| Dependências | OG-572 |
| Regras de negócio | RN-CRT-01, RN-CRT-10, D-95 |
| Skills | `outgun-card-workflow` |

> Origem: pedido do PO em 2026-11-05 (cartas também no inventário da Steam, só a imagem, sem texto). Decisão D-95.

## História
Como jogador, quero que a minha carta apareça igual fora do jogo, para ela poder ir para a Steam e para os links.

## Contexto
- A Steam exige uma imagem fixa por item (`icon_url`); não roda o componente do jogo.
- O desenho da carta já é canvas 2D (`apps/web/src/ui/player-card.ts`); a moldura e as rachaduras são SVG.

## Escopo
- Desenho da carta movido para um módulo compartilhado (cliente e API) que recebe um contexto 2D: fundo, boneco, moldura, rachaduras, logo, nick ajustado à largura, classe e estrelas. O cliente continua usando o mesmo código.
- `GET /api/cards/:slug.png` (público): a frente parada da carta (sem animação, sem número da cópia), 512 × 683, desenhada no servidor com `@napi-rs/canvas`, em cache até a carta mudar (revisão no nome do cache). Carta desativada ou marcada "fora da Steam" também tem imagem (é só a frente).
- Só boneco, nick, classe e moldura: nenhuma descrição (D-95).

## Critérios de aceite
- [ ] A imagem do servidor bate com a carta do jogo nas 6 classes.
- [ ] Mudar a classe no painel muda a imagem na próxima chamada.

## Notas de implementação
(preenchido durante a execução)
