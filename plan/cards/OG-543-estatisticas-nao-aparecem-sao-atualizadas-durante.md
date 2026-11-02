# OG-543 — Estatísticas não aparecem/são atualizadas durante  a partida

| Campo | Valor |
|---|---|
| Épico | E11 |
| Tipo | Bug |
| Prioridade | Should |
| Estimativa | 2 pts |
| Sprint | S58 |
| Status | Em revisão |
| Dependências | — |
| Issue | [#32](https://github.com/thiagovasconcellos/outgun-web/issues/32) |
| Regras de negócio | — |
| Skills | `outgun-card-workflow` |

## História
Como jogador, quero que isto deixe de acontecer: Estatísticas não aparecem/são atualizadas durante  a partida

## Contexto
- Issue #32 (área: Partida / HUD; gravidade: Médio; frequência: Sempre).
- Versão: 2.56.0 · Dispositivo: computador · Navegador e sistema: app desktop/Steam no Windows · Data e hora: Fri Oct 30 2026 23:46:39 GMT-0300 (America/Sao_Paulo) · Apelido no jogo: coiote
- Passos: 1. As estatísticas da partida não aparecem/são atualizadas durante as partidas quando apertamos F4. Todas as informações ficam zeradas
- Esperado: Apertar F4 e conferir meus tiros e precisão
- Obtido: 0 tiros e 0 %
- Evidências: apertando f4 Última partida: https://outgunweb.com.br/matches/74b0d110-9522-4f21-9839-75fae0cf5530
- Contorno: —

## Escopo
- Corrigir a causa; teste que reproduz o caso.

## Critérios de aceite
- [x] O caso da issue não acontece mais (teste).
- [ ] PO confere.

## Notas de implementação
- De propósito desde a v1: tiros, acertos e movimento só saíam no fim (`server_next_map` do original). Na v2 o servidor manda `movementShots`/`teamMovementShots` a cada 2 s de jogo quando mudam, e na entrada (`MOVEMENT_SHOTS_PERIOD`, `stats-sync.ts`); vale para F3 e F4, replay e espectador.
- Sem mudança de protocolo nem de cliente. Teste em `stats-sync.test.ts`.
