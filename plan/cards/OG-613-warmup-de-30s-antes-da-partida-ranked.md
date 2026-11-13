# OG-613 — Warmup de 30 s antes de cada partida Ranked

| Campo | Valor |
|---|---|
| Épico | E5 |
| Tipo | Funcionalidade |
| Prioridade | Should |
| Estimativa | 5 pts |
| Sprint | — |
| Status | Em revisão |
| Dependências | — |
| Issue | — (pedido da comunidade, 2026-11-13) |
| Regras de negócio | RN-RKL-11, RN-RKL-12 |
| Skills | `outgun-card-workflow` |

## História
Como jogador Ranked, quero 30 s de warmup depois do voto e do "Pronto", para que todos entrem com conexão confirmada e o time combine a estratégia.

## Contexto
- Hoje, com todos prontos, há contagem de 5 s (`COUNTDOWN_FRAMES = 50`) e o mapa já carrega e o jogo começa.
- Proposta: o mapa carrega primeiro, com todos dentro, e os jogadores ficam parados na base por 30 s (sem pontuar, sem dano) antes do início valendo; vale para cada jogo da série.

## Escopo
- Nova fase `warmup` (30 s) entre `countdown` e `game`: mapa carregado, jogadores nascem, tiro/captura desligados e placar/tempo da partida só correm depois. Mensagem/estado com os segundos restantes.
- Só começa quando todos confirmarem o carregamento (`clientReady`); quem cair e não voltar aciona a regra de ausência existente (RankedPause).
- HUD: contagem do warmup sem mover nada do que existe (RN-UI-05); `pnpm visual:check`.
- Chat liberado; o time pode trocar de lado? (não: lados seguem fixos desde o lobby).

## Decisões do PO (2026-11-13)
- O warmup dura sempre 30 s e não pode ser pulado (não há "Pronto" dentro do mapa).
- Repete em cada jogo da série (md3/md5), com 30 s fixos.

## Critérios de aceite
- [ ] 30 s de warmup com contagem visível antes de cada jogo; ninguém pontua nem morre nele.
- [ ] Queda de conexão no warmup trata-se como ausência, sem iniciar a partida contada.
- [ ] Testes do `RankedLobby`/`room`; PO confere numa partida online.

## Notas de implementação
- Warmup = mundo parado com o mapa já carregado (`warmupUntil` + `gameOverUntil` em `room.ts`, `WARMUP_FRAMES = 300`); a fase do lobby segue `game`. O cliente mostra a contagem pela fase nova `warmup` do `pauseState` (overlay existente, sem mexer no HUD).
- Pendente: ninguém move/atira no warmup (mundo parado), só chat; testes do `room` que contavam 1 frame de carga podem precisar de ajuste na verificação da sprint.
