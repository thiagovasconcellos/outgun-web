# OG-556 — Estatísticas, filtros e marcos pela identidade do mapa

| Campo | Valor |
|---|---|
| Épico | E17 |
| Tipo | Feature |
| Prioridade | Should |
| Estimativa | 3 pts |
| Sprint | S60 |
| Status | Concluído |
| Dependências | OG-555 |
| Regras de negócio | RN-MRV-06 |
| Skills | `outgun-card-workflow` |

> Origem: proposta de Nosferatu (arquiteto de mapas da comunidade), 2026-11-02 — cópia em `plan/specs/mapas-revisoes/`. Decisão D-91.

## História
Como jogador, quero ver "Larhi" uma vez só nos filtros e nas contagens, juntando o original e as revisões, e poder olhar uma revisão em separado quando quiser.

## Contexto
- Radar por mapa (`apps/api/src/style-radar.ts`, `m.map = ...`), marcos "Turista"/"Explorador" (`packages/content/src/milestones.ts`, `mapKey`) e listas de mapa agrupam pelo nome do arquivo.

## Escopo
- Filtros e agrupamentos por `matches.map_id` (família); filtro opcional por revisão onde já há filtro de mapa.
- Marcos de mapas distintos contam a família; marcos já ganhos **nunca** são retirados; reprocessar não dá marco em dobro.
- Revisões com bases trocadas (ver D-91) não somam lado vermelho/azul entre si quando a estatística for por lado.
- Nada de recalcular rating/OpenSkill.

## Critérios de aceite
- [x] Filtro "Larhi" junta original e revisão; filtro de revisão separa.
- [x] Antes/depois numa cópia do banco: partidas, participações, frags, capturas, ratings e leaderboards iguais.

## Notas de implementação
- A chave do mapa não muda entre revisões, então `matches.map` já juntava as revisões; o que muda são os nomes antigos (alias, ex. `Mooca` → `mooca`). `mapFilterSql` (família por `map_id`, alias e o nome nas partidas sem catálogo) e `MATCH_MAP_KEY` em `map-catalog.ts`.
- Radar: filtro por família + `mapRevision` opcional; seletor "Revisão" só aparece quando o jogador jogou mais de uma revisão do mapa. Marcos de mapas distintos contam pela chave da família (P6); nada é retirado nem recalculado (rating intocado).
- Não há estatística por lado e por mapa hoje, então não há o que separar nas bases trocadas.
- Comunidade (2026-11-02): P5 = por mapa (revisões juntas) com filtro opcional por revisão; P6 = Larhi original e revisado contam como um mapa só nos marcos.
