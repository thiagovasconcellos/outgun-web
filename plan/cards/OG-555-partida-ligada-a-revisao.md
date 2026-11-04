# OG-555 — Partida ligada à revisão: relatório e miniatura históricos

| Campo | Valor |
|---|---|
| Épico | E17 |
| Tipo | Feature |
| Prioridade | Must |
| Estimativa | 3 pts |
| Sprint | S60 |
| Status | Concluído |
| Dependências | OG-552, OG-553 |
| Regras de negócio | RN-MRV-05 |
| Skills | `outgun-card-workflow` |

> Origem: proposta de Nosferatu (arquiteto de mapas da comunidade), 2026-11-02 — cópia em `plan/specs/mapas-revisoes/`. Decisão D-91.

## História
Como jogador, quero que o relatório de uma partida antiga mostre a miniatura do mapa como ele era naquela partida.

## Contexto
- `MapPreview.tsx` busca a geometria **atual** pelo nome (assets ou `GET /maps/:name` da API); `matches` não guarda revisão.

## Escopo
- Migração nova: `matches.map_id` e `matches.map_revision_id` (nulos permitidos); o game server envia a revisão no relatório da partida.
- Preenchimento das partidas antigas: nativo → revisão 1 (comprovada); mapa da moderação → revisão vigente no `started_at` (marcada como `inferida`); gerado (`mapgen_*`) fica sem revisão. Idempotente, não toca em placar, rating nem estatística.
- Relatório, histórico e páginas de partida desenham a miniatura pela revisão da partida; sem revisão, mostram a atual com a nota "mapa atual".

## Critérios de aceite
- [x] Relatório de partida de Larhi anterior à revisão mostra os círculos; depois, os cantos retos.
- [x] Contagem de partidas, placares e ratings idênticos antes e depois do preenchimento (comparação numa cópia do banco).

## Notas de implementação
- Migração 0056 (`matches.map_id`, `map_revision_id`, `map_revision_inferred`). O game server manda `mapRevision` no relatório; a API liga pela chave (`matchMapRefs`).
- Preenchimento em `backfillMatchRevisions`, rodado com a semente (depois dela, porque o catálogo é semeado em TS): só partidas terminadas antes da 0056, nativo → rev 1, moderação → vigente no início (inferida), gerado fica nulo. Não toca em placar/rating/estatística (só as 3 colunas novas).
- `GET /matches/:id` ganhou `mapRevision`; `MapPreview` aceita `revision` e passou a buscar a revisão ativa na API (assets de reserva), o que também corrige a prévia de nativos revisados no lobby. Sem revisão: nota "Mapa atual".
- Comparação de contagens numa cópia do banco fica no ensaio do OG-561.
