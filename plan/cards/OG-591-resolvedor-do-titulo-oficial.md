# OG-591 — Resolvedor central do título oficial nas APIs

| Campo | Valor |
|---|---|
| Épico | E17 |
| Tipo | Feature |
| Prioridade | Must |
| Estimativa | 3 pts |
| Sprint | — |
| Status | Pronto |
| Dependências | OG-555 |
| Regras de negócio | RN-MRV-16 |
| Skills | `outgun-card-workflow` |

> Origem: proposta de Nosferatu, 2026-11-06, com as respostas P1..P10 — página em `plan/specs/nomes-de-mapas/proposta.html`. Decisão D-96.

## História
Como jogador, quero ver sempre o nome atual do mapa, para que a mesma arena não apareça com grafias diferentes.

## Contexto
- Hoje cada rota decide: `players.ts:454` usa `details.mapTitle` ou `matches.map`; `cup.ts:152` devolve só `matches.map`; `style-radar.ts:250` usa `max(mapTitle)`.
- Produção em 2026-11-06: 104 partidas têm título antigo gravado (`2 versus 2 (Duel)` 53, `3x3 (Duel)` 42, `Pari2` 9). Todas as 332 têm `map_id` e revisão. O `Pari2` no perfil não é erro de dados: as 9 partidas são da revisão 1 e anteriores à importação.

## Escopo
- Consulta central que devolve, separados, `mapId`/`key`, `title` (revisão ativa) e, quando couber, `revisionNumber`.
- Perfil, relatório, série, OutCup, radar, resumos e rota de catálogo público passam a usá-la.
- Mapa sem catálogo (`mapgen_*`) continua com o título gravado.
- `matches.map`, `details.mapTitle` e os TXT não mudam (RN-MRV-16).

## Critérios de aceite
- [ ] As 9 partidas de `pari2` respondem `Pari 2` com revisão 1; as de `3x3 (duel)`, `3x3`.
- [ ] Nenhuma linha de `matches` é alterada.
- [ ] Radar agrupa pelo `map_id` e rotula com o título atual.

## Notas de implementação
