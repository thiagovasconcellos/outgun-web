# OG-592 — Telas com o título oficial e listas alfabéticas na moderação

| Campo | Valor |
|---|---|
| Épico | E17 |
| Tipo | Feature |
| Prioridade | Must |
| Estimativa | 3 pts |
| Sprint | — |
| Status | Pronto |
| Dependências | OG-591 |
| Regras de negócio | RN-MRV-16 |
| Skills | `outgun-card-workflow` |

> Origem: proposta de Nosferatu, 2026-11-06, com as respostas P1..P10 — página em `plan/specs/nomes-de-mapas/proposta.html`. Decisão D-96.

## História
Como moderador e jogador, quero ver títulos e não identificadores técnicos, em listas fáceis de percorrer.

## Contexto
- Pontos conferidos: Rotações (`AdminScreen.tsx:1166`, ordena por chave), aba Mapas (`:1070`, mostra a chave), Criar sala (`lobby.tsx:494`), OutCup (`outcup.tsx:421`), relatório e PDF (`MatchReport.tsx:391`, `report-pdf.ts:168`), barra do replay (`ReplayScreen.tsx:98`). A lista de salas já recebe o título (`game-server/src/rooms.ts:172`).
- Comentário de Nosferatu na P10: toda lista de mapas da moderação vem em ordem alfabética pelo título, sem interferir na ordem de rotação.

## Escopo
- Trocar a chave pelo título nas telas acima, inclusive no seletor de sala privada e nos mapas de treino; rascunho identificado à parte.
- Ordenar pelo título as listas de mapas da moderação; salvar uma rotação preserva a ordem de jogo dela.
- Chave técnica para moderadores só no histórico do mapa e nas mensagens de conflito (P9).
- Relatório, PDF e replay: título atual e número da revisão jogada. Geometria continua a da revisão jogada.
- Replay: mostrar o título atual sem mover nada do HUD. Se o texto do HUD precisar de mudança, seguir RN-UI-05 e `pnpm visual:check`.
- Busca geral por `.map`, `.key` e `mapTitle` que virem texto visível.

## Critérios de aceite
- [ ] Nenhuma das telas mostra chave técnica como rótulo quando a identidade está disponível.
- [ ] Editar e salvar uma rotação não altera a ordem dos mapas já presentes.
- [ ] Moderação lista Gávea na posição alfabética de G, com a ordenação pelo idioma.

## Notas de implementação
