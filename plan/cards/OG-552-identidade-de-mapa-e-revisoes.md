# OG-552 — Identidade de mapa e revisões imutáveis

| Campo | Valor |
|---|---|
| Épico | E17 |
| Tipo | Feature |
| Prioridade | Must |
| Estimativa | 5 pts |
| Sprint | S60 |
| Status | Em revisão |
| Dependências | — |
| Regras de negócio | RN-MRV-01, RN-MRV-02, RN-MRV-03 |
| Skills | `outgun-card-workflow` |

> Origem: proposta de Nosferatu (arquiteto de mapas da comunidade), 2026-11-02 — cópia em `plan/specs/mapas-revisoes/`. Decisão D-91.

## História
Como moderador, quero que cada mapa tenha uma identidade estável e uma lista de revisões que nunca se apagam, para ajustar um mapa sem criar "outro mapa" e sem perder o que foi jogado antes.

## Contexto
- Hoje há duas trilhas: os 20 nativos (`_legacy/maps/`, servidos pelo manifesto de assets) e os da moderação (`panel_maps` com `name` como chave, case-sensitive; histórico em `panel_map_versions`, migração 0033). A partida guarda só o nome do arquivo (`matches.map`).
- Achado: os 20 nativos **nunca mudaram** desde a importação do código (commit `34ff905`, 2026-10-12; só o `git mv` para `_legacy/` em 2026-10-14). O arquivo atual é a geometria de toda partida nativa já jogada.

## Escopo
- Migração nova (nunca editar as antigas): tabela `maps` (id interno, chave legada = nome usado nas rotações/partidas, origem `native|panel|import`, revisão ativa, `playable` para novas partidas, criado em/por) e `map_revisions` (id, mapa, número, bytes Latin-1 exatos, SHA-256, CRC do jogo, título, autor, largura/altura, publicado por, data, procedência, nota opcional, revisão-base). Revisão é imutável: sem UPDATE de conteúdo, sem DELETE.
- `map_aliases`: nomes legados → mapa (case-insensitive na busca, sem fundir nada sozinho).
- Semente: cada nativo vira mapa com revisão 1 = bytes de `_legacy/maps/` (procedência `native-1.0.3`); cada `panel_maps`/`panel_map_versions` vira mapa com suas revisões (procedência `panel`, mesmo publicador e data). Idempotente (rodar duas vezes não duplica).
- `panel_maps` e `panel_map_versions` ficam só leitura até a S61 (remoção em migração posterior, card novo se o PO quiser).
- API interna: catálogo de mapas jogáveis (chave, revisão ativa, CRC, SHA-256) e `GET /maps/:key/rev/:n.txt` imutável (cache longo).

## Critérios de aceite
- [x] Os 20 nativos e todos os mapas da moderação existem como mapa + revisões; os bytes da revisão 1 dos nativos batem com `_legacy/maps/` (SHA-256).
- [x] Rodar a semente duas vezes não cria mapa nem revisão a mais.
- [x] Não há caminho na API que altere ou apague uma revisão.

## Notas de implementação
- Migração 0055 (`maps`, `map_revisions`, `map_aliases`); gatilho no banco recusa DELETE e mudança de conteúdo (só `map_id`/`number` podem mudar, para a conciliação do OG-560). Catálogo em `apps/api/src/map-catalog.ts`.
- Semente idempotente (`seedMaps`) no `cli migrate up` e no boot da API; a imagem da API ganhou `_legacy/maps` (`MAPS_DIR=/app/maps`). Nativo = revisão 1 com data 2011-03-12, procedência `native-1.0.3`.
- `GET /maps/:name` passa a servir a revisão ativa de qualquer mapa jogável (chave ou alias; servidores antigos seguem funcionando); `GET /maps/:name/rev/N.txt` é imutável e público (o cliente precisa dele para jogar/assistir, RN-MRV-11); o heartbeat leva `rev`, `sha256` e `origin`.
