# OG-595 — Investigar por que Coliseu nunca teve partida registrada

| Campo | Valor |
|---|---|
| Épico | E17 |
| Tipo | Spike |
| Prioridade | Could |
| Estimativa | 1 pts |
| Sprint | — |
| Status | Pronto |
| Dependências | — |
| Regras de negócio | — |
| Skills | `outgun-card-workflow` |

> Origem: proposta de Nosferatu, 2026-11-06, com as respostas P1..P10 — página em `plan/specs/nomes-de-mapas/proposta.html`. Decisão D-96.

## História
Como PO, quero saber por que um mapa da rotação nunca aparece no histórico, para corrigir se for bug.

## Contexto
- Produção em 2026-11-06: Coliseu tem 0 de 332 partidas, apesar de estar na rotação Casual; todos os outros nativos têm pelo menos 4. A sequência recente vai de Cebs Park direto para Fabiana Cecin, e Coliseu fica entre os dois na lista.
- Causa desconhecida. Coliseu é também o `DEFAULT_MAP` do cliente (`host.ts:200`).

## Escopo
- Descobrir se o mapa é pulado, se a partida termina sem ser gravada ou se há outro motivo.
- Corrigir se for simples; se não, abrir card com a causa.

## Critérios de aceite
- [ ] Causa identificada e registrada no card.

## Notas de implementação
