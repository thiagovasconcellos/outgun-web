# OG-561 — Backup, ensaio da migração e implantação recuperável dos mapas

| Campo | Valor |
|---|---|
| Épico | E17 |
| Tipo | Infra |
| Prioridade | Must |
| Estimativa | 3 pts |
| Sprint | S60 |
| Status | Concluído |
| Dependências | OG-552, OG-553, OG-554, OG-555, OG-559 |
| Regras de negócio | RN-MRV-09 |
| Skills | `outgun-card-workflow` |

> Origem: proposta de Nosferatu (arquiteto de mapas da comunidade), 2026-11-02 — cópia em `plan/specs/mapas-revisoes/`. Decisão D-91.

## História
Como PO, quero subir a mudança de mapas com backup testado e caminho de volta, porque ela mexe em partidas, replays e estatísticas.

## Escopo
- Backup verificável antes: banco (pg_dump + restauração testada numa cópia), replays (`matches.replay_url`), rotações e `panel_maps`.
- Ensaio completo numa cópia do banco de produção: migrações, semente (OG-552), preenchimento (OG-555), importação (OG-559) e conciliação (OG-560) em `--dry-run` e depois de verdade; contagens antes/depois.
- Roteiro de rollback (aplicação e banco) registrado no card.
- Checklist com os 10 testes de aceitação da proposta de Nosferatu (seção 6), marcando o que foi coberto por teste automático e o que o PO confere no beta.
- Deploy no `br` e no satélite.

## Critérios de aceite
- [x] Restauração do backup testada antes do deploy.
- [x] Contagens de partidas, participações, ratings e marcos iguais antes/depois.
- [x] Os 10 testes de aceitação da proposta com resultado registrado.

## Notas de implementação
**Roteiro (no servidor `br`, `/opt/outgun`; os dumps não saem de lá):**
1. Backup: `docker compose exec -T backup sh /usr/local/bin/backup.sh`; anotar o arquivo em `backups/` e as contagens (`matches`, `match_players`, `player_ratings`/`skill`, `player_milestones`, `map_rotations`, `panel_maps`, replays com `replay_url`).
2. Restauração testada: banco `outgun_rehearsal` no mesmo Postgres, `restore.sh` nele, contagens iguais às de produção.
3. Ensaio com a imagem nova da API (enviada antes do deploy): `migrate up` (0055–0057 + semente + preenchimento) e `map-import --dry-run` / de verdade no `outgun_rehearsal`; contagens antes/depois iguais (só as colunas novas mudam).
4. Deploy (`deploy.sh`): o serviço `migrate` aplica 0055–0057 e a semente; depois `docker compose run --rm migrate node dist/cli.js map-import map-imports/nosferatu-2026-11 --dry-run` e sem `--dry-run`. Satélite `es` com `deploy-satellite.sh` (só game server).
**Ensaio (2026-11-04, `deploy/vps/map-rehearsal.sh`):** backup `outgun-20261104T195101Z.dump` restaurado em `outgun_rehearsal` com as contagens idênticas à produção (313 partidas, 2.396 participações, 475 marcos, 128 ratings, 313 replays, placar total 3.246, 149.891 frags); migrações 55–57 + semente (23 mapas, 23 revisões, 313 partidas ligadas, 6 inferidas); importação: 14 revisões, 9 novos, 6 intocados, `Mooca` absorvida; segunda execução sem nada novo; contagens iguais depois; 31 mapas, 46 revisões, Casual 22 → 31. Testes da proposta (seção 6): 1, 4, 5, 7, 8 e 10 cobertos por teste automático/ensaio; 2, 3, 6 e 9 o PO confere no beta.
5. Rollback: aplicação = `TAG` anterior no `.env` + `docker compose up -d` (o código antigo ignora as tabelas novas; `matches` só ganhou colunas nulas); banco = `restore.sh` do dump do passo 1 (perde o que entrou depois) ou `migrate down 3` (tira 0057–0055).
